import { useDeferredValue, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronDown, Info, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store';
import type { Goal } from '../../types';
import { bulkingProteinFloor, suggestMeals, type MealSuggestion } from '../../utils/mealSuggester';
import { formatAmount } from '../../utils/measure';
import { formatNumber } from '../../utils/units';
import { parseNumber } from '../../utils/validation';
import { Modal } from '../ui/Modal';
import { TextField } from '../ui/TextField';
import { primaryButtonClass, secondaryButtonClass } from '../ui/styles';

const MIN_LIBRARY_FOODS = 3;
/** Suggestions shown at first and added by each "Show more options" click. */
const PAGE_SIZE = 3;
/** Shortcuts that split the remaining calories into a meal-sized budget. */
const BUDGET_PRESETS = [
  { label: 'All remaining', divisor: 1 },
  { label: 'Half', divisor: 2 },
  { label: 'One third', divisor: 3 },
] as const;

interface MealSuggesterModalProps {
  date: string;
  goal: Goal;
  remainingCalories: number;
  remainingProteinG: number;
  onClose: () => void;
}

export function MealSuggesterModal({
  date,
  goal,
  remainingCalories,
  remainingProteinG,
  onClose,
}: MealSuggesterModalProps) {
  const foods = useAppStore((state) => state.foods);
  const addEntries = useAppStore((state) => state.addEntries);
  const [budgetText, setBudgetText] = useState(String(Math.round(remainingCalories)));
  const deferredBudget = useDeferredValue(budgetText);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const budget = parseNumber(deferredBudget);
  const budgetError =
    parseNumber(budgetText) === null || (parseNumber(budgetText) ?? 0) <= 0
      ? 'Enter a calorie budget greater than 0'
      : undefined;
  const hasEnoughFoods = foods.length >= MIN_LIBRARY_FOODS;

  const suggestions = useMemo<MealSuggestion[]>(() => {
    if (!hasEnoughFoods || budget === null || budget <= 0) return [];
    return suggestMeals({ foods, budget, goal, remainingProteinG });
  }, [foods, budget, goal, remainingProteinG, hasEnoughFoods]);

  const handleLog = (suggestion: MealSuggestion) => {
    addEntries(
      date,
      suggestion.items.map((item) => ({
        foodId: item.foodId,
        name: item.name,
        grams: item.grams,
        quantity: item.quantity,
        unit: item.unit,
        unitPlural: item.unitPlural,
        calories: item.calories,
        proteinG: item.proteinG,
        fiberG: item.fiberG,
      })),
    );
    onClose();
  };

  const strategy =
    goal === 'cutting'
      ? 'Ranked by highest protein per calorie.'
      : `Ranked by closeness to budget, with at least ${formatNumber(bulkingProteinFloor(remainingProteinG), 0)} g protein (25% of remaining).`;

  return (
    <Modal title="Meal suggester" onClose={onClose}>
      {!hasEnoughFoods ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <BookOpen className="h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-600">
            The suggester needs at least {MIN_LIBRARY_FOODS} foods in your library. You have {foods.length}.
            Add more foods in the Food Library to get suggestions.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <TextField
            label="Calorie budget"
            inputMode="numeric"
            suffix="kcal"
            value={budgetText}
            onChange={(event) => {
              setBudgetText(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            error={budgetError}
            hint="Prefilled with your remaining calories for today"
          />
          {remainingCalories > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Budget presets">
              {BUDGET_PRESETS.map((preset) => {
                const value = String(Math.round(remainingCalories / preset.divisor));
                const active = budgetText === value;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setBudgetText(value);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    aria-pressed={active}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      active ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {preset.label} ({value} kcal)
                  </button>
                );
              })}
            </div>
          )}
          <p className="flex items-start gap-1.5 text-xs text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Meals of 2-4 foods with a protein source and a side, within 10% of the budget. Grams go in 10 g
            steps, scoops in halves, and tubs, pieces, bars and cans in whole units.
            Suggestions avoid repeating the same foods. {strategy}
          </p>

          {!budgetError && suggestions.length === 0 && (
            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
              No combinations land within 10% of this budget. Try a different budget or add more foods to your
              library.
            </div>
          )}

          {!budgetError && suggestions.length > 0 && suggestions.length < 3 && (
            <p className="text-xs text-slate-500">
              Only {suggestions.length} {suggestions.length === 1 ? 'combination' : 'combinations'} found. Add more
              foods for more variety.
            </p>
          )}

          {!budgetError && (
            <ol className="space-y-3">
              {suggestions.slice(0, visibleCount).map((suggestion, index) => (
                <li key={suggestion.id} className="rounded-2xl p-4 ring-1 ring-slate-200">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      Option {index + 1}
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-slate-700">
                      {suggestion.totalCalories} kcal | {formatNumber(suggestion.totalProteinG, 1)} g protein
                    </span>
                  </div>
                  <ul className="mb-3 space-y-1">
                    {suggestion.items.map((item) => (
                      <li key={item.foodId} className="flex justify-between gap-2 text-sm">
                        <span className="min-w-0 text-slate-700">
                          <span className="font-medium tabular-nums">{formatAmount(item)}</span> {item.name}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-slate-500">
                          {item.calories} kcal | {formatNumber(item.proteinG, 1)} g
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={`${primaryButtonClass} w-full`}
                    onClick={() => handleLog(suggestion)}
                  >
                    <Check className="h-4 w-4" />
                    Log this meal
                  </button>
                </li>
              ))}
            </ol>
          )}

          {!budgetError && suggestions.length > visibleCount && (
            <button
              type="button"
              className={`${secondaryButtonClass} w-full`}
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              <ChevronDown className="h-4 w-4" />
              Show more options ({suggestions.length - visibleCount} more)
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
