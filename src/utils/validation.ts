import type { UnitSystem } from '../types';
import { HEIGHT_RANGE, WEIGHT_RANGE, heightUnitLabel, weightUnitLabel } from './units';

export const AGE_RANGE = { min: 14, max: 90 } as const;

/** Parses user-entered numeric text. Accepts a comma as decimal separator. */
export function parseNumber(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '') return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Allowed range for user-chosen daily targets. */
export const CUSTOM_TARGET_RANGE = {
  calories: { min: 800, max: 8000 },
  protein: { min: 20, max: 500 },
} as const;

export function validateCustomTarget(text: string, target: keyof typeof CUSTOM_TARGET_RANGE): string | undefined {
  const { min, max } = CUSTOM_TARGET_RANGE[target];
  const unit = target === 'calories' ? 'kcal' : 'g';
  const value = parseNumber(text);
  if (value === null) return `Enter your ${target} target`;
  if (!Number.isInteger(value)) return 'Use a whole number';
  if (value < min || value > max) return `Must be ${min}-${max} ${unit}`;
  return undefined;
}

/** Food weight is always entered in whole grams, regardless of the unit system. */
export const GRAMS_RANGE = { min: 1, max: 5000 } as const;

export function validateGrams(text: string): string | undefined {
  const value = parseNumber(text);
  if (value === null) return 'Enter the weight in grams';
  if (!Number.isInteger(value)) return 'Use whole grams';
  if (value < GRAMS_RANGE.min || value > GRAMS_RANGE.max) {
    return `Must be ${GRAMS_RANGE.min}-${GRAMS_RANGE.max} g`;
  }
  return undefined;
}

/** Servings (scoops, tubs, pieces) are entered in 0.25 steps. */
export const SERVINGS_RANGE = { min: 0.25, max: 100, step: 0.25 } as const;

export function validateServings(text: string): string | undefined {
  const value = parseNumber(text);
  if (value === null) return 'Enter a quantity';
  if (value < SERVINGS_RANGE.min || value > SERVINGS_RANGE.max) {
    return `Must be ${SERVINGS_RANGE.min}-${SERVINGS_RANGE.max}`;
  }
  const steps = value / SERVINGS_RANGE.step;
  if (Math.abs(steps - Math.round(steps)) > 1e-9) return 'Use steps of 0.25';
  return undefined;
}

export interface ProfileFormValues {
  unitSystem: UnitSystem;
  weight: string;
  height: string;
  age: string;
}

export type ProfileField = 'weight' | 'height' | 'age';

export type ProfileErrors = Partial<Record<ProfileField, string>>;

/** Validates profile form values. Weight and height are checked in the selected display unit. */
export function validateProfile(values: ProfileFormValues): ProfileErrors {
  const errors: ProfileErrors = {};

  const weightRange = WEIGHT_RANGE[values.unitSystem];
  const weight = parseNumber(values.weight);
  if (weight === null) {
    errors.weight = 'Enter your weight';
  } else if (weight < weightRange.min || weight > weightRange.max) {
    errors.weight = `Must be ${weightRange.min}-${weightRange.max} ${weightUnitLabel(values.unitSystem)}`;
  }

  const heightRange = HEIGHT_RANGE[values.unitSystem];
  const height = parseNumber(values.height);
  if (height === null) {
    errors.height = 'Enter your height';
  } else if (height < heightRange.min || height > heightRange.max) {
    errors.height = `Must be ${heightRange.min}-${heightRange.max} ${heightUnitLabel(values.unitSystem)}`;
  }

  const age = parseNumber(values.age);
  if (age === null) {
    errors.age = 'Enter your age';
  } else if (!Number.isInteger(age)) {
    errors.age = 'Age must be a whole number';
  } else if (age < AGE_RANGE.min || age > AGE_RANGE.max) {
    errors.age = `Age must be ${AGE_RANGE.min}-${AGE_RANGE.max}`;
  }

  return errors;
}
