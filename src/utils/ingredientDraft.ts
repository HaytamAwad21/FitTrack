import type { FoodItem, FoodNutrition, FoodState, Measure, MealIngredient } from '../types';
import {
  applyMeasureToDraft,
  draftMeasure,
  draftToNutrition,
  emptyFoodDraft,
  validateFoodDraft,
  type FoodDraft,
  type FoodDraftErrors,
} from './foodDraft';
import { findDuplicateFood, findFoodByDisplayName, formatFoodName } from './foodNames';
import { createId } from './id';
import { basisOf, detectMeasure, measureOf } from './measure';
import { computePortion, type Portion } from './nutrition';
import { defaultQuantityDraft, parseQuantity, reconcileQuantity, type QuantityDraft } from './portion';

/** An ingredient being entered: a library food, or a new food described by its label values. */
export interface IngredientDraft {
  key: string;
  text: string;
  foodId: string | null;
  quantity: QuantityDraft;
  /** Measurement and nutrition of a new (non-library) food. */
  draft: FoodDraft;
  /** True once the user changed the measurement, so name detection stops overriding it. */
  measureEdited: boolean;
  state: FoodState;
}

export type IngredientErrors = FoodDraftErrors & { name?: string; quantity?: string };

export interface ResolvedIngredient {
  row: IngredientDraft;
  /** Library food the row refers to, if any. */
  food: FoodItem | null;
  isNew: boolean;
  /** Trimmed typed name for new foods, display name for library foods. */
  name: string;
  measure: Measure;
  errors: IngredientErrors;
  /** Stored nutrition of a new food, or null while its fields are invalid. */
  nutrition: FoodNutrition | null;
  /** Calculated amount, or null while the row is incomplete or invalid. */
  portion: Portion | null;
}

export function createIngredientDraft(): IngredientDraft {
  return {
    key: createId(),
    text: '',
    foodId: null,
    quantity: defaultQuantityDraft({ kind: 'weight' }),
    draft: emptyFoodDraft(),
    measureEdited: false,
    state: 'n/a',
  };
}

export function resolveIngredientDraft(row: IngredientDraft, foods: FoodItem[]): ResolvedIngredient {
  const linked = row.foodId ? foods.find((food) => food.id === row.foodId) : undefined;
  if (linked) {
    const measure = measureOf(linked);
    const { amount, error } = parseQuantity(measure, row.quantity);
    return {
      row,
      food: linked,
      isNew: false,
      name: formatFoodName(linked),
      measure,
      errors: { quantity: error },
      nutrition: null,
      portion: amount ? computePortion(basisOf(linked), amount) : null,
    };
  }

  const name = row.text.trim();
  const measure = draftMeasure(row.draft);
  const { amount, error } = parseQuantity(measure, row.quantity);
  const nutrition = draftToNutrition(row.draft);
  return {
    row,
    food: null,
    isNew: true,
    name,
    measure,
    errors: {
      ...validateFoodDraft(row.draft),
      name: name === '' ? 'Pick a library food or type a new name' : undefined,
      quantity: error,
    },
    nutrition,
    portion: nutrition && amount && name !== '' ? computePortion(basisOf(nutrition), amount) : null,
  };
}

/** Picks a library food; the amount resets to that food's natural unit. */
export function selectIngredientFood(row: IngredientDraft, food: FoodItem): IngredientDraft {
  return { ...row, text: formatFoodName(food), foodId: food.id, quantity: defaultQuantityDraft(measureOf(food)) };
}

/**
 * Typing a name: an exact library match (same name and state) selects it, so a new food
 * never silently duplicates one. Otherwise the measurement is auto-detected.
 */
export function changeIngredientText(row: IngredientDraft, text: string, foods: FoodItem[]): IngredientDraft {
  const match = findFoodByDisplayName(foods, text) ?? findDuplicateFood(foods, text, row.state);
  if (match) return selectIngredientFood(row, match);
  const wasLinked = row.foodId !== null && foods.some((food) => food.id === row.foodId);
  const draft = row.measureEdited ? row.draft : applyMeasureToDraft(row.draft, detectMeasure(text));
  const nextMeasure = draftMeasure(draft);
  return {
    ...row,
    text,
    foodId: null,
    draft,
    state: wasLinked ? 'n/a' : row.state,
    // Leaving a library food starts a fresh amount; otherwise keep what was typed when it still fits.
    quantity: wasLinked ? defaultQuantityDraft(nextMeasure) : reconcileQuantity(draftMeasure(row.draft), nextMeasure, row.quantity),
  };
}

/** Choosing raw/cooked: the same name and state in the library is that food, not a new one. */
export function changeIngredientState(row: IngredientDraft, state: FoodState, foods: FoodItem[]): IngredientDraft {
  const match = findDuplicateFood(foods, row.text, state);
  if (!match) return { ...row, state };
  return {
    ...selectIngredientFood(row, match),
    quantity: reconcileQuantity(draftMeasure(row.draft), measureOf(match), row.quantity),
  };
}

export function changeIngredientFoodDraft(row: IngredientDraft, draft: FoodDraft, measureEdited: boolean): IngredientDraft {
  return {
    ...row,
    draft,
    measureEdited: row.measureEdited || measureEdited,
    quantity: reconcileQuantity(draftMeasure(row.draft), draftMeasure(draft), row.quantity),
  };
}

export function portionToIngredient(portion: Portion, name: string, foodId: string | null | undefined): MealIngredient {
  return {
    foodId,
    name,
    grams: portion.grams,
    quantity: portion.quantity,
    unit: portion.unit,
    unitPlural: portion.unitPlural,
    calories: portion.calories,
    proteinG: portion.proteinG,
  };
}
