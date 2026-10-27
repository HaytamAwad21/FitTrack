import type { FoodIngredient, FoodItem, FoodState, Measure, Micronutrients, ServingMeasure } from '../types';

/** Built-in food library, relative to the project root. The dev server rewrites it. */
export const LIBRARY_FILE = 'src/data/library.json';

/** Dev-server endpoint that receives the app's food library. */
export const LIBRARY_SYNC_PATH = '/__fittrack/library';

/** Largest request body the dev server accepts, in bytes. */
export const MAX_LIBRARY_BYTES = 2_000_000;

const MAX_FOODS = 5000;
const MAX_INGREDIENTS = 50;
const MAX_AMOUNT = 100_000;
const STATES: FoodState[] = ['raw', 'cooked', 'n/a'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A non-empty string of at most `max` characters, or undefined. */
function text(value: unknown, max: number): string | undefined {
  return typeof value === 'string' && value.trim() !== '' && value.length <= max ? value : undefined;
}

/** A finite, non-negative number in a sane range, or undefined. */
function amount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_AMOUNT ? value : undefined;
}

function parseServingMeasure(value: unknown): ServingMeasure | null {
  if (!isRecord(value) || value.kind !== 'serving') return null;
  const unitName = text(value.unitName, 40);
  const unitNamePlural = text(value.unitNamePlural, 40);
  if (!unitName || !unitNamePlural) return null;
  const measure: ServingMeasure = { kind: 'serving', unitName, unitNamePlural };
  if (value.servingWeightG !== undefined) {
    const weight = amount(value.servingWeightG);
    if (weight === undefined || weight === 0) return null;
    measure.servingWeightG = weight;
  }
  return measure;
}

function parseMeasure(value: unknown): Measure | null {
  if (isRecord(value) && value.kind === 'weight') return { kind: 'weight' };
  return parseServingMeasure(value);
}

function parseMicronutrients(value: unknown): Micronutrients | null {
  if (!isRecord(value)) return null;
  const result: Micronutrients = {};
  for (const [key, raw] of Object.entries(value)) {
    const number = amount(raw);
    if (key.length > 60 || number === undefined) return null;
    result[key] = number;
  }
  return result;
}

function parseIngredient(value: unknown): FoodIngredient | null {
  if (!isRecord(value)) return null;
  const name = text(value.name, 200);
  const grams = amount(value.grams);
  if (!name || grams === undefined) return null;
  const ingredient: FoodIngredient = { name, grams };
  if (value.foodId !== undefined) {
    const foodId = text(value.foodId, 100);
    if (!foodId) return null;
    ingredient.foodId = foodId;
  }
  if (value.quantity !== undefined) {
    const quantity = amount(value.quantity);
    if (quantity === undefined) return null;
    ingredient.quantity = quantity;
  }
  if (value.unit !== undefined) {
    const unit = text(value.unit, 40);
    if (!unit) return null;
    ingredient.unit = unit;
  }
  return ingredient;
}

/**
 * Validates one library food and returns a clean copy with only known fields,
 * or null when anything is missing or malformed.
 */
export function parseFood(value: unknown): FoodItem | null {
  if (!isRecord(value)) return null;
  const id = text(value.id, 100);
  const name = text(value.name, 200);
  const state = STATES.find((item) => item === value.state);
  const measure = parseMeasure(value.measure);
  if (!id || !name || !state || !measure) return null;

  let food: FoodItem;
  if (measure.kind === 'weight') {
    const calories = amount(value.caloriesPer100g);
    const protein = amount(value.proteinPer100g);
    if (calories === undefined || protein === undefined || value.caloriesPerServing !== undefined) return null;
    food = { id, name, state, measure, caloriesPer100g: calories, proteinPer100g: protein };
    if (value.fiberPer100g !== undefined) {
      const fiber = amount(value.fiberPer100g);
      if (fiber === undefined) return null;
      food.fiberPer100g = fiber;
    }
  } else {
    const calories = amount(value.caloriesPerServing);
    const protein = amount(value.proteinPerServing);
    if (calories === undefined || protein === undefined || value.caloriesPer100g !== undefined) return null;
    food = { id, name, state, measure, caloriesPerServing: calories, proteinPerServing: protein };
    if (value.fiberPerServing !== undefined) {
      const fiber = amount(value.fiberPerServing);
      if (fiber === undefined) return null;
      food.fiberPerServing = fiber;
    }
  }

  if (value.stateLabel !== undefined) {
    const stateLabel = text(value.stateLabel, 40);
    if (!stateLabel) return null;
    food.stateLabel = stateLabel;
  }
  if (value.micronutrients !== undefined) {
    const micronutrients = parseMicronutrients(value.micronutrients);
    if (!micronutrients) return null;
    food.micronutrients = micronutrients;
  }
  if (value.isComposite !== undefined) {
    if (typeof value.isComposite !== 'boolean') return null;
    food.isComposite = value.isComposite;
  }
  if (value.ingredients !== undefined) {
    if (!Array.isArray(value.ingredients) || value.ingredients.length > MAX_INGREDIENTS) return null;
    const ingredients = value.ingredients.map(parseIngredient);
    if (ingredients.some((ingredient) => ingredient === null)) return null;
    food.ingredients = ingredients as FoodIngredient[];
  }
  if (value.needsReview !== undefined) {
    if (typeof value.needsReview !== 'boolean') return null;
    food.needsReview = value.needsReview;
  }
  if (value.reviewNote !== undefined) {
    const reviewNote = text(value.reviewNote, 500);
    if (!reviewNote) return null;
    food.reviewNote = reviewNote;
  }
  if (value.suggestedMeasure !== undefined) {
    const suggestedMeasure = parseServingMeasure(value.suggestedMeasure);
    if (!suggestedMeasure) return null;
    food.suggestedMeasure = suggestedMeasure;
  }
  return food;
}

/** Validates a whole library: an array of valid foods with unique ids. Null when invalid. */
export function parseLibrary(value: unknown): FoodItem[] | null {
  if (!Array.isArray(value) || value.length > MAX_FOODS) return null;
  const foods: FoodItem[] = [];
  const ids = new Set<string>();
  for (const item of value) {
    const food = parseFood(item);
    if (!food || ids.has(food.id)) return null;
    ids.add(food.id);
    foods.push(food);
  }
  return foods;
}

/** Library file contents: one food per line, so changes are easy to read. */
export function serializeLibrary(foods: FoodItem[]): string {
  if (foods.length === 0) return '[]\n';
  return `[\n${foods.map((food) => `  ${JSON.stringify(food)}`).join(',\n')}\n]\n`;
}
