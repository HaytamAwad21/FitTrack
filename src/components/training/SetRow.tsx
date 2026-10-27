import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { ExerciseSet, UnitSystem } from '../../types';
import { formatNumber, roundTo, weightFromDisplay, weightToDisplay, weightUnitLabel } from '../../utils/units';
import { parseNumber } from '../../utils/validation';
import { RPE_OPTIONS } from '../../utils/workout';
import { iconButtonClass } from '../ui/styles';

interface SetRowProps {
  index: number;
  set: ExerciseSet;
  unit: UnitSystem;
  onChange: (patch: Partial<Omit<ExerciseSet, 'id'>>) => void;
  onDelete: () => void;
}

const MAX_WEIGHT_DISPLAY = 2000;
const MAX_REPS = 100;

const inputBase =
  'w-full min-w-0 rounded-lg border bg-white px-2 py-1.5 text-sm tabular-nums text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200';

/** Inline editor for one set. Keeps raw text locally so partial input like "62." is not lost. */
export function SetRow({ index, set, unit, onChange, onDelete }: SetRowProps) {
  const [weight, setWeight] = useState(() => formatNumber(weightToDisplay(set.weightKg, unit), 2));
  const [reps, setReps] = useState(() => String(set.reps));

  const weightValue = parseNumber(weight);
  const weightInvalid = weightValue === null || weightValue < 0 || weightValue > MAX_WEIGHT_DISPLAY;
  const repsValue = parseNumber(reps);
  const repsInvalid = repsValue === null || !Number.isInteger(repsValue) || repsValue < 0 || repsValue > MAX_REPS;

  const handleWeightChange = (text: string) => {
    setWeight(text);
    const value = parseNumber(text);
    if (value !== null && value >= 0 && value <= MAX_WEIGHT_DISPLAY) {
      onChange({ weightKg: roundTo(weightFromDisplay(value, unit), 3) });
    }
  };

  const handleRepsChange = (text: string) => {
    setReps(text);
    const value = parseNumber(text);
    if (value !== null && Number.isInteger(value) && value >= 0 && value <= MAX_REPS) {
      onChange({ reps: value });
    }
  };

  return (
    <div className="grid grid-cols-[1.5rem_1fr_1fr_1fr_2.25rem] items-center gap-2">
      <span className="text-center text-sm font-semibold text-slate-500">{index + 1}</span>
      <input
        className={`${inputBase} ${weightInvalid ? 'border-red-400' : 'border-slate-200'}`}
        inputMode="decimal"
        value={weight}
        onChange={(event) => handleWeightChange(event.target.value)}
        aria-label={`Set ${index + 1} weight in ${weightUnitLabel(unit)}`}
        aria-invalid={weightInvalid || undefined}
      />
      <input
        className={`${inputBase} ${repsInvalid ? 'border-red-400' : 'border-slate-200'}`}
        inputMode="numeric"
        value={reps}
        onChange={(event) => handleRepsChange(event.target.value)}
        aria-label={`Set ${index + 1} reps`}
        aria-invalid={repsInvalid || undefined}
      />
      <select
        className={`${inputBase} border-slate-200 px-1`}
        value={String(set.rpe)}
        onChange={(event) => onChange({ rpe: Number(event.target.value) })}
        aria-label={`Set ${index + 1} RPE`}
      >
        {RPE_OPTIONS.map((rpe) => (
          <option key={rpe} value={String(rpe)}>
            {formatNumber(rpe, 1)}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={`${iconButtonClass} hover:bg-red-50 hover:text-red-600`}
        onClick={onDelete}
        aria-label={`Delete set ${index + 1}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
