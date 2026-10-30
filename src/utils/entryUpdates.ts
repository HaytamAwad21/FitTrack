import type { DailyLog, FoodItem, FoodNutrition, LoggedAmount, MealEntry, MealIngredient } from '../types';
import { basisOf, measureOf } from './measure';
import { computePortion } from './nutrition';
import type { Amount } from './portion';
import { roundTo } from './units';

/** True when an entry is the food itself or a meal that contains it. */
export function entryUsesFood(entry: MealEntry, foodId: string): boolean {
  return entry.foodId === foodId || (entry.ingredients ?? []).some((ingredient) => ingredient.foodId === foodId);
}

/** Number of logged entries that use a food: on one date, and on all dates. */
export function countFoodEntries(
  logs: Record<string, DailyLog>,
  foodId: string,
  date: string,
): { date: number; all: number } {
  const count = (log: DailyLog | undefined) => (log?.entries ?? []).filter((entry) => entryUsesFood(entry, foodId)).length;
  return { date: count(logs[date]), all: Object.values(logs).reduce((sum, log) => sum + count(log), 0) };
}

/** True when an edit changes the values logged entries are calculated from. */
export function nutritionChanged(before: FoodNutrition, after: FoodNutrition): boolean {
  return JSON.stringify(basisOf(before)) !== JSON.stringify(basisOf(after));
}

/**
 * The stored amount, in the terms of a food's current measure. Grams convert through
 * the serving weight, and a serving amount carries over while its unit is unchanged.
 * Null when the amount cannot be expressed, for example 2 scoops of a food now
 * measured by weight when the logged scoops have no known weight.
 */
export function amountForFood(logged: LoggedAmount, food: FoodItem): Amount | null {
  const measure = measureOf(food);
  const hasGrams = logged.grams > 0;
  const servings = logged.unit !== undefined && logged.unit !== 'g' ? logged.quantity : undefined;

  if (measure.kind === 'weight') return hasGrams ? { quantity: logged.grams, unit: 'g' } : null;
  if (servings !== undefined && logged.unit === measure.unitName) return { quantity: servings, unit: 'serving' };
  if (hasGrams && measure.servingWeightG !== undefined) return { quantity: logged.grams, unit: 'g' };
  return servings !== undefined ? { quantity: servings, unit: 'serving' } : null;
}

function recalculateIngredient(ingredient: MealIngredient, food: FoodItem): MealIngredient {
  const amount = amountForFood(ingredient, food);
  const portion = amount ? computePortion(basisOf(food), amount) : null;
  if (!portion) return ingredient;
  return {
    ...ingredient,
    grams: portion.grams,
    quantity: portion.quantity,
    unit: portion.unit,
    unitPlural: portion.unitPlural,
    calories: portion.calories,
    proteinG: portion.proteinG,
  };
}

/** A meal's total amount: grams when every ingredient's weight is known, otherwise one serving. */
export function mealAmount(ingredients: MealIngredient[]): Pick<MealEntry, 'grams' | 'quantity' | 'unit' | 'unitPlural'> {
  const known = ingredients.every((ingredient) => ingredient.grams > 0);
  if (!known) return { grams: 0, quantity: 1, unit: 'serving', unitPlural: 'servings' };
  const grams = ingredients.reduce((sum, ingredient) => sum + ingredient.grams, 0);
  return { grams, quantity: grams, unit: 'g', unitPlural: undefined };
}

/** Re-sums a meal after only some ingredients changed. */
function withRecalculatedIngredients(entry: MealEntry, ingredients: MealIngredient[]): MealEntry {
  return {
    ...entry,
    ...mealAmount(ingredients),
    calories: ingredients.reduce((sum, ingredient) => sum + ingredient.calories, 0),
    proteinG: roundTo(
      ingredients.reduce((sum, ingredient) => sum + ingredient.proteinG, 0),
      1,
    ),
    ingredients,
  };
}

/** Keeps a saved meal's breakdown adding up after its own library values changed. */
function scaleIngredients(entry: MealEntry, calories: number, proteinG: number): MealIngredient[] | undefined {
  return entry.ingredients?.map((ingredient) => ({
    ...ingredient,
    calories: entry.calories > 0 ? Math.round((ingredient.calories * calories) / entry.calories) : ingredient.calories,
    proteinG: entry.proteinG > 0 ? roundTo((ingredient.proteinG * proteinG) / entry.proteinG, 1) : ingredient.proteinG,
  }));
}

/**
 * Applies a food's current values to one entry: new macros x stored quantity. In a
 * multi-ingredient entry only that ingredient changes and the meal totals are re-summed.
 * An amount that cannot be expressed in the food's measure leaves the entry unchanged.
 */
export function recalculateEntry(entry: MealEntry, food: FoodItem): MealEntry {
  if (entry.foodId === food.id) {
    const amount = amountForFood(entry, food);
    const portion = amount ? computePortion(basisOf(food), amount) : null;
    if (!portion) return entry;
    return {
      ...entry,
      grams: portion.grams,
      quantity: portion.quantity,
      unit: portion.unit,
      unitPlural: portion.unitPlural,
      calories: portion.calories,
      proteinG: portion.proteinG,
      fiberG: portion.fiberG,
      ingredients: scaleIngredients(entry, portion.calories, portion.proteinG),
    };
  }
  if (!entry.ingredients?.some((ingredient) => ingredient.foodId === food.id)) return entry;
  const ingredients = entry.ingredients.map((ingredient) =>
    ingredient.foodId === food.id ? recalculateIngredient(ingredient, food) : ingredient,
  );
  return withRecalculatedIngredients(entry, ingredients);
}

/** Recalculates the entries that use a food, on one date or (date undefined) on every date. */
export function recalculateLogs(
  logs: Record<string, DailyLog>,
  food: FoodItem,
  date?: string,
): Record<string, DailyLog> {
  const next = { ...logs };
  for (const key of date === undefined ? Object.keys(logs) : [date]) {
    const log = logs[key];
    if (log?.entries.some((entry) => entryUsesFood(entry, food.id))) {
      next[key] = { ...log, entries: log.entries.map((entry) => recalculateEntry(entry, food)) };
    }
  }
  return next;
}

/** Unlinks a deleted food. Entries keep the values they were logged with. */
export function unlinkFood(logs: Record<string, DailyLog>, foodId: string): Record<string, DailyLog> {
  const next = { ...logs };
  for (const [key, log] of Object.entries(logs)) {
    if (!log.entries.some((entry) => entryUsesFood(entry, foodId))) continue;
    next[key] = {
      ...log,
      entries: log.entries.map((entry) => ({
        ...entry,
        foodId: entry.foodId === foodId ? null : entry.foodId,
        ...(entry.ingredients && {
          ingredients: entry.ingredients.map((ingredient) =>
            ingredient.foodId === foodId ? { ...ingredient, foodId: null } : ingredient,
          ),
        }),
      })),
    };
  }
  return next;
}
