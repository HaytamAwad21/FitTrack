import { CheckCircle2, Clock, Dumbbell, Eye, Moon, Play } from 'lucide-react';
import type { Exercise, WorkoutSession, WorkoutType } from '../../types';
import { formatLongDate } from '../../utils/date';
import { formatRepRange, sortedExercises } from '../../utils/routine';
import { countSessionSets } from '../../utils/workout';
import { badgeClass, cardClass, primaryButtonClass, secondaryButtonClass } from '../ui/styles';
import { ExerciseTypeBadge } from './ExerciseTypeBadge';

interface DayDetailProps {
  date: string;
  today: string;
  /** Workout assigned to this weekday, or null on a rest day. */
  workout: WorkoutType | null;
  session: WorkoutSession | null;
  exercisesById: Map<string, Exercise>;
  onStart: () => void;
  onOpenSession: (sessionId: string) => void;
}

export function DayDetail({
  date,
  today,
  workout,
  session,
  exercisesById,
  onStart,
  onOpenSession,
}: DayDetailProps) {
  const isFuture = date > today;
  const relativeLabel = date === today ? 'Today' : isFuture ? 'Upcoming' : 'Past';

  return (
    <section className={cardClass}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{formatLongDate(date)}</p>
          <h2 className="text-lg font-bold text-slate-900">{workout ? workout.name : 'Rest day'}</h2>
        </div>
        <span
          className={`${badgeClass} ${
            date === today ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {relativeLabel}
        </span>
      </div>

      {workout ? (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {workout.muscleGroups.map((group) => (
              <span key={group} className={`${badgeClass} bg-slate-100 text-slate-700`}>
                {group}
              </span>
            ))}
          </div>
          <ol className="mb-4 divide-y divide-slate-100">
            {workout.exercises.length === 0 && (
              <li className="py-3 text-sm text-slate-500">No exercises yet. Add some in Training settings.</li>
            )}
            {sortedExercises(workout).map((target, index) => {
              const exercise = exercisesById.get(target.exerciseId);
              return (
                <li key={target.exerciseId} className="flex items-center gap-3 py-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {exercise?.name ?? 'Unknown exercise'}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      {exercise?.muscleGroup}
                      {exercise && <ExerciseTypeBadge type={exercise.type} />}
                    </p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-right text-sm font-semibold tabular-nums text-slate-700">
                    {target.sets} x {formatRepRange(target.repMin, target.repMax)}
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        !session && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Moon className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">No training scheduled. Recovery is part of the plan.</p>
          </div>
        )
      )}

      {session ? (
        <div className="space-y-3">
          <div
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
              session.completed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
            }`}
          >
            {session.completed ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            <span className="font-medium">
              {session.completed ? 'Completed' : 'In progress'}: {session.workoutName}
            </span>
            <span className="ml-auto text-xs tabular-nums">{countSessionSets(session)} sets</span>
          </div>
          <button
            type="button"
            className={`${session.completed ? secondaryButtonClass : primaryButtonClass} w-full`}
            onClick={() => onOpenSession(session.id)}
          >
            {session.completed ? <Eye className="h-4 w-4" /> : <Dumbbell className="h-4 w-4" />}
            {session.completed ? 'View or edit session' : 'Continue workout'}
          </button>
        </div>
      ) : (
        workout && (
          <div className="space-y-2">
            <button type="button" className={`${primaryButtonClass} w-full`} onClick={onStart} disabled={isFuture}>
              <Play className="h-4 w-4" />
              Start workout
            </button>
            {isFuture && (
              <p className="text-center text-xs text-slate-500">You can start this workout on the day.</p>
            )}
          </div>
        )
      )}
    </section>
  );
}
