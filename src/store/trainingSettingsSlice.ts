import type { StateCreator } from 'zustand';
import type { TrainingSettings, WorkoutType } from '../types';
import { createId } from '../utils/id';
import {
  applyPreset,
  assignWorkout,
  assignedWeekdays,
  createBuiltInWorkout,
  createInitialTrainingSettings,
  createWorkoutType,
  deleteBlockedMessage,
  duplicateWorkoutType,
  normalizeOrder,
  setDaysPerWeek,
  toggleTrainingWeekday,
} from '../utils/routine';
import type { AppState, TrainingSettingsSlice } from './types';

export const createTrainingSettingsSlice: StateCreator<
  AppState,
  [['zustand/persist', unknown]],
  [],
  TrainingSettingsSlice
> = (set, get) => {
  /** Applies a change to the training settings when they exist. */
  const update = (change: (settings: TrainingSettings) => TrainingSettings) => {
    const current = get().trainingSettings;
    if (current) set({ trainingSettings: change(current) });
  };

  const mapWorkouts = (change: (workouts: WorkoutType[]) => WorkoutType[]) =>
    update((settings) => ({ ...settings, routine: { ...settings.routine, workoutTypes: change(settings.routine.workoutTypes) } }));

  return {
    trainingSettings: null,

    initializeTraining: (weekdays) => set({ trainingSettings: createInitialTrainingSettings(weekdays, get().exercises) }),

    setDaysPerWeek: (count) => update((settings) => setDaysPerWeek(settings, count, get().exercises)),

    toggleTrainingWeekday: (day) => update((settings) => toggleTrainingWeekday(settings, day, get().exercises)),

    assignWorkout: (day, workoutId) => update((settings) => assignWorkout(settings, day, workoutId)),

    applyPreset: (presetId) =>
      update((settings) =>
        presetId === 'custom'
          ? { ...settings, routine: { ...settings.routine, presetId: 'custom' } }
          : applyPreset(settings, presetId, get().exercises),
      ),

    createWorkout: (request) => {
      const settings = get().trainingSettings;
      if (!settings) return null;
      const startFrom = settings.routine.workoutTypes.find((workout) => workout.id === request.startFromId);
      const workout = createWorkoutType({ name: request.name, muscleGroups: request.muscleGroups, startFrom }, createId());
      mapWorkouts((workouts) => [...workouts, workout]);
      return workout.id;
    },

    updateWorkout: (id, patch) =>
      mapWorkouts((workouts) =>
        workouts.map((workout) =>
          workout.id === id
            ? {
                ...workout,
                ...patch,
                name: patch.name !== undefined ? patch.name.trim() : workout.name,
                exercises: patch.exercises ? normalizeOrder(patch.exercises) : workout.exercises,
              }
            : workout,
        ),
      ),

    duplicateWorkout: (id) => {
      const settings = get().trainingSettings;
      const source = settings?.routine.workoutTypes.find((workout) => workout.id === id);
      if (!settings || !source) return null;
      const copy = duplicateWorkoutType(source, settings.routine.workoutTypes, createId());
      mapWorkouts((workouts) => {
        // Place the copy right after its source.
        const index = workouts.findIndex((workout) => workout.id === id);
        return [...workouts.slice(0, index + 1), copy, ...workouts.slice(index + 1)];
      });
      return copy.id;
    },

    deleteWorkout: (id) => {
      const settings = get().trainingSettings;
      if (!settings) return { ok: false, message: 'Training settings are not set up yet.' };
      const days = assignedWeekdays(settings, id);
      if (days.length > 0) return { ok: false, message: deleteBlockedMessage(days) };
      mapWorkouts((workouts) => workouts.filter((workout) => workout.id !== id));
      return { ok: true };
    },

    resetWorkout: (id) =>
      mapWorkouts((workouts) =>
        workouts.map((workout) => {
          if (workout.id !== id || !workout.isBuiltIn || !workout.builtInKey) return workout;
          return { ...createBuiltInWorkout(workout.builtInKey, get().exercises), id: workout.id };
        }),
      ),
  };
};
