import { useMemo, useState } from 'react';
import { Beef, ChevronRight, Clock, Flame, Pencil, Plus, Sparkles, Trash2, Utensils } from 'lucide-react';
import { useToday } from '../../hooks/useToday';
import { useAppStore } from '../../store';
import type { MealEntry } from '../../types';
import { formatLongDate, formatTime } from '../../utils/date';
import { formatAmount } from '../../utils/measure';
import { sumEntries } from '../../utils/nutrition';
import { formatNumber } from '../../utils/units';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ProgressRing } from '../ui/ProgressRing';
import { badgeClass, cardClass, iconButtonClass, primaryButtonClass, secondaryButtonClass } from '../ui/styles';
import { EditEntryModal } from './EditEntryModal';
import { LogFoodModal } from './LogFoodModal';
import { MealSuggesterModal } from './MealSuggesterModal';

const NO_ENTRIES: MealEntry[] = [];

export function TodayView() {
  const today = useToday();
  const targets = useAppStore((state) => state.targets);
  const goal = useAppStore((state) => state.nutritionSettings?.goal ?? 'cutting');
  const log = useAppStore((state) => state.logs[today]);
  const deleteEntry = useAppStore((state) => state.deleteEntry);

  const [logOpen, setLogOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [editing, setEditing] = useState<MealEntry | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const entries = log?.entries ?? NO_ENTRIES;
  const totals = useMemo(() => sumEntries(entries), [entries]);
  const calorieTarget = targets?.calories ?? 0;
  const proteinTarget = targets?.proteinG ?? 0;
  const remainingCalories = Math.max(0, calorieTarget - totals.calories);
  const remainingProtein = Math.max(0, proteinTarget - totals.proteinG);

  const [pendingDelete, setPendingDelete] = useState<MealEntry | null>(null);

  const toggleExpanded = (entryId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });

  return (
    <div className="space-y-4">
      <section className={cardClass}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Today</p>
            <p className="text-sm font-semibold text-slate-900">{formatLongDate(today)}</p>
          </div>
          <span className={`${badgeClass} bg-emerald-50 text-emerald-700`}>
            {goal === 'cutting' ? 'Cutting' : 'Bulking'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ProgressRing
            label="Calories"
            consumed={totals.calories}
            target={calorieTarget}
            unit="kcal"
            icon={Flame}
            tone="emerald"
          />
          <ProgressRing
            label="Protein"
            consumed={totals.proteinG}
            target={proteinTarget}
            unit="g"
            icon={Beef}
            tone="sky"
            decimals={1}
          />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" className={primaryButtonClass} onClick={() => setLogOpen(true)}>
          <Plus className="h-4 w-4" />
          Log food
        </button>
        <button type="button" className={secondaryButtonClass} onClick={() => setSuggestOpen(true)}>
          <Sparkles className="h-4 w-4 text-emerald-600" />
          Suggest meal
        </button>
      </div>

      <section className={cardClass}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Logged today</h2>
          <span className="text-xs text-slate-500">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Utensils className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">Nothing logged yet today.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {entries.map((entry) => {
              const ingredients = entry.ingredients ?? [];
              const hasIngredients = ingredients.length > 0;
              const isExpanded = expanded.has(entry.id);
              const details = (
                <>
                  <p className="flex items-center gap-1 truncate text-sm font-medium text-slate-900">
                    {hasIngredients && (
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 text-slate-400 transition ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    )}
                    <span className="truncate">{entry.name}</span>
                  </p>
                  <p className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    {formatTime(entry.timestamp)}
                    {formatAmount(entry) && (
                      <>
                        <span aria-hidden="true">|</span>
                        {formatAmount(entry)}
                      </>
                    )}
                    {hasIngredients && (
                      <>
                        <span aria-hidden="true">|</span>
                        {ingredients.length} ingredients
                      </>
                    )}
                  </p>
                </>
              );
              return (
                <li key={entry.id} className="py-2.5">
                  <div className="flex items-center gap-2">
                    {hasIngredients ? (
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => toggleExpanded(entry.id)}
                        aria-expanded={isExpanded}
                        aria-label={`${entry.name}, ${isExpanded ? 'hide' : 'show'} ingredients`}
                      >
                        {details}
                      </button>
                    ) : (
                      <div className="min-w-0 flex-1">{details}</div>
                    )}
                    <div className="text-right text-xs tabular-nums">
                      <p className="font-semibold text-slate-900">{entry.calories} kcal</p>
                      <p className="text-slate-500">{formatNumber(entry.proteinG, 1)} g protein</p>
                    </div>
                    <button
                      type="button"
                      className={iconButtonClass}
                      onClick={() => setEditing(entry)}
                      aria-label={`Edit ${entry.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className={`${iconButtonClass} hover:bg-red-50 hover:text-red-600`}
                      onClick={() => setPendingDelete(entry)}
                      aria-label={`Delete ${entry.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {hasIngredients && isExpanded && (
                    <ul className="ml-5 mt-2 space-y-1 border-l-2 border-slate-100 pl-3">
                      {ingredients.map((ingredient, index) => (
                        <li
                          key={`${ingredient.name}-${index}`}
                          className="flex justify-between gap-2 text-xs tabular-nums text-slate-600"
                        >
                          <span className="min-w-0 truncate">
                            {[formatAmount(ingredient), ingredient.name].filter(Boolean).join(' ')}
                          </span>
                          <span className="shrink-0">
                            {ingredient.calories} kcal | {formatNumber(ingredient.proteinG, 1)} g
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {logOpen && <LogFoodModal date={today} onClose={() => setLogOpen(false)} />}
      {suggestOpen && (
        <MealSuggesterModal
          date={today}
          goal={goal}
          remainingCalories={remainingCalories}
          remainingProteinG={remainingProtein}
          onClose={() => setSuggestOpen(false)}
        />
      )}
      {editing && <EditEntryModal date={today} entry={editing} onClose={() => setEditing(null)} />}
      {pendingDelete && (
        <ConfirmDialog
          title="Delete entry"
          message={`Delete "${pendingDelete.name}" from today's log?`}
          confirmLabel="Delete"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            deleteEntry(today, pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}
