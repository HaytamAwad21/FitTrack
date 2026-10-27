import { useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Layers, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store';
import type { FoodItem } from '../../types';
import { formatFoodName } from '../../utils/foodNames';
import { formatNutritionBasis } from '../../utils/measure';
import { filterFoods } from '../../utils/nutrition';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { badgeClass, cardClass, iconButtonClass, primaryButtonClass } from '../ui/styles';
import { FoodFormModal } from './FoodFormModal';

type EditingState = { mode: 'new' } | { mode: 'edit'; food: FoodItem } | null;

export function FoodLibrary() {
  const foods = useAppStore((state) => state.foods);
  const deleteFood = useAppStore((state) => state.deleteFood);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<EditingState>(null);

  const filtered = useMemo(() => filterFoods(foods, query), [foods, query]);
  const reviewCount = foods.filter((food) => food.needsReview).length;

  const [pendingDelete, setPendingDelete] = useState<FoodItem | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-emerald-500">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
            placeholder="Search library"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search library"
          />
        </label>
        <button type="button" className={primaryButtonClass} onClick={() => setEditing({ mode: 'new' })}>
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {reviewCount > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          {reviewCount} {reviewCount === 1 ? 'food needs' : 'foods need'} review. Values could not be converted to
          per 100 g. Open each flagged food to fix it.
        </div>
      )}

      <section className={cardClass}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Food Library</h2>
          <span className="text-xs text-slate-500">{foods.length} foods</span>
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <BookOpen className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">
              {foods.length === 0 ? 'Your library is empty. Add a food to get started.' : 'No foods match your search.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((food) => (
              <li key={food.id} className="flex items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                    {food.needsReview && (
                      <button
                        type="button"
                        className="shrink-0 rounded p-0.5 text-amber-500 hover:bg-amber-50 hover:text-amber-600"
                        onClick={() => setEditing({ mode: 'edit', food })}
                        aria-label={`Review ${formatFoodName(food)}`}
                        title={food.reviewNote}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </button>
                    )}
                    <span className="truncate">{formatFoodName(food)}</span>
                    {food.isComposite && (
                      <span className={`${badgeClass} shrink-0 bg-indigo-50 text-indigo-700`}>
                        <Layers className="h-3 w-3" />
                        Meal
                      </span>
                    )}
                  </p>
                  <p className="text-xs tabular-nums text-slate-500">{formatNutritionBasis(food)}</p>
                  {food.needsReview && food.suggestedMeasure && (
                    <p className="text-xs text-amber-700">
                      Looks like it should be measured in {food.suggestedMeasure.unitNamePlural}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className={iconButtonClass}
                  onClick={() => setEditing({ mode: 'edit', food })}
                  aria-label={`Edit ${formatFoodName(food)}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={`${iconButtonClass} hover:bg-red-50 hover:text-red-600`}
                  onClick={() => setPendingDelete(food)}
                  aria-label={`Delete ${formatFoodName(food)}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <FoodFormModal
          food={editing.mode === 'edit' ? editing.food : undefined}
          onClose={() => setEditing(null)}
        />
      )}
      {pendingDelete && (
        <ConfirmDialog
          title="Delete food"
          message={`Delete "${formatFoodName(pendingDelete)}" from the library? Logged entries are kept.`}
          confirmLabel="Delete"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            deleteFood(pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}
