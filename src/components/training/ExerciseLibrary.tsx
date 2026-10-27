import { useMemo, useState } from 'react';
import { Dumbbell, Search } from 'lucide-react';
import { MUSCLE_GROUPS } from '../../data/exercises';
import { useAppStore } from '../../store';
import type { MuscleGroup } from '../../types';
import { cardClass } from '../ui/styles';
import { ExerciseTypeBadge } from './ExerciseTypeBadge';

type GroupFilter = MuscleGroup | 'All';

export function ExerciseLibrary() {
  const exercises = useAppStore((state) => state.exercises);
  const [group, setGroup] = useState<GroupFilter>('All');
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return MUSCLE_GROUPS.filter((g) => group === 'All' || g === group)
      .map((g) => ({
        group: g,
        items: exercises.filter(
          (e) => e.muscleGroup === g && (needle === '' || e.name.toLowerCase().includes(needle)),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [exercises, group, query]);

  const filters: GroupFilter[] = ['All', ...MUSCLE_GROUPS];

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-emerald-500">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
          placeholder="Search exercises"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search exercises"
        />
      </label>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="radiogroup" aria-label="Muscle group">
        {filters.map((filter) => {
          const active = filter === group;
          return (
            <button
              key={filter}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setGroup(filter)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {grouped.length === 0 ? (
        <div className={`${cardClass} flex flex-col items-center gap-2 py-8 text-center`}>
          <Dumbbell className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">No exercises match your search.</p>
        </div>
      ) : (
        grouped.map((section) => (
          <section key={section.group} className={cardClass}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">{section.group}</h2>
              <span className="text-xs text-slate-500">{section.items.length} exercises</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {section.items.map((exercise) => (
                <li key={exercise.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="text-sm text-slate-800">{exercise.name}</span>
                  <ExerciseTypeBadge type={exercise.type} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
