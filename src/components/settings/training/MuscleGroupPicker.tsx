import { MUSCLE_GROUPS } from '../../../data/exercises';
import type { MuscleGroup } from '../../../types';

interface MuscleGroupPickerProps {
  value: MuscleGroup[];
  onChange: (groups: MuscleGroup[]) => void;
  /** Keeps at least one group selected. */
  requireOne?: boolean;
}

/** Multi-select chips for target muscle groups, kept in library order. */
export function MuscleGroupPicker({ value, onChange, requireOne = false }: MuscleGroupPickerProps) {
  const toggle = (group: MuscleGroup) => {
    const selected = value.includes(group);
    if (selected && requireOne && value.length === 1) return;
    const next = selected ? value.filter((item) => item !== group) : [...value, group];
    onChange(MUSCLE_GROUPS.filter((item) => next.includes(item)));
  };

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Muscle groups">
      {MUSCLE_GROUPS.map((group) => {
        const selected = value.includes(group);
        return (
          <button
            key={group}
            type="button"
            onClick={() => toggle(group)}
            aria-pressed={selected}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              selected ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {group}
          </button>
        );
      })}
    </div>
  );
}
