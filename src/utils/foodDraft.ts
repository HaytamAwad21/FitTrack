import type { FoodItem, FoodNutrition, Measure, ServingMeasure } from '../types';
import { basisOf, servingMeasure } from './measure';
import { formatNumber, roundTo } from './units';
import { parseNumber } from './validation';

export type MeasureKind = Measure['kind'];

/** Raw text of the "new food" fields: how it is measured and its nutrition on that basis. */
export interface FoodDraft {
  kind: MeasureKind;
  unitName: string;
  /** Optional "1 serving = ___ g". */
  servingWeight: string;
  /** Per 100 g for weight foods, per serving for serving foods. */
  calories: string;
  protein: string;
  fiber: string;
}

export type FoodDraftField = 'unitName' | 'servingWeight' | 'calories' | 'protein' | 'fiber';
export type FoodDraftErrors = Partial<Record<FoodDraftField, string>>;

/** Hard input limits. Values past the "unusual" thresholds below only trigger a warning. */
export const DRAFT_LIMITS = {
  weight: { calories: 2000, protein: 200, fiber: 100 },
  serving: { calories: 5000, protein: 500, fiber: 200 },
  servingWeightG: 5000,
} as const;

/** Pure fat is about 900 kcal per 100 g; anything above is almost certainly a typo. */
export const UNUSUAL_KCAL_PER_100G = 900;
/** Protein calories (4 kcal per gram) may exceed total calories by this share before warning. */
export const PROTEIN_KCAL_TOLERANCE = 0.1;

export function emptyFoodDraft(): FoodDraft {
  return { kind: 'weight', unitName: '', servingWeight: '', calories: '', protein: '', fiber: '' };
}

/** Sets the measurement part of a draft (keeps the nutrition text). */
export function applyMeasureToDraft(draft: FoodDraft, measure: Measure): FoodDraft {
  if (measure.kind === 'weight') return { ...draft, kind: 'weight' };
  return {
    ...draft,
    kind: 'serving',
    unitName: measure.unitName,
    servingWeight: measure.servingWeightG !== undefined ? String(measure.servingWeightG) : '',
  };
}

export function draftFromFood(food: FoodItem): FoodDraft {
  const basis = basisOf(food);
  const measure = basis.measure;
  return {
    kind: measure.kind,
    unitName: measure.kind === 'serving' ? measure.unitName : '',
    servingWeight:
      measure.kind === 'serving' && measure.servingWeightG !== undefined
        ? formatNumber(measure.servingWeightG, 1)
        : '',
    calories: formatNumber(basis.calories, 0),
    protein: formatNumber(basis.protein, 1),
    fiber: basis.fiber !== undefined ? formatNumber(basis.fiber, 1) : '',
  };
}

function parseServingWeight(draft: FoodDraft): number | undefined {
  const value = parseNumber(draft.servingWeight);
  return value !== null && value > 0 && value <= DRAFT_LIMITS.servingWeightG ? value : undefined;
}

/** Measure described by the draft, usable even while the nutrition fields are incomplete. */
export function draftMeasure(draft: FoodDraft): Measure {
  if (draft.kind === 'weight') return { kind: 'weight' };
  return servingMeasure(draft.unitName.trim() || 'serving', parseServingWeight(draft));
}

/** "per 100 g" or "per scoop". */
export function draftBasisLabel(draft: FoodDraft): string {
  return draft.kind === 'weight' ? 'per 100 g' : `per ${draft.unitName.trim() || 'serving'}`;
}

function numberError(text: string, label: string, max: number, optional = false): string | undefined {
  if (optional && text.trim() === '') return undefined;
  const value = parseNumber(text);
  if (value === null) return `Enter ${label}`;
  if (value < 0 || value > max) return `Must be 0-${max}`;
  return undefined;
}

export function validateFoodDraft(draft: FoodDraft): FoodDraftErrors {
  const limits = DRAFT_LIMITS[draft.kind];
  const errors: FoodDraftErrors = {
    calories: numberError(draft.calories, 'calories', limits.calories),
    protein: numberError(draft.protein, 'protein', limits.protein),
    fiber: numberError(draft.fiber, 'fiber', limits.fiber, true),
  };
  if (draft.kind === 'serving') {
    if (draft.unitName.trim() === '') errors.unitName = 'Enter a unit, for example "scoop"';
    else if (draft.unitName.trim().length > 20) errors.unitName = 'Keep the unit short';
    if (draft.servingWeight.trim() !== '' && parseServingWeight(draft) === undefined) {
      errors.servingWeight = `Must be 1-${DRAFT_LIMITS.servingWeightG} g`;
    }
  }
  return errors;
}

export function hasDraftErrors(errors: FoodDraftErrors): boolean {
  return Object.values(errors).some(Boolean);
}

/** Converts a valid draft into stored nutrition (per 100 g or per serving). Null while invalid. */
export function draftToNutrition(draft: FoodDraft): FoodNutrition | null {
  if (hasDraftErrors(validateFoodDraft(draft))) return null;
  const calories = parseNumber(draft.calories);
  const protein = parseNumber(draft.protein);
  const fiber = parseNumber(draft.fiber);
  if (calories === null || protein === null) return null;
  if (draft.kind === 'weight') {
    return {
      measure: { kind: 'weight' },
      caloriesPer100g: Math.round(calories),
      proteinPer100g: roundTo(protein, 1),
      fiberPer100g: fiber === null ? undefined : roundTo(fiber, 1),
    };
  }
  return {
    measure: draftMeasure(draft) as ServingMeasure,
    caloriesPerServing: Math.round(calories),
    proteinPerServing: roundTo(protein, 1),
    fiberPerServing: fiber === null ? undefined : roundTo(fiber, 1),
  };
}

/**
 * Non-blocking label sanity check: more than 900 kcal per 100 g, more protein than
 * the food weighs, or protein calories above total calories by more than 10%.
 */
export function draftLooksUnusual(draft: FoodDraft): boolean {
  const calories = parseNumber(draft.calories);
  const protein = parseNumber(draft.protein);
  if (calories === null || protein === null) return false;
  if (draft.kind === 'weight') {
    if (calories > UNUSUAL_KCAL_PER_100G || protein > 100) return true;
  } else {
    const weight = parseServingWeight(draft);
    if (weight !== undefined && protein > weight) return true;
  }
  return protein * 4 > calories * (1 + PROTEIN_KCAL_TOLERANCE);
}

/**
 * Switches between grams and servings. When the serving weight is known the values
 * are converted (per 100 g <-> per serving); otherwise the typed numbers are kept.
 */
export function convertDraftKind(draft: FoodDraft, kind: MeasureKind): FoodDraft {
  if (draft.kind === kind) return draft;
  const next: FoodDraft = { ...draft, kind, unitName: kind === 'serving' && !draft.unitName.trim() ? 'serving' : draft.unitName };
  const weight = parseServingWeight(draft);
  if (weight === undefined) return next;
  const factor = kind === 'serving' ? weight / 100 : 100 / weight;
  const convert = (text: string, decimals: number) => {
    const value = parseNumber(text);
    return value === null ? text : formatNumber(value * factor, decimals);
  };
  return {
    ...next,
    calories: convert(draft.calories, 0),
    protein: convert(draft.protein, 1),
    fiber: convert(draft.fiber, 1),
  };
}

/** Edit-form draft for a food flagged by migration: servings pre-selected, values converted with the suggested weight. */
export function draftForReview(food: FoodItem, suggested: ServingMeasure): FoodDraft {
  const weightDraft = { ...draftFromFood(food), kind: 'weight' as const };
  const withUnit: FoodDraft = {
    ...weightDraft,
    unitName: suggested.unitName,
    servingWeight: suggested.servingWeightG !== undefined ? String(suggested.servingWeightG) : '',
  };
  return convertDraftKind(withUnit, 'serving');
}
