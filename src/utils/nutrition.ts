import type { FoodItem, LoggedAmount, MealEntry, MealIngredient } from '../types';
import { formatFoodName } from './foodNames';
import { WEIGHT_MEASURE, basisOf, isServingBased, pluralizeUnit, type NutritionBasis } from './measure';
import type { Amount } from './portion';
import { roundTo } from './units';

export type NewMealEntry = Omit<MealEntry, 'id' | 'timestamp'>;

export interface NutritionTotals {
  grams: number;
  calories: number;
  proteinG: number;
  fiberG: number;
}

/** Calories for a weight, rounded to 1 kcal. */
export function caloriesForGrams(caloriesPer100g: number, grams: number): number {
  return Math.round((caloriesPer100g * grams) / 100);
}

/** Protein for a weight, rounded to 0.1 g. */
export function proteinForGrams(proteinPer100g: number, grams: number): number {
  return roundTo((proteinPer100g * grams) / 100, 1);
}

export function fiberForGrams(fiberPer100g: number | undefined, grams: number): number | undefined {
  return fiberPer100g === undefined ? undefined : roundTo((fiberPer100g * grams) / 100, 1);
}

/** A computed amount of food, ready to store on an entry or ingredient. */
export interface Portion extends Required<Pick<LoggedAmount, 'quantity' | 'unit'>> {
  unitPlural?: string;
  grams: number;
  calories: number;
  proteinG: number;
  fiberG?: number;
}

/**
 * Nutrition for an amount. Weight foods: per100g * grams / 100. Serving foods:
 * perServing * servings, where grams are converted with the serving weight.
 * Returns null when the amount cannot apply (grams for a serving without a known weight).
 */
export function computePortion(basis: NutritionBasis, amount: Amount): Portion | null {
  const { measure } = basis;
  if (measure.kind === 'weight') {
    if (amount.unit !== 'g') return null;
    const grams = amount.quantity;
    return {
      quantity: grams,
      unit: 'g',
      grams,
      calories: caloriesForGrams(basis.calories, grams),
      proteinG: proteinForGrams(basis.protein, grams),
      fiberG: fiberForGrams(basis.fiber, grams),
    };
  }
  const weight = measure.servingWeightG;
  if (amount.unit === 'g' && weight === undefined) return null;
  const servings = amount.unit === 'g' ? amount.quantity / (weight as number) : amount.quantity;
  const grams = amount.unit === 'g' ? amount.quantity : weight !== undefined ? Math.round(servings * weight) : 0;
  return {
    quantity: roundTo(servings, 2),
    unit: measure.unitName,
    unitPlural: measure.unitNamePlural,
    grams,
    calories: Math.round(basis.calories * servings),
    proteinG: roundTo(basis.protein * servings, 1),
    fiberG: basis.fiber === undefined ? undefined : roundTo(basis.fiber * servings, 1),
  };
}

/** Per-unit values recovered from a logged amount, so edits rescale the frozen numbers. */
export function basisFromLogged(
  item: LoggedAmount & { calories: number; proteinG: number; fiberG?: number },
): NutritionBasis | null {
  const { quantity, unit, grams } = item;
  if (unit && unit !== 'g' && quantity !== undefined && quantity > 0) {
    return {
      measure: {
        kind: 'serving',
        unitName: unit,
        unitNamePlural: item.unitPlural ?? pluralizeUnit(unit),
        ...(grams > 0 ? { servingWeightG: grams / quantity } : {}),
      },
      calories: item.calories / quantity,
      protein: item.proteinG / quantity,
      fiber: item.fiberG === undefined ? undefined : item.fiberG / quantity,
    };
  }
  if (grams > 0) {
    return {
      measure: WEIGHT_MEASURE,
      calories: (item.calories / grams) * 100,
      protein: (item.proteinG / grams) * 100,
      fiber: item.fiberG === undefined ? undefined : (item.fiberG / grams) * 100,
    };
  }
  return null;
}

/** Ingredient breakdown of a saved meal, scaled by `factor`. Undefined when an ingredient is no longer usable. */
function scaleCompositeIngredients(food: FoodItem, factor: number, foods: FoodItem[]): MealIngredient[] | undefined {
  if (!food.isComposite || !food.ingredients || food.ingredients.length === 0) return undefined;
  const foodsById = new Map(foods.map((item) => [item.id, item]));
  const result: MealIngredient[] = [];
  for (const ingredient of food.ingredients) {
    const source = ingredient.foodId ? foodsById.get(ingredient.foodId) : undefined;
    if (!source) return undefined;
    const servingAmount = ingredient.unit !== undefined && ingredient.unit !== 'g';
    let amount: Amount;
    if (servingAmount && isServingBased(source)) {
      amount = { quantity: (ingredient.quantity ?? 1) * factor, unit: 'serving' };
    } else if (ingredient.grams > 0) {
      amount = { quantity: Math.round(ingredient.grams * factor), unit: 'g' };
    } else {
      return undefined;
    }
    const portion = computePortion(basisOf(source), amount);
    if (!portion) return undefined;
    result.push({
      foodId: source.id,
      name: ingredient.name,
      grams: portion.grams,
      quantity: portion.quantity,
      unit: portion.unit,
      unitPlural: portion.unitPlural,
      calories: portion.calories,
      proteinG: portion.proteinG,
    });
  }
  return result;
}

/** Factor that scales a saved meal's ingredients to the logged portion. */
function compositeFactor(food: FoodItem, portion: Portion): number | null {
  if (isServingBased(food)) return portion.quantity;
  const totalGrams = (food.ingredients ?? []).reduce((sum, ingredient) => sum + ingredient.grams, 0);
  return totalGrams > 0 ? portion.grams / totalGrams : null;
}

/** Log entry for an amount of a library food, or null when the amount does not fit the food's measure. */
export function buildEntryFromFood(food: FoodItem, amount: Amount, foods: FoodItem[] = []): NewMealEntry | null {
  const portion = computePortion(basisOf(food), amount);
  if (!portion) return null;
  const factor = food.isComposite ? compositeFactor(food, portion) : null;
  return {
    foodId: food.id,
    name: formatFoodName(food),
    grams: portion.grams,
    quantity: portion.quantity,
    unit: portion.unit,
    unitPlural: portion.unitPlural,
    calories: portion.calories,
    proteinG: portion.proteinG,
    fiberG: portion.fiberG,
    ingredients: factor === null ? undefined : scaleCompositeIngredients(food, factor, foods),
  };
}

export function sumEntries(entries: MealEntry[]): NutritionTotals {
  const totals = entries.reduce(
    (acc, entry) => ({
      grams: acc.grams + entry.grams,
      calories: acc.calories + entry.calories,
      proteinG: acc.proteinG + entry.proteinG,
      fiberG: acc.fiberG + (entry.fiberG ?? 0),
    }),
    { grams: 0, calories: 0, proteinG: 0, fiberG: 0 },
  );
  return {
    grams: Math.round(totals.grams),
    calories: Math.round(totals.calories),
    proteinG: roundTo(totals.proteinG, 1),
    fiberG: roundTo(totals.fiberG, 1),
  };
}

/** Case-insensitive search on the display name (including state), sorted by display name. */
export function filterFoods(foods: FoodItem[], query: string): FoodItem[] {
  const needle = query.trim().toLowerCase();
  return foods
    .map((food) => ({ food, label: formatFoodName(food) }))
    .filter(({ label }) => needle === '' || label.toLowerCase().includes(needle))
    .sort((a, b) => a.label.localeCompare(b.label))
    .map(({ food }) => food);
}
