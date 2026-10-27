import { useMemo, useState } from 'react';
import { ChevronRight, Dumbbell, Search, X } from 'lucide-react';
import { MUSCLE_GROUPS } from '../../data/exercises';
import { useAppStore } from '../../store';
import type { Exercise, ExerciseType, MuscleGroup } from '../../types';
import { Modal } from '../ui/Modal';
import { cardClass } from '../ui/styles';
import { ExerciseTypeBadge } from './ExerciseTypeBadge';

const TYPE_SECTIONS: { type: ExerciseType; label: string }[] = [
  { type: 'compound', label: 'Compound' },
  { type: 'isolation', label: 'Isolation' },
];

function exerciseCount(count: number): string {
  return count === 1 ? '1 exercise' : `${count} exercises`;
}

/** Search results show the muscle group and type; the popup groups by type instead. */
function ExerciseRows({ items, details = false }: { items: Exercise[]; details?: boolean }) {
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((exercise) => (
        <li key={exercise.id} className="flex items-center justify-between gap-2 py-2.5">
          <span className="min-w-0">
            <span className="block text-sm text-slate-800">{exercise.name}</span>
            {details && <span className="block text-xs text-slate-500">{exercise.muscleGroup}</span>}
          </span>
          {details && <ExerciseTypeBadge type={exercise.type} />}
        </li>
      ))}
    </ul>
  );
}

/** Popup listing one muscle group's exercises, compound first. */
function MuscleGroupModal({ group, items, onClose }: { group: MuscleGroup; items: Exercise[]; onClose: () => void }) {
  return (
    <Modal title={group} onClose={onClose}>
      <div className="space-y-5">
        {TYPE_SECTIONS.map(({ type, label }) => {
          const sectionItems = items.filter((exercise) => exercise.type === type);
          if (sectionItems.length === 0) return null;
          return (
            <section key={type}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label} <span className="font-normal normal-case tracking-normal">({sectionItems.length})</span>
              </h3>
              <ExerciseRows items={sectionItems} />
            </section>
          );
        })}
      </div>
    </Modal>
  );
}

export function ExerciseLibrary() {
  const exercises = useAppStore((state) => state.exercises);
  const [openGroup, setOpenGroup] = useState<MuscleGroup | null>(null);
  const [query, setQuery] = useState('');

  const byGroup = useMemo(() => {
    const map = new Map<MuscleGroup, Exercise[]>();
    for (const group of MUSCLE_GROUPS) map.set(group, []);
    for (const exercise of exercises) map.get(exercise.muscleGroup)?.push(exercise);
    return map;
  }, [exercises]);

  const needle = query.trim().toLowerCase();
  const results = useMemo(
    () => (needle === '' ? [] : exercises.filter((exercise) => exercise.name.toLowerCase().includes(needle))),
    [exercises, needle],
  );

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-emerald-500">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          className="w-full min-w-0 bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
          placeholder="Search all exercises"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search all exercises"
        />
        {query !== '' && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="shrink-0 rounded-md p-1 text-slate-400 hover:text-slate-700"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </label>

      {needle !== '' ? (
        results.length === 0 ? (
          <div className={`${cardClass} flex flex-col items-center gap-2 py-8 text-center`}>
            <Dumbbell className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">No exercises match your search.</p>
          </div>
        ) : (
          <section className={cardClass}>
            <p className="mb-1 text-xs text-slate-500">{exerciseCount(results.length)} found</p>
            <ExerciseRows items={results} details />
          </section>
        )
      ) : (
        <ul className="space-y-2" aria-label="Muscle groups">
          {MUSCLE_GROUPS.map((group) => {
            const count = byGroup.get(group)?.length ?? 0;
            return (
              <li key={group}>
                <button
                  type="button"
                  onClick={() => setOpenGroup(group)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3.5 text-left shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <span className="text-base font-semibold text-slate-900">{group}</span>
                  <span className="flex items-center gap-2 text-xs text-slate-500">
                    {exerciseCount(count)}
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {openGroup && (
        <MuscleGroupModal group={openGroup} items={byGroup.get(openGroup) ?? []} onClose={() => setOpenGroup(null)} />
      )}
    </div>
  );
}
