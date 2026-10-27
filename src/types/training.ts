import type { Weekday } from './user';

export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Quads'
  | 'Hamstrings'
  | 'Glutes'
  | 'Calves'
  | 'Core';

export type ExerciseType = 'compound' | 'isolation';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  type: ExerciseType;
}

/** Built-in workouts that ship with defaults and can be reset to them. */
export type BuiltInWorkoutKey = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'fullbody';

export type WorkoutTypeId = string;

/** One planned exercise in a workout: sets and a rep range (min = max for fixed reps). */
export interface WorkoutExercise {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  /** Position in the workout, 0-based. */
  order: number;
}

/**
 * A workout definition such as Push or a user-created "Arms". Every workout is
 * independent: none is derived from another, and editing one never changes another.
 */
export interface WorkoutType {
  id: WorkoutTypeId;
  name: string;
  muscleGroups: MuscleGroup[];
  exercises: WorkoutExercise[];
  isBuiltIn: boolean;
  builtInKey?: BuiltInWorkoutKey;
}

export type SplitPresetId = 'fullbody' | 'upper-lower' | 'ppl' | 'pplu' | 'ul-ppl';

/** Which workout is trained on each weekday (Monday = 0); null is a rest day. */
export type WeekdayAssignments = Record<Weekday, WorkoutTypeId | null>;

export interface WorkoutRoutine {
  /** Preset that produced the current assignments, or "custom" after a manual change. */
  presetId: SplitPresetId | 'custom';
  weekdayAssignments: WeekdayAssignments;
  workoutTypes: WorkoutType[];
}

/** Training schedule and workouts. */
export interface TrainingSettings {
  /**
   * Selected training weekdays, sorted. Always exactly the weekdays that have a
   * workout assigned, so days per week (its length) can never disagree with the selection.
   */
  trainingWeekdays: Weekday[];
  routine: WorkoutRoutine;
}

export interface ExerciseSet {
  id: string;
  weightKg: number;
  reps: number;
  /** Rate of perceived exertion, 1-10 in 0.5 steps. */
  rpe: number;
}

/** An exercise in a session, with the plan it was performed against (snapshot taken at start). */
export interface SessionExercise {
  exerciseId: string;
  sets: ExerciseSet[];
  targetSets?: number;
  repMin?: number;
  repMax?: number;
}

export interface WorkoutSession {
  id: string;
  /** Local date, YYYY-MM-DD. */
  date: string;
  workoutTypeId: WorkoutTypeId;
  /** Snapshot of the workout name, kept if the workout is renamed or deleted later. */
  workoutName: string;
  /** Snapshot of the planned exercises. Editing the workout later never changes it. */
  exercises: SessionExercise[];
  completed: boolean;
}
