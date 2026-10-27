import type { StateCreator } from 'zustand';
import { SEED_EXERCISES } from '../data/exercises';
import type { ExerciseSet, SessionExercise, WorkoutSession } from '../types';
import { createId } from '../utils/id';
import { sortedExercises } from '../utils/routine';
import type { AppState, TrainingSlice } from './types';

function updateSessionExercise(
  sessions: WorkoutSession[],
  sessionId: string,
  exerciseId: string,
  update: (sets: ExerciseSet[]) => ExerciseSet[],
): WorkoutSession[] {
  return sessions.map((session) => {
    if (session.id !== sessionId) return session;
    const exercises: SessionExercise[] = session.exercises.map((exercise) =>
      exercise.exerciseId === exerciseId ? { ...exercise, sets: update(exercise.sets) } : exercise,
    );
    return { ...session, exercises };
  });
}

export const createTrainingSlice: StateCreator<
  AppState,
  [['zustand/persist', unknown]],
  [],
  TrainingSlice
> = (set, get) => ({
  exercises: SEED_EXERCISES,
  sessions: [],

  startSession: (date, workout) => {
    const existing = get().sessions.find((session) => session.date === date);
    if (existing) return existing.id;
    const session: WorkoutSession = {
      id: createId(),
      date,
      workoutTypeId: workout.id,
      workoutName: workout.name,
      // Snapshot of the plan: later edits to the workout apply from the next session only.
      exercises: sortedExercises(workout).map((exercise) => ({
        exerciseId: exercise.exerciseId,
        sets: [],
        targetSets: exercise.sets,
        repMin: exercise.repMin,
        repMax: exercise.repMax,
      })),
      completed: false,
    };
    set((state) => ({ sessions: [...state.sessions, session] }));
    return session.id;
  },

  addSet: (sessionId, exerciseId, newSet) =>
    set((state) => ({
      sessions: updateSessionExercise(state.sessions, sessionId, exerciseId, (sets) => [
        ...sets,
        { ...newSet, id: createId() },
      ]),
    })),

  updateSet: (sessionId, exerciseId, setId, patch) =>
    set((state) => ({
      sessions: updateSessionExercise(state.sessions, sessionId, exerciseId, (sets) =>
        sets.map((item) => (item.id === setId ? { ...item, ...patch } : item)),
      ),
    })),

  deleteSet: (sessionId, exerciseId, setId) =>
    set((state) => ({
      sessions: updateSessionExercise(state.sessions, sessionId, exerciseId, (sets) =>
        sets.filter((item) => item.id !== setId),
      ),
    })),

  finishSession: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId ? { ...session, completed: true } : session,
      ),
    })),

  deleteSession: (sessionId) =>
    set((state) => ({ sessions: state.sessions.filter((session) => session.id !== sessionId) })),
});
