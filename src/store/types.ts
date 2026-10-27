import type {
  DailyLog,
  Exercise,
  ExerciseSet,
  FoodItem,
  MealEntry,
  MuscleGroup,
  NutritionSettings,
  NutritionTargets,
  SplitPresetId,
  TrainingSettings,
  Weekday,
  WorkoutSession,
  WorkoutType,
  WorkoutTypeId,
} from '../types';
import type { NewMealEntry } from '../utils/nutrition';

export type NutritionSettingsInput = Omit<NutritionSettings, 'id'>;

/** Omit that keeps a union discriminated (plain Omit merges the members). */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Food data without an id, either weight-based or serving-based. */
export type NewFoodItem = DistributiveOmit<FoodItem, 'id'>;

export interface NutritionSettingsSlice {
  nutritionSettings: NutritionSettings | null;
  targets: NutritionTargets | null;
  /** Saves body stats, units and goal and recalculates nutrition targets. Never touches training. */
  saveNutritionSettings: (input: NutritionSettingsInput) => void;
}

export type DeleteWorkoutResult = { ok: true } | { ok: false; message: string };

export interface NewWorkoutRequest {
  name: string;
  muscleGroups: MuscleGroup[];
  /** Copy exercises from this workout; starts empty when omitted. */
  startFromId?: WorkoutTypeId;
}

export interface TrainingSettingsSlice {
  trainingSettings: TrainingSettings | null;
  /** Creates the schedule and built-in workouts (onboarding). */
  initializeTraining: (weekdays: Weekday[]) => void;
  setDaysPerWeek: (count: number) => void;
  toggleTrainingWeekday: (day: Weekday) => void;
  assignWorkout: (day: Weekday, workoutId: WorkoutTypeId) => void;
  /** Fills weekday assignments from a preset ("custom" only changes the label). Never edits workouts. */
  applyPreset: (presetId: SplitPresetId | 'custom') => void;
  createWorkout: (request: NewWorkoutRequest) => WorkoutTypeId | null;
  updateWorkout: (id: WorkoutTypeId, patch: Partial<Pick<WorkoutType, 'name' | 'muscleGroups' | 'exercises'>>) => void;
  duplicateWorkout: (id: WorkoutTypeId) => WorkoutTypeId | null;
  /** Refused while the workout is assigned to a weekday. */
  deleteWorkout: (id: WorkoutTypeId) => DeleteWorkoutResult;
  /** Restores a built-in workout's default name, muscle groups and exercises. */
  resetWorkout: (id: WorkoutTypeId) => void;
}

export interface NutritionSlice {
  foods: FoodItem[];
  /** Daily logs keyed by local date (YYYY-MM-DD). */
  logs: Record<string, DailyLog>;
  addFood: (food: NewFoodItem) => FoodItem;
  /** Patches fields that do not change how the food is measured (for example its name). */
  updateFood: (id: string, patch: Partial<NewFoodItem>) => void;
  /** Replaces a food's data while keeping its id; use this when the measurement may change. */
  replaceFood: (id: string, food: NewFoodItem) => void;
  deleteFood: (id: string) => void;
  addEntries: (date: string, entries: NewMealEntry[]) => void;
  updateEntry: (date: string, entryId: string, patch: Partial<Omit<MealEntry, 'id'>>) => void;
  deleteEntry: (date: string, entryId: string) => void;
}

export interface TrainingSlice {
  exercises: Exercise[];
  sessions: WorkoutSession[];
  /**
   * Opens the session for a date, creating it from the workout if none exists. The
   * workout's exercises are copied into the session, so later edits never change it. Returns its id.
   */
  startSession: (date: string, workout: WorkoutType) => string;
  addSet: (sessionId: string, exerciseId: string, set: Omit<ExerciseSet, 'id'>) => void;
  updateSet: (
    sessionId: string,
    exerciseId: string,
    setId: string,
    patch: Partial<Omit<ExerciseSet, 'id'>>,
  ) => void;
  deleteSet: (sessionId: string, exerciseId: string, setId: string) => void;
  finishSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
}

export interface MetaSlice {
  schemaVersion: number;
}

export type AppState = MetaSlice & NutritionSettingsSlice & TrainingSettingsSlice & NutritionSlice & TrainingSlice;

/** The subset of state written to localStorage. */
export type PersistedState = Pick<
  AppState,
  | 'schemaVersion'
  | 'nutritionSettings'
  | 'targets'
  | 'trainingSettings'
  | 'foods'
  | 'logs'
  | 'exercises'
  | 'sessions'
>;
