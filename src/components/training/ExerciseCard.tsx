import { History, Plus } from 'lucide-react';
import type { Exercise, ExerciseSet, UnitSystem } from '../../types';
import { formatRepRange } from '../../utils/routine';
import { formatShortDate } from '../../utils/date';
import { formatNumber, formatWeight, weightUnitLabel } from '../../utils/units';
import { DEFAULT_RPE, type PreviousExerciseData } from '../../utils/workout';
import { cardClass, secondaryButtonClass } from '../ui/styles';
import { ExerciseTypeBadge } from './ExerciseTypeBadge';
import { SetRow } from './SetRow';

interface ExerciseCardProps {
  exercise: Exercise | undefined;
  sets: ExerciseSet[];
  /** Plan snapshot stored on the session when it started. */
  target: { sets: number; repMin: number; repMax: number } | undefined;
  previous: PreviousExerciseData | null;
  unit: UnitSystem;
  onAddSet: (set: Omit<ExerciseSet, 'id'>) => void;
  onUpdateSet: (setId: string, patch: Partial<Omit<ExerciseSet, 'id'>>) => void;
  onDeleteSet: (setId: string) => void;
}

export function ExerciseCard({
  exercise,
  sets,
  target,
  previous,
  unit,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
}: ExerciseCardProps) {
  /** New sets copy the matching previous-session set, then the last set logged today. */
  const handleAddSet = () => {
    const template =
      previous?.sets[sets.length] ?? sets[sets.length - 1] ?? previous?.sets[previous.sets.length - 1];
    if (template) {
      onAddSet({ weightKg: template.weightKg, reps: template.reps, rpe: template.rpe });
    } else {
      onAddSet({ weightKg: 0, reps: target ? target.repMin : 8, rpe: DEFAULT_RPE });
    }
  };

  return (
    <section className={cardClass}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{exercise?.name ?? 'Unknown exercise'}</h3>
          <p className="text-xs text-slate-500">
            {exercise?.muscleGroup}
            {target && ` | Target ${target.sets} x ${formatRepRange(target.repMin, target.repMax)}`}
          </p>
        </div>
        {exercise && <ExerciseTypeBadge type={exercise.type} />}
      </div>

      <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2 text-xs">
        <p className="mb-1 flex items-center gap-1 font-semibold text-slate-600">
          <History className="h-3.5 w-3.5" />
          Previous session{previous ? `: ${formatShortDate(previous.date)}` : ''}
        </p>
        {previous ? (
          <ul className="space-y-0.5 tabular-nums text-slate-600">
            {previous.sets.map((set, index) => (
              <li key={set.id}>
                Set {index + 1}: {formatWeight(set.weightKg, unit)} x {set.reps} @ RPE {formatNumber(set.rpe, 1)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500">No previous data</p>
        )}
      </div>

      {sets.length > 0 && (
        <div className="mb-2 grid grid-cols-[1.5rem_1fr_1fr_1fr_2.25rem] items-center gap-2 px-0.5 text-[11px] font-medium uppercase text-slate-500">
          <span>Set</span>
          <span>{weightUnitLabel(unit)}</span>
          <span>Reps</span>
          <span>RPE</span>
          <span className="sr-only">Delete</span>
        </div>
      )}
      <div className="space-y-2">
        {sets.map((set, index) => (
          <SetRow
            key={`${set.id}-${unit}`}
            index={index}
            set={set}
            unit={unit}
            onChange={(patch) => onUpdateSet(set.id, patch)}
            onDelete={() => onDeleteSet(set.id)}
          />
        ))}
      </div>

      <button type="button" className={`${secondaryButtonClass} mt-3 w-full py-2`} onClick={handleAddSet}>
        <Plus className="h-4 w-4" />
        Add set
      </button>
    </section>
  );
}
