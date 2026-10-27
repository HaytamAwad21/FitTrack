import { describe, expect, it } from 'vitest';
import { SEED_EXERCISES } from '../data/exercises';
import type { TrainingSettings, Weekday } from '../types';
import {
  BUILT_IN_ORDER,
  adjustExerciseTarget,
  applyPreset,
  assignWorkout,
  assignedWeekdays,
  createBuiltInWorkout,
  createInitialTrainingSettings,
  createWorkoutType,
  deleteBlockedMessage,
  describeSchedule,
  duplicateWorkoutType,
  findWorkoutNameConflict,
  getWorkoutForDate,
  parseRepRange,
  presetsFor,
  setDaysPerWeek,
  toggleTrainingWeekday,
} from './routine';

const exercisesById = new Map(SEED_EXERCISES.map((exercise) => [exercise.id, exercise]));
const initial = (weekdays: Weekday[]) => createInitialTrainingSettings(weekdays, SEED_EXERCISES);
const workoutByKey = (settings: TrainingSettings, key: string) =>
  settings.routine.workoutTypes.find((workout) => workout.builtInKey === key);

describe('built-in workouts', () => {
  it('ships all six built-ins with 4-6 exercises matching their muscle groups', () => {
    for (const key of BUILT_IN_ORDER) {
      const workout = createBuiltInWorkout(key, SEED_EXERCISES);
      expect(workout.isBuiltIn).toBe(true);
      expect(workout.exercises.length).toBeGreaterThanOrEqual(4);
      expect(workout.exercises.length).toBeLessThanOrEqual(6);
      for (const item of workout.exercises) {
        const exercise = exercisesById.get(item.exerciseId);
        expect(exercise).toBeDefined();
        expect(workout.muscleGroups).toContain(exercise?.muscleGroup);
        expect(item.sets).toBe(3);
        expect([item.repMin, item.repMax]).toEqual(exercise?.type === 'compound' ? [6, 8] : [10, 12]);
      }
    }
  });

  it('gives Upper its own exercises, none shared with Push or Pull', () => {
    const ids = (key: 'push' | 'pull' | 'upper') =>
      createBuiltInWorkout(key, SEED_EXERCISES).exercises.map((item) => item.exerciseId);
    const pushPull = new Set([...ids('push'), ...ids('pull')]);
    expect(ids('upper').filter((id) => pushPull.has(id))).toEqual([]);
    expect(ids('upper')).toContain('ex-incline-dumbbell-press');
    expect(ids('upper')).toContain('ex-chest-supported-row');
  });
});

describe('schedule and presets', () => {
  it('starts from the default preset for the day count', () => {
    const settings = initial([0, 2, 4]);
    expect(settings.routine.presetId).toBe('fullbody');
    expect(describeSchedule(settings)).toBe('Mon Full Body | Wed Full Body | Fri Full Body');
  });

  it('keeps the days-per-week count equal to the selection', () => {
    let settings = initial([0, 2, 4]);
    settings = toggleTrainingWeekday(settings, 5, SEED_EXERCISES);
    expect(settings.trainingWeekdays).toEqual([0, 2, 4, 5]);
    settings = setDaysPerWeek(settings, 5, SEED_EXERCISES);
    expect(settings.trainingWeekdays).toEqual([0, 1, 2, 4, 5]);
    // Every selected day has a workout and every other day is a rest day.
    for (const day of [0, 1, 2, 3, 4, 5, 6] as Weekday[]) {
      expect(settings.routine.weekdayAssignments[day] !== null).toBe(settings.trainingWeekdays.includes(day));
    }
  });

  it('never removes the last training day', () => {
    const settings = initial([2]);
    expect(toggleTrainingWeekday(settings, 2, SEED_EXERCISES).trainingWeekdays).toEqual([2]);
  });

  it('offers only presets valid for the day count', () => {
    expect(presetsFor(3).map((preset) => preset.id)).toEqual(['fullbody', 'upper-lower', 'ppl']);
    expect(presetsFor(4).map((preset) => preset.id)).toEqual(['upper-lower', 'pplu']);
    expect(presetsFor(5).map((preset) => preset.id)).toEqual(['pplu', 'ul-ppl']);
  });

  it('assigns Push / Pull / Legs / Upper to Mon, Tue, Thu, Fri', () => {
    const settings = applyPreset(initial([0, 1, 3, 4]), 'pplu', SEED_EXERCISES);
    expect(describeSchedule(settings)).toBe('Mon Push | Tue Pull | Thu Legs | Fri Upper');
    expect(getWorkoutForDate(settings, '2026-10-29')?.name).toBe('Legs'); // a Thursday
  });

  it('changes only assignments when applying a preset', () => {
    const before = initial([0, 1, 3, 4]);
    const after = applyPreset(before, 'pplu', SEED_EXERCISES);
    expect(after.routine.workoutTypes).toEqual(before.routine.workoutTypes);
  });

  it('switches the label to Custom on a manual assignment', () => {
    const settings = applyPreset(initial([0, 1, 3, 4]), 'pplu', SEED_EXERCISES);
    const lower = workoutByKey(settings, 'lower');
    const changed = assignWorkout(settings, 4, lower?.id ?? '');
    expect(changed.routine.presetId).toBe('custom');
    expect(describeSchedule(changed)).toBe('Mon Push | Tue Pull | Thu Legs | Fri Lower');
  });
});

describe('workouts', () => {
  it('duplicates into an independent copy named "<Name> copy"', () => {
    const settings = initial([0, 2, 4]);
    const push = workoutByKey(settings, 'push');
    if (!push) throw new Error('missing push');
    const copy = duplicateWorkoutType(push, settings.routine.workoutTypes, 'copy-id');
    expect(copy).toMatchObject({ id: 'copy-id', name: 'Push copy', isBuiltIn: false });
    copy.exercises[0].sets = 5;
    expect(push.exercises[0].sets).toBe(3);
  });

  it('detects duplicate names case-insensitively', () => {
    const settings = initial([0, 2, 4]);
    expect(findWorkoutNameConflict(settings.routine.workoutTypes, '  push ')?.builtInKey).toBe('push');
    expect(findWorkoutNameConflict(settings.routine.workoutTypes, 'Arms')).toBeUndefined();
  });

  it('names the days that block deleting an assigned workout', () => {
    const settings = applyPreset(initial([0, 1, 3, 4]), 'upper-lower', SEED_EXERCISES);
    const upper = workoutByKey(settings, 'upper');
    const days = assignedWeekdays(settings, upper?.id ?? '');
    expect(days).toEqual([0, 3]);
    expect(deleteBlockedMessage(days)).toBe('Unassign it from Mon, Thu first.');
  });

  it('creates a workout empty or from another workout', () => {
    const settings = initial([0, 2, 4]);
    const push = workoutByKey(settings, 'push');
    expect(createWorkoutType({ name: ' Arms ', muscleGroups: ['Biceps', 'Triceps'] }, 'arms')).toMatchObject({
      name: 'Arms',
      exercises: [],
      isBuiltIn: false,
    });
    expect(createWorkoutType({ name: 'Push B', muscleGroups: ['Chest'], startFrom: push }, 'b').exercises).toHaveLength(
      push?.exercises.length ?? 0,
    );
  });

  it('keeps sets 1-10, reps 1-30 and min <= max', () => {
    const base = { exerciseId: 'x', sets: 3, repMin: 6, repMax: 8, order: 0 };
    expect(adjustExerciseTarget(base, { sets: 11 }).sets).toBe(10);
    expect(adjustExerciseTarget(base, { repMin: 9 })).toMatchObject({ repMin: 9, repMax: 9 });
    expect(adjustExerciseTarget(base, { repMax: 5 })).toMatchObject({ repMin: 5, repMax: 5 });
    expect(adjustExerciseTarget(base, { repMax: 40 }).repMax).toBe(30);
  });

  it('parses old rep targets', () => {
    expect(parseRepRange('6-8')).toEqual({ repMin: 6, repMax: 8 });
    expect(parseRepRange('10')).toEqual({ repMin: 10, repMax: 10 });
    expect(parseRepRange(undefined)).toEqual({ repMin: 8, repMax: 12 });
  });
});
