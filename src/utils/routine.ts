import type {
  BuiltInWorkoutKey,
  Exercise,
  MuscleGroup,
  SplitPresetId,
  TrainingSettings,
  Weekday,
  WeekdayAssignments,
  WorkoutExercise,
  WorkoutRoutine,
  WorkoutType,
  WorkoutTypeId,
} from '../types';
import { WEEKDAY_SHORT, weekdayOf } from './date';
import { getDefaultWeekdays, sortWeekdays, toggleWeekday } from './schedule';

export const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

/** Default targets for exercises added to a workout. */
export const COMPOUND_DEFAULT = { sets: 3, repMin: 6, repMax: 8 } as const;
export const ISOLATION_DEFAULT = { sets: 3, repMin: 10, repMax: 12 } as const;
export const SETS_RANGE = { min: 1, max: 10 } as const;
export const REPS_RANGE = { min: 1, max: 30 } as const;

interface BuiltInDefinition {
  name: string;
  muscleGroups: MuscleGroup[];
  /** Default exercises, in order. Ids missing from the library are skipped. */
  exerciseIds: string[];
}

/**
 * Built-in workouts. Each one is a separate definition; Upper deliberately uses
 * different exercises from Push and Pull and is never derived from them.
 */
export const BUILT_IN_WORKOUTS: Record<BuiltInWorkoutKey, BuiltInDefinition> = {
  push: {
    name: 'Push',
    muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
    exerciseIds: ['ex-barbell-bench-press', 'ex-overhead-press', 'ex-cable-fly', 'ex-lateral-raise', 'ex-triceps-pushdown'],
  },
  pull: {
    name: 'Pull',
    muscleGroups: ['Back', 'Biceps'],
    exerciseIds: [
      'ex-pull-up',
      'ex-barbell-row',
      'ex-seated-cable-row',
      'ex-straight-arm-pulldown',
      'ex-barbell-curl',
      'ex-hammer-curl',
    ],
  },
  legs: {
    name: 'Legs',
    muscleGroups: ['Quads', 'Hamstrings', 'Glutes', 'Calves'],
    exerciseIds: [
      'ex-back-squat',
      'ex-romanian-deadlift',
      'ex-barbell-hip-thrust',
      'ex-leg-extension',
      'ex-lying-leg-curl',
      'ex-standing-calf-raise',
    ],
  },
  upper: {
    name: 'Upper',
    muscleGroups: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'],
    // Horizontal press, horizontal row, vertical press, vertical pull, biceps, triceps.
    exerciseIds: [
      'ex-incline-dumbbell-press',
      'ex-chest-supported-row',
      'ex-seated-dumbbell-press',
      'ex-lat-pulldown',
      'ex-incline-dumbbell-curl',
      'ex-overhead-triceps-extension',
    ],
  },
  lower: {
    name: 'Lower',
    muscleGroups: ['Quads', 'Hamstrings', 'Glutes', 'Calves'],
    exerciseIds: [
      'ex-front-squat',
      'ex-conventional-deadlift',
      'ex-walking-lunge',
      'ex-leg-press',
      'ex-seated-leg-curl',
      'ex-seated-calf-raise',
    ],
  },
  fullbody: {
    name: 'Full Body',
    muscleGroups: ['Quads', 'Chest', 'Back', 'Shoulders', 'Core'],
    // Legs, horizontal push, horizontal pull, vertical push, vertical pull, core.
    exerciseIds: [
      'ex-back-squat',
      'ex-barbell-bench-press',
      'ex-seated-cable-row',
      'ex-overhead-press',
      'ex-lat-pulldown',
      'ex-plank',
    ],
  },
};

export const BUILT_IN_ORDER: BuiltInWorkoutKey[] = ['push', 'pull', 'legs', 'upper', 'lower', 'fullbody'];

export function builtInWorkoutId(key: BuiltInWorkoutKey): WorkoutTypeId {
  return `workout-${key}`;
}

export function defaultTargetFor(exercise: Exercise | undefined): { sets: number; repMin: number; repMax: number } {
  return exercise?.type === 'compound' ? { ...COMPOUND_DEFAULT } : { ...ISOLATION_DEFAULT };
}

/** Sorts exercises by `order` and renumbers them 0..n-1. */
export function normalizeOrder(exercises: WorkoutExercise[]): WorkoutExercise[] {
  return [...exercises]
    .sort((a, b) => a.order - b.order)
    .map((exercise, index) => ({ ...exercise, order: index }));
}

/** Assigns `order` from array position (use after reordering an array). */
export function withPositions(exercises: Omit<WorkoutExercise, 'order'>[]): WorkoutExercise[] {
  return exercises.map((exercise, index) => ({ ...exercise, order: index }));
}

export function sortedExercises(workout: WorkoutType): WorkoutExercise[] {
  return [...workout.exercises].sort((a, b) => a.order - b.order);
}

export function totalSets(workout: WorkoutType): number {
  return workout.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
}

export function defaultBuiltInExercises(key: BuiltInWorkoutKey, library: Exercise[]): WorkoutExercise[] {
  const byId = new Map(library.map((exercise) => [exercise.id, exercise]));
  return withPositions(
    BUILT_IN_WORKOUTS[key].exerciseIds.flatMap((id) => {
      const exercise = byId.get(id);
      return exercise ? [{ exerciseId: id, ...defaultTargetFor(exercise) }] : [];
    }),
  );
}

export function createBuiltInWorkout(key: BuiltInWorkoutKey, library: Exercise[]): WorkoutType {
  const definition = BUILT_IN_WORKOUTS[key];
  return {
    id: builtInWorkoutId(key),
    name: definition.name,
    muscleGroups: [...definition.muscleGroups],
    exercises: defaultBuiltInExercises(key, library),
    isBuiltIn: true,
    builtInKey: key,
  };
}

export function emptyAssignments(): WeekdayAssignments {
  return { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
}

/** "6-8", or "10" for fixed reps. */
export function formatRepRange(repMin: number, repMax: number): string {
  return repMin === repMax ? `${repMin}` : `${repMin}-${repMax}`;
}

function clampReps(value: number): number {
  return Math.min(REPS_RANGE.max, Math.max(REPS_RANGE.min, Math.round(value)));
}

/** Parses an old rep target such as "6-8" or "10" (fixed reps give min = max). */
export function parseRepRange(text: string | undefined): { repMin: number; repMax: number } {
  const numbers = (text ?? '').match(/\d+/g)?.map(Number) ?? [];
  if (numbers.length === 0) return { repMin: 8, repMax: 12 };
  const repMin = clampReps(numbers[0]);
  const repMax = clampReps(numbers.length > 1 ? numbers[1] : numbers[0]);
  return repMin <= repMax ? { repMin, repMax } : { repMin: repMax, repMax: repMin };
}

/** Applies a sets / reps change while keeping sets in 1-10, reps in 1-30 and min <= max. */
export function adjustExerciseTarget(
  exercise: WorkoutExercise,
  patch: Partial<Pick<WorkoutExercise, 'sets' | 'repMin' | 'repMax'>>,
): WorkoutExercise {
  const sets = Math.min(SETS_RANGE.max, Math.max(SETS_RANGE.min, Math.round(patch.sets ?? exercise.sets)));
  let repMin = clampReps(patch.repMin ?? exercise.repMin);
  let repMax = clampReps(patch.repMax ?? exercise.repMax);
  if (repMin > repMax) {
    // Keep the value the user just changed and move the other end with it.
    if (patch.repMin !== undefined) repMax = repMin;
    else repMin = repMax;
  }
  return { ...exercise, sets, repMin, repMax };
}

// ---------------------------------------------------------------------------
// Split presets
// ---------------------------------------------------------------------------

export interface SplitPreset {
  id: SplitPresetId;
  label: string;
  /** Day counts the preset is offered for. */
  daysLabel: string;
  isValidFor: (days: number) => boolean;
  /** Built-in workouts assigned to the selected weekdays in order, repeating as needed. */
  sequence: BuiltInWorkoutKey[];
}

export const SPLIT_PRESETS: SplitPreset[] = [
  {
    id: 'fullbody',
    label: 'Full Body',
    daysLabel: '1-3 days',
    isValidFor: (days) => days >= 1 && days <= 3,
    sequence: ['fullbody'],
  },
  {
    id: 'upper-lower',
    label: 'Upper / Lower',
    daysLabel: '2-4 days',
    isValidFor: (days) => days >= 2 && days <= 4,
    sequence: ['upper', 'lower'],
  },
  {
    id: 'ppl',
    label: 'Push / Pull / Legs',
    daysLabel: '3 or 6 days',
    isValidFor: (days) => days === 3 || days === 6,
    sequence: ['push', 'pull', 'legs'],
  },
  {
    id: 'pplu',
    label: 'Push / Pull / Legs / Upper',
    daysLabel: '4 days; extra days are yours to assign',
    isValidFor: (days) => days >= 4,
    sequence: ['push', 'pull', 'legs', 'upper'],
  },
  {
    id: 'ul-ppl',
    label: 'Upper / Lower + Push / Pull / Legs',
    daysLabel: '5 days',
    isValidFor: (days) => days === 5,
    sequence: ['upper', 'lower', 'push', 'pull', 'legs'],
  },
];

export function findPreset(id: SplitPresetId | 'custom'): SplitPreset | undefined {
  return SPLIT_PRESETS.find((preset) => preset.id === id);
}

export function presetsFor(days: number): SplitPreset[] {
  return SPLIT_PRESETS.filter((preset) => preset.isValidFor(days));
}

/** Preset used for a new schedule with this many days. */
export function defaultPresetFor(days: number): SplitPresetId {
  if (days <= 3) return 'fullbody';
  if (days === 4) return 'upper-lower';
  if (days === 5) return 'ul-ppl';
  if (days === 6) return 'ppl';
  return 'pplu';
}

/** Adds built-in workouts that are missing (for example after the user deleted one). Never changes existing ones. */
export function ensureBuiltIns(
  workoutTypes: WorkoutType[],
  keys: BuiltInWorkoutKey[],
  library: Exercise[],
): WorkoutType[] {
  const missing = [...new Set(keys)].filter((key) => !workoutTypes.some((workout) => workout.builtInKey === key));
  return [...workoutTypes, ...missing.map((key) => createBuiltInWorkout(key, library))];
}

function workoutIdForKey(workoutTypes: WorkoutType[], key: BuiltInWorkoutKey): WorkoutTypeId | null {
  return workoutTypes.find((workout) => workout.builtInKey === key)?.id ?? null;
}

/**
 * Fills the weekday assignments from a preset. Only assignments change: workout
 * contents are never touched (missing built-ins are re-added with defaults).
 */
export function applyPreset(settings: TrainingSettings, presetId: SplitPresetId, library: Exercise[]): TrainingSettings {
  const preset = findPreset(presetId);
  if (!preset) return settings;
  const { routine, trainingWeekdays } = settings;
  const workoutTypes = ensureBuiltIns(routine.workoutTypes, preset.sequence, library);
  const assignments = emptyAssignments();
  trainingWeekdays.forEach((day, index) => {
    const previous = routine.weekdayAssignments[day];
    const isExtraDay = preset.id === 'pplu' && index >= preset.sequence.length;
    if (isExtraDay && previous && workoutTypes.some((workout) => workout.id === previous)) {
      assignments[day] = previous;
      return;
    }
    assignments[day] = workoutIdForKey(workoutTypes, preset.sequence[index % preset.sequence.length]);
  });
  return { trainingWeekdays, routine: { presetId, weekdayAssignments: assignments, workoutTypes } };
}

/** A workout for a newly selected day in a custom schedule: one not used yet, else the first workout. */
function fallbackWorkoutId(workoutTypes: WorkoutType[], assignments: WeekdayAssignments): WorkoutTypeId | null {
  const used = new Set(Object.values(assignments));
  return (workoutTypes.find((workout) => !used.has(workout.id)) ?? workoutTypes[0])?.id ?? null;
}

/**
 * Changes the selected weekdays and keeps assignments in step: a preset that is
 * still valid is re-applied; otherwise the schedule becomes custom, remaining days
 * keep their workout and new days get one.
 */
export function setTrainingWeekdays(settings: TrainingSettings, weekdays: Weekday[], library: Exercise[]): TrainingSettings {
  const days = sortWeekdays(weekdays);
  if (days.length === 0) return settings;
  const { routine } = settings;
  const preset = routine.presetId === 'custom' ? undefined : findPreset(routine.presetId);
  if (preset && preset.isValidFor(days.length)) {
    return applyPreset({ trainingWeekdays: days, routine }, preset.id, library);
  }
  const workoutTypes = routine.workoutTypes.length > 0 ? routine.workoutTypes : ensureBuiltIns([], ['fullbody'], library);
  const assignments = emptyAssignments();
  for (const day of days) {
    const previous = routine.weekdayAssignments[day];
    assignments[day] =
      previous && workoutTypes.some((workout) => workout.id === previous) ? previous : fallbackWorkoutId(workoutTypes, assignments);
  }
  return {
    trainingWeekdays: days,
    routine: { presetId: 'custom', weekdayAssignments: assignments, workoutTypes },
  };
}

/** Days-per-week button: selects the default spread for that count. */
export function setDaysPerWeek(settings: TrainingSettings, count: number, library: Exercise[]): TrainingSettings {
  return setTrainingWeekdays(settings, getDefaultWeekdays(count), library);
}

/** Weekday toggle: the days-per-week count follows the selection automatically. */
export function toggleTrainingWeekday(settings: TrainingSettings, day: Weekday, library: Exercise[]): TrainingSettings {
  return setTrainingWeekdays(settings, toggleWeekday(settings.trainingWeekdays, day), library);
}

/** Manual assignment of a workout to a selected weekday; switches the preset label to Custom. */
export function assignWorkout(settings: TrainingSettings, day: Weekday, workoutId: WorkoutTypeId): TrainingSettings {
  const { routine } = settings;
  if (!settings.trainingWeekdays.includes(day) || !routine.workoutTypes.some((workout) => workout.id === workoutId)) {
    return settings;
  }
  if (routine.weekdayAssignments[day] === workoutId) return settings;
  return {
    ...settings,
    routine: { ...routine, presetId: 'custom', weekdayAssignments: { ...routine.weekdayAssignments, [day]: workoutId } },
  };
}

/** "Mon Push | Tue Pull | Thu Legs | Fri Upper". */
export function describeSchedule(settings: TrainingSettings): string {
  const names = new Map(settings.routine.workoutTypes.map((workout) => [workout.id, workout.name]));
  return settings.trainingWeekdays
    .map((day) => `${WEEKDAY_SHORT[day]} ${names.get(settings.routine.weekdayAssignments[day] ?? '') ?? 'Rest'}`)
    .join(' | ');
}

/** Preview of the weekly layout a preset would produce for the current weekdays. */
export function presetPreview(settings: TrainingSettings, presetId: SplitPresetId, library: Exercise[]): string {
  return describeSchedule(applyPreset(settings, presetId, library));
}

export function createInitialTrainingSettings(weekdays: Weekday[], library: Exercise[]): TrainingSettings {
  const days = sortWeekdays(weekdays);
  const trainingWeekdays = days.length > 0 ? days : getDefaultWeekdays(3);
  const routine: WorkoutRoutine = {
    presetId: 'custom',
    weekdayAssignments: emptyAssignments(),
    workoutTypes: BUILT_IN_ORDER.map((key) => createBuiltInWorkout(key, library)),
  };
  return applyPreset({ trainingWeekdays, routine }, defaultPresetFor(trainingWeekdays.length), library);
}

// ---------------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------------

export function normalizeWorkoutName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Workout with the same name (case-insensitive, trimmed), if any. */
export function findWorkoutNameConflict(
  workoutTypes: WorkoutType[],
  name: string,
  excludeId?: WorkoutTypeId,
): WorkoutType | undefined {
  const target = normalizeWorkoutName(name);
  if (target === '') return undefined;
  return workoutTypes.find((workout) => workout.id !== excludeId && normalizeWorkoutName(workout.name) === target);
}

/** `base`, or "base 2", "base 3"... whichever is free. */
export function uniqueWorkoutName(workoutTypes: WorkoutType[], base: string): string {
  const name = base.trim();
  if (!findWorkoutNameConflict(workoutTypes, name)) return name;
  for (let suffix = 2; ; suffix++) {
    const candidate = `${name} ${suffix}`;
    if (!findWorkoutNameConflict(workoutTypes, candidate)) return candidate;
  }
}

export function assignedWeekdays(settings: TrainingSettings, workoutId: WorkoutTypeId): Weekday[] {
  return settings.trainingWeekdays.filter((day) => settings.routine.weekdayAssignments[day] === workoutId);
}

/** "Unassign it from Mon, Thu first." */
export function deleteBlockedMessage(days: Weekday[]): string {
  return `Unassign it from ${days.map((day) => WEEKDAY_SHORT[day]).join(', ')} first.`;
}

/** Independent copy named "<Name> copy". The copy is never built-in. */
export function duplicateWorkoutType(workout: WorkoutType, workoutTypes: WorkoutType[], id: WorkoutTypeId): WorkoutType {
  return {
    id,
    name: uniqueWorkoutName(workoutTypes, `${workout.name} copy`),
    muscleGroups: [...workout.muscleGroups],
    exercises: normalizeOrder(workout.exercises.map((exercise) => ({ ...exercise }))),
    isBuiltIn: false,
  };
}

export interface NewWorkoutInput {
  name: string;
  muscleGroups: MuscleGroup[];
  /** Copy exercises from this workout; empty when omitted. */
  startFrom?: WorkoutType;
}

export function createWorkoutType(input: NewWorkoutInput, id: WorkoutTypeId): WorkoutType {
  return {
    id,
    name: input.name.trim(),
    muscleGroups: [...input.muscleGroups],
    exercises: input.startFrom ? normalizeOrder(input.startFrom.exercises.map((exercise) => ({ ...exercise }))) : [],
    isBuiltIn: false,
  };
}

export function getWorkoutForDate(settings: TrainingSettings | null, date: string): WorkoutType | null {
  if (!settings) return null;
  const id = settings.routine.weekdayAssignments[weekdayOf(date)];
  if (!id) return null;
  return settings.routine.workoutTypes.find((workout) => workout.id === id) ?? null;
}
