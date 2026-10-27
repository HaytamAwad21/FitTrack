export type UnitSystem = 'metric' | 'imperial';

export type Gender = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extremely_active';

export type Goal = 'cutting' | 'bulking';

/** Weekday index with Monday = 0 and Sunday = 6. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Body stats, goal and units. All body measurements are stored in metric units.
 * The unit system is global: training weights are displayed in it too.
 */
export interface NutritionSettings {
  id: string;
  unitSystem: UnitSystem;
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: Goal;
  /** User-chosen daily targets. When set, they replace the calculated calories and protein. */
  customTargets?: CustomTargets;
}

export interface CustomTargets {
  calories: number;
  proteinG: number;
}
