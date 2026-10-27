import { SEED_EXERCISES } from '../data/exercises';
import { SEED_FOODS } from '../data/foods';
import type {
  BuiltInWorkoutKey,
  DailyLog,
  Exercise,
  FoodItem,
  MealEntry,
  MealIngredient,
  Micronutrients,
  MuscleGroup,
  NutritionSettings,
  ServingMeasure,
  SessionExercise,
  SplitPresetId,
  TrainingSettings,
  Weekday,
  WeightFoodItem,
  WorkoutSession,
  WorkoutType,
  WorkoutTypeId,
} from '../types';
import { findDuplicateFood } from '../utils/foodNames';
import { detectMeasure, servingMeasure } from '../utils/measure';
import {
  BUILT_IN_ORDER,
  SETS_RANGE,
  WEEKDAYS,
  applyPreset,
  builtInWorkoutId,
  createInitialTrainingSettings,
  emptyAssignments,
  ensureBuiltIns,
  parseRepRange,
  withPositions,
} from '../utils/routine';
import { getDefaultWeekdays } from '../utils/schedule';
import { roundTo } from '../utils/units';
import type { PersistedState } from './types';

export const SCHEMA_VERSION = 9;

/** Ids of the schema version 1 seed foods. They are replaced by the current seed list. */
export const V1_SEED_FOOD_IDS = new Set([
  'food-chicken-breast',
  'food-white-rice',
  'food-brown-rice',
  'food-whole-egg',
  'food-rolled-oats',
  'food-greek-yogurt',
  'food-banana',
  'food-olive-oil',
  'food-salmon',
  'food-potato',
  'food-whey-protein',
  'food-lean-beef',
  'food-broccoli',
  'food-apple',
  'food-almonds',
  'food-whole-wheat-bread',
  'food-cottage-cheese',
  'food-sweet-potato',
  'food-peanut-butter',
  'food-tuna',
]);

/** Food as stored by schema version 1 (nutrition per serving). */
export interface LegacyFoodItemV1 {
  id: string;
  name: string;
  servingDescription?: string;
  caloriesPerServing?: number;
  proteinPerServing?: number;
  fiberPerServing?: number;
  micronutrients?: Micronutrients;
}

/** Meal entry as stored by schema version 1 (quantity in servings). */
export interface LegacyMealEntryV1 {
  id: string;
  foodId?: string;
  name: string;
  servings?: number;
  grams?: number;
  calories: number;
  proteinG: number;
  fiberG?: number;
  timestamp: string;
  ingredients?: MealIngredient[];
}

interface LegacyDailyLog {
  id?: string;
  date?: string;
  entries?: LegacyMealEntryV1[];
}

/** Food as stored by schema versions 2-4: nutrition per 100 g and no measure. */
export type LegacyFoodItemV4 = Omit<WeightFoodItem, 'measure'> & { measure?: undefined };

type StoredFood = LegacyFoodItemV1 | LegacyFoodItemV4 | FoodItem;

/** Seed foods that became serving-based in schema version 5, with their serving. */
export const V5_SEED_SERVINGS: Record<string, ServingMeasure> = {
  'food-whey-protein': servingMeasure('scoop', 30),
  'food-whole-egg': servingMeasure('piece', 50),
  'food-egg-boiled': servingMeasure('piece', 50),
  'food-banana': servingMeasure('piece', 120),
  'food-apple': servingMeasure('piece', 180),
  'food-orange': servingMeasure('piece', 130),
};

export function createDefaultPersistedState(): PersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    nutritionSettings: null,
    targets: null,
    trainingSettings: null,
    foods: SEED_FOODS,
    logs: {},
    exercises: SEED_EXERCISES,
    sessions: [],
  };
}

/** Extracts a gram weight from a serving description such as "1 cup (158 g)" or "100 g". */
export function parseServingGrams(description: string | undefined): number | null {
  if (!description) return null;
  const match = description.match(/(\d+(?:[.,]\d+)?)\s*(?:g|grams?)\b/i);
  if (!match) return null;
  const grams = Number(match[1].replace(',', '.'));
  return Number.isFinite(grams) && grams > 0 ? grams : null;
}

/** True for foods already stored per 100 g (version 2+) or with a measure (version 5+). */
function isCurrentFood(food: StoredFood): food is LegacyFoodItemV4 | FoodItem {
  return typeof (food as LegacyFoodItemV4).caloriesPer100g === 'number' || (food as FoodItem).measure !== undefined;
}

function migrateFoodV1(food: LegacyFoodItemV1): LegacyFoodItemV4 {
  const calories = food.caloriesPerServing ?? 0;
  const protein = food.proteinPerServing ?? 0;
  const grams = parseServingGrams(food.servingDescription);
  const base = {
    id: food.id,
    name: typeof food.name === 'string' && food.name.trim() !== '' ? food.name : 'Unnamed food',
    state: 'n/a' as const,
    micronutrients: food.micronutrients,
  };

  if (grams !== null) {
    return {
      ...base,
      caloriesPer100g: Math.round((calories / grams) * 100),
      proteinPer100g: roundTo((protein / grams) * 100, 1),
      fiberPer100g:
        food.fiberPerServing === undefined ? undefined : roundTo((food.fiberPerServing / grams) * 100, 1),
    };
  }

  // Weight unknown: keep the per-serving numbers and ask the user to correct them.
  return {
    ...base,
    caloriesPer100g: calories,
    proteinPer100g: protein,
    fiberPer100g: food.fiberPerServing,
    needsReview: true,
    reviewNote: `Saved as "${food.servingDescription ?? '1 serving'}": ${calories} kcal, ${protein} g protein. Enter values per 100 g.`,
  };
}

function migrateEntryV1(entry: LegacyMealEntryV1, servingGrams: Map<string, number>): MealEntry {
  const { servings, ...rest } = entry;
  if (typeof entry.grams === 'number') return { ...rest, grams: entry.grams };
  const gramsPerServing = entry.foodId ? servingGrams.get(entry.foodId) : undefined;
  const grams =
    gramsPerServing !== undefined && typeof servings === 'number' ? Math.round(servings * gramsPerServing) : 0;
  return { ...rest, grams };
}

/**
 * Version 1 to 2: nutrition moves from per serving to per 100 g.
 * Seed foods are replaced, user foods are converted (or flagged for review),
 * and log entries keep their totals with grams derived where possible.
 */
export function migrateV1ToV2(state: Record<string, unknown>): Record<string, unknown> {
  const storedFoods = (Array.isArray(state.foods) ? state.foods : []) as StoredFood[];
  const seedIds = new Set(SEED_FOODS.map((food) => food.id));

  const servingGrams = new Map<string, number>();
  for (const food of storedFoods) {
    if (!food || isCurrentFood(food)) continue;
    const grams = parseServingGrams(food.servingDescription);
    if (grams !== null) servingGrams.set(food.id, grams);
  }

  const userFoods = storedFoods
    .filter(
      (food) =>
        food && typeof food.id === 'string' && !V1_SEED_FOOD_IDS.has(food.id) && !seedIds.has(food.id),
    )
    .map((food) => (isCurrentFood(food) ? food : migrateFoodV1(food)));

  const storedLogs =
    state.logs && typeof state.logs === 'object' ? (state.logs as Record<string, LegacyDailyLog | null>) : {};
  const logs: Record<string, DailyLog> = {};
  for (const [date, log] of Object.entries(storedLogs)) {
    if (!log) continue;
    const entries = Array.isArray(log.entries)
      ? log.entries.filter(Boolean).map((entry) => migrateEntryV1(entry, servingGrams))
      : [];
    logs[date] = { id: log.id ?? date, date: log.date ?? date, entries };
  }

  return { ...state, schemaVersion: 2, foods: [...SEED_FOODS, ...userFoods], logs };
}

/**
 * Adds seed foods that are missing from an existing library (the common fruits
 * and vegetables added after version 2). A seed is skipped when its id is already
 * present or the user already has a food with the same name and state, so running
 * this more than once is safe.
 */
export function addMissingSeedFoods(state: Record<string, unknown>, schemaVersion: number): Record<string, unknown> {
  const foods = (Array.isArray(state.foods) ? state.foods : []) as FoodItem[];
  const ids = new Set(foods.map((food) => food?.id));
  const missing = SEED_FOODS.filter(
    (seedFood) => !ids.has(seedFood.id) && !findDuplicateFood(foods, seedFood.name, seedFood.state),
  );
  return { ...state, schemaVersion, foods: [...foods, ...missing] };
}

/** Converts a per-100 g food to per serving, keeping any values the user edited. */
function toServingFood(food: LegacyFoodItemV4, measure: ServingMeasure): FoodItem {
  const weight = measure.servingWeightG ?? 100;
  const { caloriesPer100g, proteinPer100g, fiberPer100g, ...base } = food;
  return {
    ...base,
    measure,
    caloriesPerServing: Math.round((caloriesPer100g * weight) / 100),
    proteinPerServing: roundTo((proteinPer100g * weight) / 100, 1),
    fiberPerServing: fiberPer100g === undefined ? undefined : roundTo((fiberPer100g * weight) / 100, 1),
  } as FoodItem;
}

/**
 * Version 4 to 5: every food gets a measure. Foods default to weight. Seed whey,
 * eggs and whole fruit become serving-based. User foods whose name suggests a serving
 * stay weight-based but are flagged for review with the suggested unit. Log entries
 * are left unchanged.
 */
export function migrateV4ToV5(state: Record<string, unknown>): Record<string, unknown> {
  const stored = (Array.isArray(state.foods) ? state.foods : []) as (LegacyFoodItemV4 | FoodItem)[];
  const seedIds = new Set(SEED_FOODS.map((food) => food.id));

  const foods = stored.filter(Boolean).map((food): FoodItem => {
    if (food.measure) return food as FoodItem;
    const legacy = food as LegacyFoodItemV4;
    const seedServing = V5_SEED_SERVINGS[legacy.id];
    if (seedServing) return toServingFood(legacy, seedServing);

    const weightFood: FoodItem = { ...legacy, measure: { kind: 'weight' } };
    if (seedIds.has(legacy.id)) return weightFood;

    const detected = detectMeasure(legacy.name ?? '');
    if (detected.kind === 'weight') return weightFood;
    const hint = `This looks like it should be measured in ${detected.unitNamePlural}.`;
    return {
      ...weightFood,
      needsReview: true,
      suggestedMeasure: detected,
      reviewNote: legacy.reviewNote ? `${hint} ${legacy.reviewNote}` : hint,
    };
  });

  return { ...state, schemaVersion: 5, foods };
}

/** Routine day as stored by schema versions 1-5. */
interface LegacyRoutineDay {
  id: string;
  name?: string;
  muscleGroups?: MuscleGroup[];
  exercises?: { exerciseId: string; targetSets?: number; targetReps?: string }[];
}

/** Generated routine as stored by schema versions 1-5. */
interface LegacyRoutine {
  id?: string;
  splitName?: string;
  days?: LegacyRoutineDay[];
  weekdayMap?: Partial<Record<string, string>>;
}

/** Profile as stored by schema versions 1-5: nutrition settings plus the training schedule. */
type LegacyUser = NutritionSettings & { trainingDaysPerWeek?: number; trainingWeekdays?: Weekday[] };

/** Session as stored by schema versions 1-5. */
interface LegacySession {
  id: string;
  date: string;
  routineDayId?: string;
  routineDayName?: string;
  workoutTypeId?: string;
  workoutName?: string;
  exercises?: SessionExercise[];
  completed?: boolean;
}

/** Old generated split keys that correspond to a v6 preset. */
const LEGACY_SPLIT_PRESETS: Record<string, SplitPresetId> = {
  'full-body': 'fullbody',
  'upper-lower': 'upper-lower',
  'upper-lower-ppl': 'ul-ppl',
  ppl: 'ppl',
};

/** Old routine day ids look like "push-a", "upper", "full-body-b" or "active-recovery". */
function builtInKeyForDay(dayId: string): BuiltInWorkoutKey | undefined {
  if (dayId === 'full-body' || dayId.startsWith('full-body-')) return 'fullbody';
  const keys: BuiltInWorkoutKey[] = ['push', 'pull', 'legs', 'upper', 'lower'];
  return keys.find((key) => dayId === key || dayId.startsWith(`${key}-`));
}

function stripTraining(user: LegacyUser): NutritionSettings {
  const { trainingDaysPerWeek: _days, trainingWeekdays: _weekdays, ...nutrition } = user;
  return nutrition;
}

function sameAssignments(a: TrainingSettings, b: TrainingSettings): boolean {
  return WEEKDAYS.every((day) => a.routine.weekdayAssignments[day] === b.routine.weekdayAssignments[day]);
}

function clampSets(value: number | undefined): number {
  return Math.min(SETS_RANGE.max, Math.max(SETS_RANGE.min, Math.round(value ?? 3)));
}

/**
 * Version 5 to 6: the profile splits into nutrition settings and training settings.
 * Generated routine days become editable workouts (the first day of each kind is
 * marked built-in), the weekday mapping is kept, missing built-ins (such as Upper) are
 * added with defaults, rep targets like "6-8" become repMin/repMax, and sessions get a
 * snapshot of the plan they were performed with.
 */
export function migrateV5ToV6(state: Record<string, unknown>): Record<string, unknown> {
  const { user: rawUser, routine: rawRoutine, ...rest } = state;
  const user = (rawUser ?? null) as LegacyUser | null;
  const legacyRoutine = (rawRoutine ?? null) as LegacyRoutine | null;

  const storedExercises = (Array.isArray(state.exercises) ? state.exercises : []) as Exercise[];
  const exerciseIds = new Set(storedExercises.map((exercise) => exercise?.id));
  const exercises = [...storedExercises, ...SEED_EXERCISES.filter((exercise) => !exerciseIds.has(exercise.id))];

  const nutritionSettings = (state.nutritionSettings as NutritionSettings | null | undefined) ?? (user ? stripTraining(user) : null);

  const dayIdMap = new Map<string, WorkoutTypeId>();
  const legacyDays = new Map<string, LegacyRoutineDay>();
  const migratedWorkouts: WorkoutType[] = [];
  const usedKeys = new Set<BuiltInWorkoutKey>();
  for (const day of legacyRoutine?.days ?? []) {
    if (!day || typeof day.id !== 'string') continue;
    const key = builtInKeyForDay(day.id);
    const builtInKey = key && !usedKeys.has(key) ? key : undefined;
    if (builtInKey) usedKeys.add(builtInKey);
    const id = builtInKey ? builtInWorkoutId(builtInKey) : `workout-${day.id}`;
    dayIdMap.set(day.id, id);
    legacyDays.set(day.id, day);
    migratedWorkouts.push({
      id,
      name: day.name ?? 'Workout',
      muscleGroups: [...(day.muscleGroups ?? [])],
      exercises: withPositions(
        (day.exercises ?? [])
          .filter((exercise) => exercise && typeof exercise.exerciseId === 'string')
          .map((exercise) => ({
            exerciseId: exercise.exerciseId,
            sets: clampSets(exercise.targetSets),
            ...parseRepRange(exercise.targetReps),
          })),
      ),
      isBuiltIn: builtInKey !== undefined,
      builtInKey,
    });
  }

  const assignments = emptyAssignments();
  for (const [weekdayText, dayId] of Object.entries(legacyRoutine?.weekdayMap ?? {})) {
    const weekday = Number(weekdayText);
    const workoutId = dayId ? dayIdMap.get(dayId) : undefined;
    if (Number.isInteger(weekday) && weekday >= 0 && weekday <= 6 && workoutId) assignments[weekday as Weekday] = workoutId;
  }
  const trainingWeekdays = WEEKDAYS.filter((day) => assignments[day] !== null);

  let trainingSettings = (state.trainingSettings as TrainingSettings | null | undefined) ?? null;
  if (!trainingSettings && (user || legacyRoutine)) {
    if (trainingWeekdays.length === 0) {
      // No usable routine: build the default schedule from the old weekdays.
      const weekdays = user?.trainingWeekdays?.length ? user.trainingWeekdays : getDefaultWeekdays(3);
      trainingSettings = createInitialTrainingSettings(weekdays, exercises);
    } else {
      const migrated: TrainingSettings = {
        trainingWeekdays,
        routine: {
          presetId: 'custom',
          weekdayAssignments: assignments,
          workoutTypes: ensureBuiltIns(migratedWorkouts, BUILT_IN_ORDER, exercises),
        },
      };
      // Keep the preset label only when re-applying it would give exactly the same days.
      const splitKey = legacyRoutine?.id?.match(/^routine-(.+)-\d+$/)?.[1];
      const candidate = splitKey ? LEGACY_SPLIT_PRESETS[splitKey] : undefined;
      const matches = candidate ? sameAssignments(applyPreset(migrated, candidate, exercises), migrated) : false;
      trainingSettings =
        candidate && matches ? { ...migrated, routine: { ...migrated.routine, presetId: candidate } } : migrated;
    }
  }

  const storedSessions = (Array.isArray(state.sessions) ? state.sessions : []) as LegacySession[];
  const sessions: WorkoutSession[] = storedSessions.filter(Boolean).map((session) => {
    const legacyDay = session.routineDayId ? legacyDays.get(session.routineDayId) : undefined;
    return {
      id: session.id,
      date: session.date,
      workoutTypeId:
        session.workoutTypeId ?? (session.routineDayId ? dayIdMap.get(session.routineDayId) ?? session.routineDayId : 'unknown'),
      workoutName: session.workoutName ?? session.routineDayName ?? 'Workout',
      exercises: (session.exercises ?? []).map((exercise) => {
        if (exercise.repMin !== undefined) return exercise;
        const planned = legacyDay?.exercises?.find((item) => item.exerciseId === exercise.exerciseId);
        return planned
          ? { ...exercise, targetSets: clampSets(planned.targetSets), ...parseRepRange(planned.targetReps) }
          : exercise;
      }),
      completed: Boolean(session.completed),
    };
  });

  return { ...rest, schemaVersion: 6, nutritionSettings, trainingSettings, exercises, sessions };
}

/** Built-in food names tidied in schema version 8 (spelling and capitals), old to new. */
export const V8_FOOD_RENAMES: Record<string, string> = {
  oats: 'Oats',
  'cheese 9%': 'Cheese 9%',
  'cheese 15%': 'Cheese 15%',
  'cheese 5%': 'Cheese 5%',
  'mozzarela sticks': 'Mozzarella sticks',
  'cottage cheese 5%': 'Cottage cheese 5%',
  'blueberries jam protein yogurt': 'Blueberry jam protein yogurt',
  'strawberries protein yogurt': 'Strawberry protein yogurt',
  'myprotein chocolate smooth poweder': 'Myprotein chocolate smooth powder',
};

/**
 * Version 7 to 8: library foods with an old built-in name get the tidied name, so the
 * user's copies keep matching the built-ins. A rename that would clash with another
 * food of the same name and state is skipped. Log entries keep their names.
 */
export function migrateV7ToV8(state: Record<string, unknown>): Record<string, unknown> {
  const stored = (Array.isArray(state.foods) ? state.foods : []) as FoodItem[];
  const foods = stored.map((food) => {
    if (!food || typeof food.name !== 'string') return food;
    const name = V8_FOOD_RENAMES[food.name.trim().toLowerCase()];
    if (!name || name === food.name) return food;
    return findDuplicateFood(stored, name, food.state, food.id) ? food : { ...food, name };
  });
  return { ...state, schemaVersion: 8, foods };
}

/**
 * Version 8 to 9: adds the exercises that joined the library. An exercise is skipped
 * when its id is already present or an exercise with the same name exists.
 */
export function addMissingSeedExercises(state: Record<string, unknown>): Record<string, unknown> {
  const exercises = (Array.isArray(state.exercises) ? state.exercises : []) as Exercise[];
  const ids = new Set(exercises.map((exercise) => exercise?.id));
  const names = new Set(
    exercises.map((exercise) => (typeof exercise?.name === 'string' ? exercise.name.trim().toLowerCase() : '')),
  );
  const missing = SEED_EXERCISES.filter(
    (exercise) => !ids.has(exercise.id) && !names.has(exercise.name.toLowerCase()),
  );
  return { ...state, schemaVersion: 9, exercises: [...exercises, ...missing] };
}

/**
 * Upgrades persisted state from `version` to SCHEMA_VERSION.
 * Each step handles one version bump; the current version is returned unchanged.
 */
export function migrateState(persistedState: unknown, version: number): PersistedState {
  let state = (persistedState ?? {}) as Record<string, unknown>;

  if (version < 1) {
    // Data written before versioning: fill any missing fields with defaults.
    state = { ...createDefaultPersistedState(), ...state, schemaVersion: 1 };
  }

  if (version < 2) {
    state = migrateV1ToV2(state);
  }

  if (version < 4) {
    // Version 3 data written by an interim build may lack the fruit and vegetable
    // seeds, so versions 2 and 3 both run the (idempotent) seed sync.
    state = addMissingSeedFoods(state, 4);
  }

  if (version < 5) {
    state = migrateV4ToV5(state);
    // Adds the new "Protein yogurt" seed unless the user already has one.
    state = addMissingSeedFoods(state, 5);
  }

  if (version < 6) {
    state = migrateV5ToV6(state);
  }

  if (version < 7) {
    // Adds the personal-library foods that became built-in. Copies the user already
    // has under the same name and state are kept and not duplicated.
    state = addMissingSeedFoods(state, 7);
  }

  if (version < 8) {
    state = migrateV7ToV8(state);
  }

  if (version < 9) {
    state = addMissingSeedExercises(state);
  }

  return state as unknown as PersistedState;
}
