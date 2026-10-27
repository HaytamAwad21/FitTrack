import type { ActivityLevel, Gender, Goal, NutritionTargets } from '../types';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
};

/** Daily calorie adjustment applied to TDEE for each goal. */
export const GOAL_CALORIE_ADJUSTMENT: Record<Goal, number> = {
  cutting: -500,
  bulking: 300,
};

/** Grams of protein per kilogram of body weight for each goal. */
export const PROTEIN_PER_KG: Record<Goal, number> = {
  cutting: 2.2,
  bulking: 2.0,
};

export interface MacroInput {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Basal metabolic rate via the Mifflin-St Jeor equation. */
export function calculateBmr(input: Pick<MacroInput, 'weightKg' | 'heightCm' | 'age' | 'gender'>): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return input.gender === 'male' ? base + 5 : base - 161;
}

/** Total daily energy expenditure. */
export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

/**
 * Daily nutrition targets. Calories are rounded to the nearest 10 kcal,
 * protein to the nearest gram. Fiber and micronutrients are not calculated yet.
 */
export function calculateTargets(input: MacroInput): NutritionTargets {
  const tdee = calculateTdee(calculateBmr(input), input.activityLevel);
  return {
    calories: roundToNearest(tdee + GOAL_CALORIE_ADJUSTMENT[input.goal], 10),
    proteinG: Math.round(input.weightKg * PROTEIN_PER_KG[input.goal]),
    fiberG: undefined,
    micronutrients: undefined,
  };
}
