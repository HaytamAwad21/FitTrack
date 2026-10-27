import type { ExerciseSet, WorkoutSession } from '../types';

/** RPE values from 1 to 10 in 0.5 steps. */
export const RPE_OPTIONS: number[] = Array.from({ length: 19 }, (_, index) => 1 + index * 0.5);

export const DEFAULT_RPE = 7;

export interface PreviousExerciseData {
  date: string;
  sets: ExerciseSet[];
}

/**
 * Returns the sets from the most recent session before `beforeDate` that
 * logged at least one set of the exercise.
 */
export function findPreviousExerciseSets(
  sessions: WorkoutSession[],
  exerciseId: string,
  beforeDate: string,
  excludeSessionId?: string,
): PreviousExerciseData | null {
  let best: PreviousExerciseData | null = null;
  for (const session of sessions) {
    if (session.id === excludeSessionId || session.date >= beforeDate) continue;
    const entry = session.exercises.find((exercise) => exercise.exerciseId === exerciseId);
    if (!entry || entry.sets.length === 0) continue;
    if (best === null || session.date > best.date) {
      best = { date: session.date, sets: entry.sets };
    }
  }
  return best;
}

/** Returns the lower bound of a rep range such as "6-8". */
export function parseRepTarget(target: string): number {
  const match = target.match(/\d+/);
  return match ? Number(match[0]) : 8;
}

export function countSessionSets(session: WorkoutSession): number {
  return session.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
}

export function isValidRpe(value: number): boolean {
  return value >= 1 && value <= 10 && Number.isInteger(value * 2);
}
