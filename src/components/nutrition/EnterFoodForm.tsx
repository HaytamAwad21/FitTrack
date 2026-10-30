import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '../../store';
import { useToastStore } from '../../store/toastStore';
import type { FoodIngredient, FoodItem, FoodNutrition, MealIngredient } from '../../types';
import {
  duplicateSignature,
  findDuplicateFood,
  formatFoodName,
  nextAvailableName,
  type DuplicateChoice,
} from '../../utils/foodNames';
import { mealAmount } from '../../utils/entryUpdates';
import {
  createIngredientDraft,
  portionToIngredient,
  resolveIngredientDraft,
  type IngredientDraft,
} from '../../utils/ingredientDraft';
import { basisOf, servingMeasure } from '../../utils/measure';
import { buildEntryFromFood, computePortion, type Portion } from '../../utils/nutrition';
import { parseQuantity } from '../../utils/portion';
import { formatNumber, roundTo } from '../../utils/units';
import { TextField } from '../ui/TextField';
import { secondaryButtonClass } from '../ui/styles';
import { DuplicateWarning } from './DuplicateWarning';
import { IngredientEditor } from './IngredientEditor';

interface EnterFoodFormProps {
  /** Id of the form element, so a submit button outside the form can target it. */
  formId: string;
  date: string;
  onLogged: () => void;
}

interface ChoiceRecord {
  choice: DuplicateChoice;
  /** Meal name the choice was made for; a changed name invalidates the choice. */
  signature: string;
}

/** Nutrition plus the composite fields a saved meal carries. */
type MealFoodData = FoodNutrition & { isComposite: true; ingredients: FoodIngredient[] };

/** The "added to library" message, or null when nothing new was added. */
function addedMessage(added: FoodItem[]): string | null {
  if (added.length === 0) return null;
  return added.length === 1 ? `Added ${formatFoodName(added[0])} to library` : `Added ${added.length} foods to library`;
}

/** Logs one food or a multi-ingredient meal. New foods join the library automatically. */
export function EnterFoodForm({ formId, date, onLogged }: EnterFoodFormProps) {
  const foods = useAppStore((state) => state.foods);
  const addFood = useAppStore((state) => state.addFood);
  const replaceFood = useAppStore((state) => state.replaceFood);
  const deleteFood = useAppStore((state) => state.deleteFood);
  const addEntries = useAppStore((state) => state.addEntries);
  const showToast = useToastStore((state) => state.showToast);

  const [rows, setRows] = useState<IngredientDraft[]>(() => [createIngredientDraft()]);
  const [mealName, setMealName] = useState('');
  const [saveAsMeal, setSaveAsMeal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mealChoice, setMealChoice] = useState<ChoiceRecord | null>(null);

  const isMulti = rows.length > 1;
  const trimmedMealName = mealName.trim();
  const resolved = rows.map((row) => resolveIngredientDraft(row, foods));

  const willSaveMeal = isMulti && saveAsMeal;
  const mealSignature = duplicateSignature(trimmedMealName, 'n/a');
  const mealDuplicate = willSaveMeal ? findDuplicateFood(foods, trimmedMealName, 'n/a') : undefined;
  const chosen = mealChoice?.signature === mealSignature ? mealChoice.choice : undefined;
  const hasUnresolvedDuplicate = Boolean(mealDuplicate) && !chosen;

  const totals = resolved.reduce(
    (acc, item) =>
      item.portion
        ? {
            grams: acc.grams + item.portion.grams,
            calories: acc.calories + item.portion.calories,
            proteinG: roundTo(acc.proteinG + item.portion.proteinG, 1),
            unknownWeight: acc.unknownWeight || item.portion.grams === 0,
          }
        : acc,
    { grams: 0, calories: 0, proteinG: 0, unknownWeight: false },
  );

  const replaceRow = (next: IngredientDraft) =>
    setRows((prev) => prev.map((row) => (row.key === next.key ? next : row)));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (isMulti && trimmedMealName === '') return;
    const valid = resolved.flatMap((item) => (item.portion ? [{ ...item, portion: item.portion }] : []));
    if (valid.length !== resolved.length) return;
    if (hasUnresolvedDuplicate) return;

    // Working copy of the library, so a name typed twice in one meal is added only once.
    let library = [...foods];
    const added: FoodItem[] = [];
    const logged = valid.map((item): { food: FoodItem; portion: Portion; item: (typeof valid)[number] } => {
      if (item.food) return { food: item.food, portion: item.portion, item };
      const amount = parseQuantity(item.measure, item.row.quantity).amount;
      const existing = findDuplicateFood(library, item.name, item.row.state);
      if (existing) {
        const portion = amount ? computePortion(basisOf(existing), amount) : null;
        return { food: existing, portion: portion ?? item.portion, item };
      }
      const food = addFood({ ...(item.nutrition as FoodNutrition), name: item.name, state: item.row.state });
      library = [...library, food];
      added.push(food);
      return { food, portion: item.portion, item };
    });

    if (!isMulti) {
      const [{ food, portion, item }] = logged;
      const amount = parseQuantity(item.measure, item.row.quantity).amount;
      addEntries(date, [
        (amount ? buildEntryFromFood(food, amount, library) : null) ?? {
          foodId: food.id,
          name: formatFoodName(food),
          grams: portion.grams,
          quantity: portion.quantity,
          unit: portion.unit,
          unitPlural: portion.unitPlural,
          calories: portion.calories,
          proteinG: portion.proteinG,
          fiberG: portion.fiberG,
        },
      ]);
    } else {
      const ingredients: MealIngredient[] = logged.map(({ food, portion }) =>
        portionToIngredient(portion, formatFoodName(food), food.id),
      );
      const amount = mealAmount(ingredients);
      const totalCalories = logged.reduce((sum, { portion }) => sum + portion.calories, 0);
      const totalProtein = roundTo(
        logged.reduce((sum, { portion }) => sum + portion.proteinG, 0),
        1,
      );
      const hasFiber = logged.some(({ portion }) => portion.fiberG !== undefined);
      const totalFiber = hasFiber
        ? roundTo(
            logged.reduce((sum, { portion }) => sum + (portion.fiberG ?? 0), 0),
            1,
          )
        : undefined;

      let mealFood: FoodItem | undefined;
      if (willSaveMeal) {
        // With every weight known the meal is stored per 100 g; otherwise one serving is the whole meal.
        const nutrition: FoodNutrition =
          amount.grams > 0
            ? {
                measure: { kind: 'weight' },
                caloriesPer100g: Math.round((totalCalories / amount.grams) * 100),
                proteinPer100g: roundTo((totalProtein / amount.grams) * 100, 1),
                fiberPer100g: totalFiber === undefined ? undefined : roundTo((totalFiber / amount.grams) * 100, 1),
              }
            : {
                measure: servingMeasure('serving'),
                caloriesPerServing: totalCalories,
                proteinPerServing: totalProtein,
                fiberPerServing: totalFiber,
              };
        const data: MealFoodData = {
          ...nutrition,
          isComposite: true,
          ingredients: ingredients.map(({ foodId, name, grams, quantity, unit }) => ({
            foodId: foodId ?? undefined,
            name,
            grams,
            quantity,
            unit,
          })),
        };
        const existing = findDuplicateFood(library, trimmedMealName, 'n/a');
        if (existing && chosen === 'replace') {
          const replacement = { ...data, name: trimmedMealName, state: 'n/a' as const };
          replaceFood(existing.id, replacement);
          mealFood = { ...replacement, id: existing.id };
        } else {
          const name = existing ? nextAvailableName(library, trimmedMealName, 'n/a') : trimmedMealName;
          mealFood = addFood({ ...data, name, state: 'n/a' });
        }
      }

      addEntries(date, [
        {
          foodId: mealFood?.id,
          name: mealFood ? formatFoodName(mealFood) : trimmedMealName,
          ...amount,
          calories: totalCalories,
          proteinG: totalProtein,
          fiberG: totalFiber,
          ingredients,
        },
      ]);
    }

    const message = addedMessage(added);
    if (message) {
      showToast({
        message,
        actionLabel: 'Undo',
        onAction: () => added.forEach((food) => deleteFood(food.id)),
      });
    }
    onLogged();
  };

  return (
    <form id={formId} onSubmit={handleSubmit} noValidate className="min-h-[22rem] space-y-3">
      {isMulti && (
        <TextField
          label="Meal name"
          value={mealName}
          placeholder="Oatmeal"
          onChange={(event) => setMealName(event.target.value)}
          error={submitted && trimmedMealName === '' ? 'Enter a meal name' : undefined}
        />
      )}

      {resolved.map((item, index) => (
        <IngredientEditor
          key={item.row.key}
          item={item}
          foods={foods}
          label={isMulti ? `Ingredient ${index + 1}` : 'Food'}
          submitted={submitted}
          onChange={replaceRow}
          onRemove={isMulti ? () => setRows((prev) => prev.filter((row) => row.key !== item.row.key)) : undefined}
          showState
        />
      ))}

      <button
        type="button"
        className={`${secondaryButtonClass} w-full py-2`}
        onClick={() => setRows((prev) => [...prev, createIngredientDraft()])}
      >
        <Plus className="h-4 w-4" />
        Add ingredient
      </button>

      {isMulti && (
        <>
          <div
            className="grid grid-cols-3 gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-center ring-1 ring-emerald-200"
            aria-live="polite"
          >
            <div>
              <p className="text-[11px] font-medium uppercase text-emerald-700">Total</p>
              <p className="text-sm font-bold tabular-nums text-emerald-950">{totals.grams} g</p>
              {totals.unknownWeight && <p className="text-[10px] text-emerald-700">plus items without weight</p>}
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase text-emerald-700">Calories</p>
              <p className="text-sm font-bold tabular-nums text-emerald-950">{totals.calories} kcal</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase text-emerald-700">Protein</p>
              <p className="text-sm font-bold tabular-nums text-emerald-950">{formatNumber(totals.proteinG, 1)} g</p>
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-600"
              checked={saveAsMeal}
              onChange={(event) => setSaveAsMeal(event.target.checked)}
            />
            <span>
              Save as meal
              <span className="block text-xs text-slate-500">Adds the whole meal to your library to log again.</span>
            </span>
          </label>

          {mealDuplicate && (
            <DuplicateWarning
              existingName={formatFoodName(mealDuplicate)}
              newName={nextAvailableName(foods, trimmedMealName, 'n/a')}
              choice={chosen}
              onReplace={() => setMealChoice({ choice: 'replace', signature: mealSignature })}
              onSaveAsNew={() => setMealChoice({ choice: 'new', signature: mealSignature })}
            />
          )}
        </>
      )}

      {submitted && hasUnresolvedDuplicate && (
        <p className="text-xs text-red-600" role="alert">
          Choose Replace existing or Save as new for the meal name.
        </p>
      )}
    </form>
  );
}
