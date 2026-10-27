import type { FoodItem, Goal, ServingMeasure, WeightFoodItem } from '../types';
import { formatFoodName, normalizeFoodName } from './foodNames';
import { basisOf, isServingBased, servingStep } from './measure';
import { computePortion, type Portion } from './nutrition';
import { roundTo } from './units';

export const GRAM_STEP = 10;
export const MIN_GRAMS = 10;
export const DEFAULT_TOLERANCE = 0.1;
export const DEFAULT_COUNT = 9;
export const MIN_FOODS_PER_MEAL = 2;
export const MAX_FOODS_PER_MEAL = 4;
/** Bulking suggestions must cover at least this share of the remaining protein target. */
export const BULK_PROTEIN_SHARE = 0.25;
/** A food counts as a protein source when at least this share of its calories comes from protein. */
export const PROTEIN_SOURCE_SHARE = 0.4;
/** How many foods of each group enter the search. */
export const POOL_SIZES = { protein: 6, produce: 3, starch: 6, fat: 2 } as const;
/** Sides below this many kcal per 100 g count as produce (vegetables, fruit). */
export const PRODUCE_MAX_KCAL = 70;
/** Sides at or above this many kcal per 100 g count as fats (oils, nuts, nut butters). */
export const FAT_MIN_KCAL = 450;
/** A meal holds at most this many protein sources. */
export const MAX_PROTEIN_SOURCES = 2;
/** Sides must provide at least this share of a meal's calories, so they are real portions. */
export const MIN_SIDE_CALORIE_SHARE = 0.2;
/** No single food may supply more than this share of the budget, so meals stay balanced. */
export const MAX_FOOD_CALORIE_SHARE = 0.5;
/** No food appears in more than this many suggestions. */
export const MAX_REPEATS_PER_FOOD = 2;
/**
 * Gram amounts tried for every weight food except the last (all multiples of 10 g).
 * The last food is solved to the nearest step, which keeps the search fast.
 */
export const SEARCH_GRAM_LEVELS = [10, 20, 30, 50, 80, 100, 120, 150, 200, 250, 300, 400];

export interface SuggestionItem extends Portion {
  foodId: string;
  name: string;
}

export interface MealSuggestion {
  id: string;
  items: SuggestionItem[];
  totalCalories: number;
  totalProteinG: number;
}

export interface SuggestMealsOptions {
  foods: FoodItem[];
  budget: number;
  goal: Goal;
  remainingProteinG: number;
  count?: number;
  tolerance?: number;
}

/** Portion range of one food: grams for weight foods, servings for serving foods. */
export interface PortionLimits {
  unit: 'g' | 'serving';
  step: number;
  min: number;
  max: number;
}

interface SearchFood {
  food: FoodItem;
  limits: PortionLimits;
  levels: number[];
  kcalPerUnit: number;
  proteinPerUnit: number;
  isSide: boolean;
}

interface Candidate {
  foods: SearchFood[];
  amounts: number[];
  calories: number;
  protein: number;
}

type Comparator = (a: Candidate, b: Candidate) => number;

interface SearchContext {
  budget: number;
  low: number;
  high: number;
  minProtein: number;
  compare: Comparator;
}

function proteinPerCalorie(protein: number, calories: number): number {
  return calories > 0 ? protein / calories : 0;
}

/** Share of a food's calories that comes from protein (4 kcal per gram). Same on any basis. */
export function proteinCalorieShare(food: FoodItem): number {
  const basis = basisOf(food);
  return basis.calories > 0 ? (basis.protein * 4) / basis.calories : 0;
}

export function isProteinSource(food: FoodItem): boolean {
  return proteinCalorieShare(food) >= PROTEIN_SOURCE_SHARE;
}

/** Calories per 100 g, or null for a serving food without a known weight. */
export function densityPer100g(food: FoodItem): number | null {
  const basis = basisOf(food);
  if (basis.measure.kind === 'weight') return basis.calories;
  const weight = basis.measure.servingWeightG;
  return weight ? (basis.calories / weight) * 100 : null;
}

/** Realistic upper portion (grams) for one weight food in a single meal. */
export function maxGramsForFood(food: WeightFoodItem): number {
  if (food.proteinPer100g >= 60) return 60; // protein powders
  if (food.caloriesPer100g >= 700) return 30; // oils and pure fats
  if (food.caloriesPer100g >= 450) return 60; // nuts and nut butters
  if (food.caloriesPer100g >= 250) return 150; // dry grains, bread, dried fruit
  if (food.caloriesPer100g >= 150) return 250; // avocado, cooked pasta
  if (food.caloriesPer100g < PRODUCE_MAX_KCAL) return 300; // vegetables and fruit
  return 400;
}

/** Smallest portion (grams) worth suggesting, so meals do not include token 10 g amounts. */
export function minGramsForFood(food: WeightFoodItem): number {
  if (food.caloriesPer100g >= 700) return MIN_GRAMS; // oils and pure fats
  if (food.proteinPer100g >= 60 || food.caloriesPer100g >= 450) return 20; // powders, nuts
  return 50;
}

/** Most servings of one food in a single meal. */
function maxServings(measure: ServingMeasure): number {
  const unit = measure.unitName.toLowerCase();
  if (unit === 'piece' || unit === 'slice') return 4;
  return 2;
}

export function portionLimits(food: FoodItem): PortionLimits {
  if (isServingBased(food)) {
    const step = servingStep(food.measure);
    return { unit: 'serving', step, min: step, max: maxServings(food.measure) };
  }
  return { unit: 'g', step: GRAM_STEP, min: minGramsForFood(food), max: maxGramsForFood(food) };
}

function searchLevels(limits: PortionLimits): number[] {
  if (limits.unit === 'g') return SEARCH_GRAM_LEVELS.filter((level) => level >= limits.min && level <= limits.max);
  const levels: number[] = [];
  for (let amount = limits.min; amount <= limits.max + 1e-9; amount += limits.step) levels.push(roundTo(amount, 2));
  return levels;
}

function toSearchFood(food: FoodItem, isSide: boolean): SearchFood {
  const basis = basisOf(food);
  const limits = portionLimits(food);
  const perUnit = limits.unit === 'g' ? 1 / 100 : 1;
  return {
    food,
    limits,
    levels: searchLevels(limits),
    kcalPerUnit: basis.calories * perUnit,
    proteinPerUnit: basis.protein * perUnit,
    isSide,
  };
}

/** Minimum protein (g) a bulking suggestion must contain. */
export function bulkingProteinFloor(remainingProteinG: number): number {
  return Math.max(0, remainingProteinG) * BULK_PROTEIN_SHARE;
}

const STATE_PREFERENCE = { cooked: 0, 'n/a': 1, raw: 2 } as const;

/** Keeps one version per food name so a meal never pairs the raw and cooked form of the same food. */
function oneVersionPerFood(foods: FoodItem[]): FoodItem[] {
  const byName = new Map<string, FoodItem>();
  for (const food of foods) {
    const key = normalizeFoodName(food.name);
    const current = byName.get(key);
    if (!current || STATE_PREFERENCE[food.state] < STATE_PREFERENCE[current.state]) byName.set(key, food);
  }
  return [...byName.values()];
}

function fiberPerCalorie(food: FoodItem): number {
  const basis = basisOf(food);
  return (basis.fiber ?? 0) / basis.calories;
}

/**
 * Builds the search pool: the most protein-dense protein sources plus sides from
 * three groups (produce, starches, fats), so meals look like real plates and both
 * small and large budgets can be met. Cutting prefers high-fiber starches,
 * bulking prefers energy-dense ones. Foods flagged for review are skipped.
 */
export function selectFoodPool(foods: FoodItem[], goal: Goal): { proteins: FoodItem[]; sides: FoodItem[] } {
  const usable = oneVersionPerFood(foods.filter((food) => basisOf(food).calories > 0 && !food.needsReview));
  const proteins = usable
    .filter(isProteinSource)
    .sort((a, b) => proteinCalorieShare(b) - proteinCalorieShare(a))
    .slice(0, POOL_SIZES.protein);

  const sides = usable.filter((food) => !isProteinSource(food));
  const density = (food: FoodItem) => densityPer100g(food);
  const produce = sides
    .filter((food) => {
      const value = density(food);
      return value !== null && value < PRODUCE_MAX_KCAL;
    })
    .sort((a, b) => fiberPerCalorie(b) - fiberPerCalorie(a))
    .slice(0, POOL_SIZES.produce);
  const fats = sides
    .filter((food) => {
      const value = density(food);
      return value !== null && value >= FAT_MIN_KCAL;
    })
    .sort((a, b) => proteinCalorieShare(b) - proteinCalorieShare(a))
    .slice(0, POOL_SIZES.fat);
  const grouped = new Set([...produce, ...fats]);
  const starches = sides
    .filter((food) => {
      const value = density(food);
      return !grouped.has(food) && (value === null || (value >= PRODUCE_MAX_KCAL && value < FAT_MIN_KCAL));
    })
    .sort((a, b) =>
      goal === 'cutting'
        ? fiberPerCalorie(b) - fiberPerCalorie(a)
        : (density(b) ?? basisOf(b).calories) - (density(a) ?? basisOf(a).calories),
    )
    .slice(0, POOL_SIZES.starch);

  return { proteins, sides: [...produce, ...starches, ...fats] };
}

function combinations(size: number, k: number): number[][] {
  const result: number[][] = [];
  const current: number[] = [];
  const visit = (start: number): void => {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i <= size - (k - current.length); i++) {
      current.push(i);
      visit(i + 1);
      current.pop();
    }
  };
  visit(0);
  return result;
}

function createComparator(goal: Goal, budget: number): Comparator {
  if (goal === 'cutting') {
    return (a, b) => {
      const densityDiff =
        proteinPerCalorie(b.protein, b.calories) - proteinPerCalorie(a.protein, a.calories);
      if (Math.abs(densityDiff) > 1e-9) return densityDiff;
      return Math.abs(a.calories - budget) - Math.abs(b.calories - budget);
    };
  }
  return (a, b) => {
    const distanceDiff = Math.abs(a.calories - budget) - Math.abs(b.calories - budget);
    if (Math.abs(distanceDiff) > 1e-9) return distanceDiff;
    return b.protein - a.protein;
  };
}

/**
 * Finds the best split for one set of foods. Amounts for all but the last food
 * come from each food's levels (grams or servings); the last food's amount is solved
 * to its step so the total lands near budget. Every portion stays within its limits.
 */
function bestForCombination(foods: SearchFood[], ctx: SearchContext): Candidate | null {
  const amounts = new Array<number>(foods.length).fill(0);
  const result: { best: Candidate | null } = { best: null };
  const lastIndex = foods.length - 1;

  const sideCalories = (values: number[]): number =>
    foods.reduce((sum, item, index) => (item.isSide ? sum + values[index] * item.kcalPerUnit : sum), 0);

  const visit = (position: number, calories: number, protein: number): void => {
    const item = foods[position];
    const { step, min, max } = item.limits;
    if (position === lastIndex) {
      const raw = (ctx.budget - calories) / item.kcalPerUnit;
      const options = new Set([Math.floor(raw / step) * step, Math.ceil(raw / step) * step]);
      for (const option of options) {
        const amount = roundTo(Math.min(max, Math.max(min, option)), 2);
        if (amount * item.kcalPerUnit > ctx.budget * MAX_FOOD_CALORIE_SHARE) continue;
        const totalCalories = calories + amount * item.kcalPerUnit;
        if (totalCalories < ctx.low || totalCalories > ctx.high) continue;
        const totalProtein = protein + amount * item.proteinPerUnit;
        if (totalProtein < ctx.minProtein) continue;
        amounts[position] = amount;
        if (sideCalories(amounts) < totalCalories * MIN_SIDE_CALORIE_SHARE) continue;
        const candidate: Candidate = { foods, amounts: [...amounts], calories: totalCalories, protein: totalProtein };
        if (result.best === null || ctx.compare(candidate, result.best) < 0) {
          result.best = candidate;
        }
      }
      return;
    }
    for (const amount of item.levels) {
      if (amount * item.kcalPerUnit > ctx.budget * MAX_FOOD_CALORIE_SHARE) break;
      const nextCalories = calories + amount * item.kcalPerUnit;
      if (nextCalories >= ctx.high) break;
      amounts[position] = amount;
      visit(position + 1, nextCalories, protein + amount * item.proteinPerUnit);
    }
  };

  visit(0, 0, 0);
  return result.best;
}

function sharedFoodCount(a: Candidate, b: Candidate): number {
  const ids = new Set(a.foods.map((item) => item.food.id));
  return b.foods.filter((item) => ids.has(item.food.id)).length;
}

function isSubsetEither(a: Candidate, b: Candidate): boolean {
  return sharedFoodCount(a, b) === Math.min(a.foods.length, b.foods.length);
}

/**
 * Picks top candidates while keeping suggestions different from each other:
 * first with no food in common, then sharing at most one food, then anything
 * that is not a subset of an earlier pick. No food is used in more than
 * MAX_REPEATS_PER_FOOD suggestions.
 */
function pickDiverse(sorted: Candidate[], count: number): Candidate[] {
  const picked: Candidate[] = [];
  const uses = new Map<string, number>();
  const withinRepeatLimit = (candidate: Candidate) =>
    candidate.foods.every((item) => (uses.get(item.food.id) ?? 0) < MAX_REPEATS_PER_FOOD);
  const passes: ((candidate: Candidate) => boolean)[] = [
    (candidate) => picked.every((existing) => sharedFoodCount(existing, candidate) === 0),
    (candidate) => picked.every((existing) => sharedFoodCount(existing, candidate) <= 1),
    (candidate) => picked.every((existing) => !isSubsetEither(existing, candidate)),
  ];
  for (const accept of passes) {
    for (const candidate of sorted) {
      if (picked.length >= count) return picked;
      if (picked.includes(candidate) || !withinRepeatLimit(candidate) || !accept(candidate)) continue;
      picked.push(candidate);
      for (const item of candidate.foods) uses.set(item.food.id, (uses.get(item.food.id) ?? 0) + 1);
    }
  }
  return picked;
}

function toSuggestion(candidate: Candidate): MealSuggestion {
  const items: SuggestionItem[] = candidate.foods.map((item, index) => {
    const portion = computePortion(basisOf(item.food), {
      quantity: candidate.amounts[index],
      unit: item.limits.unit,
    }) as Portion;
    return { ...portion, foodId: item.food.id, name: formatFoodName(item.food) };
  });
  return {
    id: items.map((item) => `${item.foodId}:${item.quantity}`).join('|'),
    items,
    totalCalories: items.reduce((sum, item) => sum + item.calories, 0),
    totalProteinG: roundTo(
      items.reduce((sum, item) => sum + item.proteinG, 0),
      1,
    ),
  };
}

/**
 * Builds meal suggestions of 2-4 foods whose total calories land within the
 * tolerance of the budget. Weight foods use 10 g steps; scoops use half servings;
 * tubs, pieces, bars and cans use whole servings. Every meal has at least one
 * protein source and one side, and suggestions avoid repeating foods.
 * Cutting ranks by protein per calorie. Bulking ranks by closeness to budget
 * and requires at least 25% of the remaining protein target.
 */
export function suggestMeals(options: SuggestMealsOptions): MealSuggestion[] {
  const { foods, budget, goal, remainingProteinG, count = DEFAULT_COUNT, tolerance = DEFAULT_TOLERANCE } = options;

  if (!Number.isFinite(budget) || budget <= 0) return [];
  const { proteins, sides } = selectFoodPool(foods, goal);
  if (proteins.length === 0 || sides.length === 0) return [];
  const pool = [...proteins.map((food) => toSearchFood(food, false)), ...sides.map((food) => toSearchFood(food, true))];
  const proteinCount = proteins.length;

  const ctx: SearchContext = {
    budget,
    low: budget * (1 - tolerance),
    high: budget * (1 + tolerance),
    minProtein: goal === 'bulking' ? bulkingProteinFloor(remainingProteinG) : 0,
    compare: createComparator(goal, budget),
  };

  const candidates: Candidate[] = [];
  const largest = Math.min(MAX_FOODS_PER_MEAL, pool.length);
  for (let size = MIN_FOODS_PER_MEAL; size <= largest; size++) {
    for (const combo of combinations(pool.length, size)) {
      // Pool order is proteins first, so a valid meal starts with a protein and ends with a side.
      if (combo[0] >= proteinCount || combo[combo.length - 1] < proteinCount) continue;
      if (combo.filter((index) => index < proteinCount).length > MAX_PROTEIN_SOURCES) continue;
      const best = bestForCombination(
        combo.map((index) => pool[index]),
        ctx,
      );
      if (best) candidates.push(best);
    }
  }

  candidates.sort(ctx.compare);
  return pickDiverse(candidates, count).map(toSuggestion);
}
