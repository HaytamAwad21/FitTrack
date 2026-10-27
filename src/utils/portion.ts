import type { Measure } from '../types';
import { formatNumber } from './units';
import { parseNumber, validateGrams, validateServings } from './validation';

/** An amount to log: grams, or a number of servings. */
export interface Amount {
  quantity: number;
  unit: 'g' | 'serving';
}

/** Whether a serving-based food is being entered in servings or (when its weight is known) in grams. */
export type QuantityMode = 'servings' | 'grams';

/** Raw quantity input as typed, before validation. */
export interface QuantityDraft {
  mode: QuantityMode;
  text: string;
}

/** Step of the +/- buttons for servings. */
export const SERVING_STEPPER = 0.5;
export const MIN_SERVINGS = 0.25;

export function defaultQuantityDraft(measure: Measure): QuantityDraft {
  return measure.kind === 'serving' ? { mode: 'servings', text: '1' } : { mode: 'grams', text: '' };
}

/** Quantity draft that shows an already logged amount. */
export function draftFromLogged(measure: Measure, logged: { quantity?: number; grams: number }): QuantityDraft {
  if (measure.kind === 'weight') return { mode: 'grams', text: logged.grams > 0 ? String(logged.grams) : '' };
  return { mode: 'servings', text: formatNumber(logged.quantity ?? 1, 2) };
}

function entersGrams(measure: Measure, draft: QuantityDraft): boolean {
  return measure.kind === 'weight' || (draft.mode === 'grams' && measure.servingWeightG !== undefined);
}

/** Validates a quantity draft for a measure. Weight foods take whole grams; servings take 0.25 steps. */
export function parseQuantity(measure: Measure, draft: QuantityDraft): { amount: Amount | null; error?: string } {
  const value = parseNumber(draft.text);
  if (entersGrams(measure, draft)) {
    const error = validateGrams(draft.text);
    return error || value === null ? { amount: null, error } : { amount: { quantity: value, unit: 'g' } };
  }
  const error = validateServings(draft.text);
  return error || value === null ? { amount: null, error } : { amount: { quantity: value, unit: 'serving' } };
}

/** Adds or removes half a serving, never going below 0.25. */
export function stepServings(text: string, direction: 1 | -1): string {
  const current = parseNumber(text);
  if (current === null || current <= 0) return '1';
  const next = Math.round((current + direction * SERVING_STEPPER) * 4) / 4;
  return formatNumber(Math.max(MIN_SERVINGS, next), 2);
}

/** Switches between servings and grams, converting the typed value with the serving weight. */
export function switchQuantityMode(measure: Measure, draft: QuantityDraft, mode: QuantityMode): QuantityDraft {
  if (measure.kind !== 'serving' || measure.servingWeightG === undefined || draft.mode === mode) {
    return { ...draft, mode };
  }
  const weight = measure.servingWeightG;
  const value = parseNumber(draft.text);
  if (value === null || value <= 0) return { mode, text: mode === 'servings' ? '1' : String(weight) };
  if (mode === 'grams') return { mode, text: String(Math.round(value * weight)) };
  const servings = Math.max(MIN_SERVINGS, Math.round((value / weight) * 4) / 4);
  return { mode, text: formatNumber(servings, 2) };
}

/** Keeps a quantity draft valid when the food's measure changes (for example while typing a new food name). */
export function reconcileQuantity(previous: Measure, next: Measure, draft: QuantityDraft): QuantityDraft {
  if (previous.kind !== next.kind) return defaultQuantityDraft(next);
  if (next.kind === 'serving' && draft.mode === 'grams' && next.servingWeightG === undefined) {
    return { mode: 'servings', text: '1' };
  }
  return draft;
}
