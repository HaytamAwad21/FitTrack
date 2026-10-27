import { useState } from 'react';
import { AlertTriangle, ChevronRight, Copy, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useAppStore } from '../../../store';
import type { TrainingSettings, WorkoutType } from '../../../types';
import { WEEKDAY_SHORT } from '../../../utils/date';
import { assignedWeekdays, findWorkoutNameConflict, totalSets } from '../../../utils/routine';
import { badgeClass, dangerButtonClass, iconButtonClass, primaryButtonClass, secondaryButtonClass } from '../../ui/styles';

interface WorkoutListProps {
  settings: TrainingSettings;
  onEdit: (id: string) => void;
}

/** What a card is showing below its summary. */
type CardMode =
  | { kind: 'menu' }
  | { kind: 'rename'; text: string }
  | { kind: 'confirmDelete' }
  | { kind: 'blocked'; message: string };

export function WorkoutList({ settings, onEdit }: WorkoutListProps) {
  const updateWorkout = useAppStore((state) => state.updateWorkout);
  const duplicateWorkout = useAppStore((state) => state.duplicateWorkout);
  const deleteWorkout = useAppStore((state) => state.deleteWorkout);
  const [modes, setModes] = useState<Record<string, CardMode | undefined>>({});
  const workouts = settings.routine.workoutTypes;

  const setMode = (id: string, mode: CardMode | undefined) => setModes((prev) => ({ ...prev, [id]: mode }));

  const handleDelete = (workout: WorkoutType) => {
    const days = assignedWeekdays(settings, workout.id);
    if (days.length > 0) {
      const result = deleteWorkout(workout.id);
      setMode(workout.id, { kind: 'blocked', message: result.ok ? '' : result.message });
      return;
    }
    setMode(workout.id, { kind: 'confirmDelete' });
  };

  return (
    <ul className="space-y-2">
      {workouts.map((workout) => {
        const mode = modes[workout.id];
        const days = assignedWeekdays(settings, workout.id);
        const renameConflict =
          mode?.kind === 'rename' ? findWorkoutNameConflict(workouts, mode.text, workout.id) : undefined;
        const renameValid = mode?.kind === 'rename' && mode.text.trim() !== '' && !renameConflict;
        return (
          <li key={workout.id} className="rounded-xl ring-1 ring-slate-200">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-l-xl px-3 py-2.5 text-left hover:bg-slate-50"
                onClick={() => onEdit(workout.id)}
                aria-label={`Edit ${workout.name}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-slate-900">{workout.name}</span>
                    {workout.isBuiltIn && <span className={`${badgeClass} bg-slate-100 text-slate-600`}>Built-in</span>}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'} |{' '}
                    {totalSets(workout)} sets
                    {days.length > 0 && ` | ${days.map((day) => WEEKDAY_SHORT[day]).join(', ')}`}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
              <button
                type="button"
                className={`${iconButtonClass} mr-1`}
                onClick={() => setMode(workout.id, mode?.kind === 'menu' ? undefined : { kind: 'menu' })}
                aria-label={`More options for ${workout.name}`}
                aria-expanded={mode?.kind === 'menu'}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>

            {mode?.kind === 'menu' && (
              <div className="flex gap-2 border-t border-slate-100 px-3 py-2" role="menu" aria-label={`${workout.name} options`}>
                <button
                  type="button"
                  role="menuitem"
                  className={`${secondaryButtonClass} flex-1 px-2 py-1.5 text-xs`}
                  onClick={() => setMode(workout.id, { kind: 'rename', text: workout.name })}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Rename
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`${secondaryButtonClass} flex-1 px-2 py-1.5 text-xs`}
                  onClick={() => {
                    duplicateWorkout(workout.id);
                    setMode(workout.id, undefined);
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`${dangerButtonClass} flex-1 px-2 py-1.5 text-xs`}
                  onClick={() => handleDelete(workout)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            )}

            {mode?.kind === 'rename' && (
              <form
                className="space-y-2 border-t border-slate-100 px-3 py-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!renameValid) return;
                  updateWorkout(workout.id, { name: mode.text });
                  setMode(workout.id, undefined);
                }}
              >
                <input
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                  value={mode.text}
                  onChange={(event) => setMode(workout.id, { kind: 'rename', text: event.target.value })}
                  aria-label={`New name for ${workout.name}`}
                  autoFocus
                />
                {renameConflict && (
                  <p className="flex items-center gap-1 text-xs text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />A workout named &apos;{renameConflict.name}&apos; already exists.
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`${secondaryButtonClass} flex-1 py-1.5 text-xs`}
                    onClick={() => setMode(workout.id, undefined)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={`${primaryButtonClass} flex-1 py-1.5 text-xs`} disabled={!renameValid}>
                    Save name
                  </button>
                </div>
              </form>
            )}

            {mode?.kind === 'confirmDelete' && (
              <div className="space-y-2 border-t border-slate-100 px-3 py-2">
                <p className="text-xs text-slate-700">Delete &apos;{workout.name}&apos;? Past sessions keep their own copy.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`${secondaryButtonClass} flex-1 py-1.5 text-xs`}
                    onClick={() => setMode(workout.id, undefined)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={`${dangerButtonClass} flex-1 py-1.5 text-xs`}
                    onClick={() => {
                      deleteWorkout(workout.id);
                      setMode(workout.id, undefined);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}

            {mode?.kind === 'blocked' && (
              <div className="flex items-start gap-2 border-t border-slate-100 px-3 py-2 text-xs text-amber-800" role="alert">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span className="flex-1">{mode.message}</span>
                <button
                  type="button"
                  className="font-semibold text-amber-800 underline"
                  onClick={() => setMode(workout.id, undefined)}
                >
                  OK
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
