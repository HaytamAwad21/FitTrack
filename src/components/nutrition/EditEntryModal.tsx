import { useMemo, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { useAppStore } from '../../store';
import type { FoodItem, MealEntry, MealIngredient } from '../../types';
import {
  createIngredientDraft,
  portionToIngredient,
  resolveIngredientDraft,
  type IngredientDraft,
} from '../../utils/ingredientDraft';
import { WEIGHT_MEASURE, basisOf, formatAmount, type NutritionBasis } from '../../utils/measure';
import { basisFromLogged, computePortion } from '../../utils/nutrition';
import { draftFromLogged, parseQuantity, type QuantityDraft } from '../../utils/portion';
import { formatNumber, roundTo } from '../../utils/units';
import { parseNumber } from '../../utils/validation';
import { Modal } from '../ui/Modal';
import { TextField } from '../ui/TextField';
import { iconButtonClass, primaryButtonClass, secondaryButtonClass } from '../ui/styles';
import { IngredientEditor } from './IngredientEditor';
import { QuantityInput } from './QuantityInput';

interface EditEntryModalProps {
  date: string;
  entry: MealEntry;
  onClose: () => void;
}

interface IngredientRow {
  key: string;
  original: MealIngredient;
  /** Per-unit values; null when the logged amount is unknown and cannot be rescaled. */
  basis: NutritionBasis | null;
  quantity: QuantityDraft;
}

/**
 * Per-unit values for a logged ingredient come from the numbers it was logged with,
 * so untouched ingredients keep their values. Old ingredients without an amount fall
 * back to the library food.
 */
function toRow(ingredient: MealIngredient, index: number, foodsById: Map<string, FoodItem>): IngredientRow {
  const food = ingredient.foodId ? foodsById.get(ingredient.foodId) : undefined;
  const basis = basisFromLogged(ingredient) ?? (food ? basisOf(food) : null);
  return {
    key: `${index}-${ingredient.name}`,
    original: ingredient,
    basis,
    quantity: draftFromLogged(basis?.measure ?? WEIGHT_MEASURE, ingredient),
  };
}

function resolveIngredient(row: IngredientRow): { ingredient: MealIngredient | null; error?: string } {
  if (!row.basis) return { ingredient: row.original };
  const { amount, error } = parseQuantity(row.basis.measure, row.quantity);
  const portion = amount ? computePortion(row.basis, amount) : null;
  if (!portion) return { ingredient: null, error };
  return {
    ingredient: {
      ...row.original,
      grams: portion.grams,
      quantity: portion.quantity,
      unit: portion.unit,
      unitPlural: portion.unitPlural,
      calories: portion.calories,
      proteinG: portion.proteinG,
    },
  };
}

export function EditEntryModal({ date, entry, onClose }: EditEntryModalProps) {
  const updateEntry = useAppStore((state) => state.updateEntry);
  const foods = useAppStore((state) => state.foods);

  const isMeal = (entry.ingredients?.length ?? 0) > 0;
  const singleBasis = useMemo(() => basisFromLogged(entry), [entry]);
  const singleMeasure = singleBasis?.measure ?? WEIGHT_MEASURE;

  const [name, setName] = useState(entry.name);
  const [quantity, setQuantity] = useState<QuantityDraft>(() => draftFromLogged(singleMeasure, entry));
  const [calories, setCalories] = useState(String(entry.calories));
  const [protein, setProtein] = useState(formatNumber(entry.proteinG, 1));
  const [ingredients, setIngredients] = useState<IngredientRow[]>(() => {
    const foodsById = new Map(foods.map((food) => [food.id, food]));
    return (entry.ingredients ?? []).map((ingredient, index) => toRow(ingredient, index, foodsById));
  });
  /** Ingredients added while editing; each picks a library food or describes a new one. */
  const [addedRows, setAddedRows] = useState<IngredientDraft[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const ingredientResults = ingredients.map(resolveIngredient);
  const addedResolved = addedRows.map((row) => resolveIngredientDraft(row, foods));
  const addedIngredients = addedResolved.map((item) =>
    item.portion ? portionToIngredient(item.portion, item.name, item.food?.id) : null,
  );
  const totalRows = ingredients.length + addedRows.length;
  const mealTotals = [...ingredientResults.map((result) => result.ingredient), ...addedIngredients].reduce(
    (acc, ingredient) =>
      ingredient
        ? {
            grams: acc.grams + ingredient.grams,
            calories: acc.calories + ingredient.calories,
            proteinG: roundTo(acc.proteinG + ingredient.proteinG, 1),
            unknownWeight: acc.unknownWeight || ingredient.grams === 0,
          }
        : acc,
    { grams: 0, calories: 0, proteinG: 0, unknownWeight: false },
  );

  // Single entries logged before weights were tracked may keep an empty amount.
  const keepsUnknownAmount = !singleBasis && quantity.text.trim() === '';
  const singleParse = parseQuantity(singleMeasure, quantity);
  const caloriesValue = parseNumber(calories);
  const proteinValue = parseNumber(protein);
  const errors = {
    name: name.trim() === '' ? 'Enter a name' : undefined,
    quantity: isMeal || keepsUnknownAmount ? undefined : singleParse.error,
    calories:
      !isMeal && (caloriesValue === null || caloriesValue < 0 || caloriesValue > 10000)
        ? 'Calories must be 0-10000'
        : undefined,
    protein:
      !isMeal && (proteinValue === null || proteinValue < 0 || proteinValue > 1000)
        ? 'Protein must be 0-1000 g'
        : undefined,
  };

  const handleQuantityChange = (next: QuantityDraft) => {
    setQuantity(next);
    if (!singleBasis) return;
    const { amount } = parseQuantity(singleMeasure, next);
    const portion = amount ? computePortion(singleBasis, amount) : null;
    if (portion) {
      setCalories(String(portion.calories));
      setProtein(formatNumber(portion.proteinG, 1));
    }
  };

  const updateIngredient = (key: string, next: QuantityDraft) =>
    setIngredients((prev) => prev.map((row) => (row.key === key ? { ...row, quantity: next } : row)));

  const removeIngredient = (key: string) => setIngredients((prev) => prev.filter((row) => row.key !== key));

  const replaceAddedRow = (next: IngredientDraft) =>
    setAddedRows((prev) => prev.map((row) => (row.key === next.key ? next : row)));

  const removeAddedRow = (key: string) => setAddedRows((prev) => prev.filter((row) => row.key !== key));

  const handleSave = () => {
    setSubmitted(true);
    if (errors.name) return;

    if (isMeal) {
      const kept = ingredientResults.flatMap(({ ingredient }) => (ingredient ? [ingredient] : []));
      const added = addedIngredients.flatMap((ingredient) => (ingredient ? [ingredient] : []));
      if (kept.length !== ingredients.length || added.length !== addedRows.length) return;
      const valid = [...kept, ...added];
      if (valid.length === 0) return;
      const allWeightsKnown = !mealTotals.unknownWeight;
      updateEntry(date, entry.id, {
        name: name.trim(),
        grams: allWeightsKnown ? mealTotals.grams : 0,
        quantity: allWeightsKnown ? mealTotals.grams : 1,
        unit: allWeightsKnown ? 'g' : 'serving',
        unitPlural: allWeightsKnown ? undefined : 'servings',
        calories: mealTotals.calories,
        proteinG: mealTotals.proteinG,
        fiberG:
          entry.fiberG !== undefined && entry.grams > 0 && allWeightsKnown
            ? roundTo((entry.fiberG / entry.grams) * mealTotals.grams, 1)
            : entry.fiberG,
        ingredients: valid,
      });
      onClose();
      return;
    }

    if (errors.quantity || errors.calories || errors.protein) return;
    if (caloriesValue === null || proteinValue === null) return;
    const totals = { calories: Math.round(caloriesValue), proteinG: roundTo(proteinValue, 1) };

    if (keepsUnknownAmount) {
      updateEntry(date, entry.id, { name: name.trim(), ...totals });
    } else if (!singleBasis) {
      // Old entry without a recorded amount: store the typed grams without rescaling.
      const grams = parseNumber(quantity.text) ?? 0;
      updateEntry(date, entry.id, { name: name.trim(), grams, quantity: grams, unit: 'g', unitPlural: undefined, ...totals });
    } else {
      const portion = singleParse.amount ? computePortion(singleBasis, singleParse.amount) : null;
      if (!portion) return;
      updateEntry(date, entry.id, {
        name: name.trim(),
        grams: portion.grams,
        quantity: portion.quantity,
        unit: portion.unit,
        unitPlural: portion.unitPlural,
        fiberG: portion.fiberG ?? entry.fiberG,
        ...totals,
      });
    }
    onClose();
  };

  return (
    <Modal
      title={isMeal ? 'Edit meal' : 'Edit entry'}
      onClose={onClose}
      footer={
        <button type="button" className={`${primaryButtonClass} w-full`} onClick={handleSave}>
          <Save className="h-4 w-4" />
          Save changes
        </button>
      }
    >
      <div className="space-y-3">
        <TextField
          label={isMeal ? 'Meal name' : 'Name'}
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={submitted ? errors.name : undefined}
        />

        {isMeal ? (
          <>
            <div className="space-y-2">
              <span className="block text-sm font-medium text-slate-700">Ingredients</span>
              {ingredients.map((row, index) => {
                const result = ingredientResults[index];
                return (
                  <div key={row.key} className="space-y-2 rounded-xl p-3 ring-1 ring-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium text-slate-900">{row.original.name}</p>
                      {totalRows > 1 && (
                        <button
                          type="button"
                          className={`${iconButtonClass} h-7 w-7 hover:bg-red-50 hover:text-red-600`}
                          onClick={() => removeIngredient(row.key)}
                          aria-label={`Remove ${row.original.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {row.basis ? (
                      <QuantityInput
                        measure={row.basis.measure}
                        draft={row.quantity}
                        onChange={(next) => updateIngredient(row.key, next)}
                        foodLabel={row.original.name}
                        error={submitted || row.quantity.text !== '' ? result.error : undefined}
                      />
                    ) : (
                      <p className="text-xs text-slate-500">
                        {formatAmount(row.original) || 'No amount was recorded'}; this ingredient cannot be rescaled.
                      </p>
                    )}
                    <p className="text-sm tabular-nums text-slate-600" aria-live="polite">
                      {result.ingredient
                        ? `${result.ingredient.calories} kcal / ${formatNumber(result.ingredient.proteinG, 1)} g protein`
                        : 'Enter an amount'}
                    </p>
                  </div>
                );
              })}
              {addedResolved.map((item, index) => (
                <IngredientEditor
                  key={item.row.key}
                  item={item}
                  foods={foods}
                  label={`New ingredient ${index + 1}`}
                  submitted={submitted}
                  onChange={replaceAddedRow}
                  onRemove={totalRows > 1 ? () => removeAddedRow(item.row.key) : undefined}
                />
              ))}
              <button
                type="button"
                className={`${secondaryButtonClass} w-full py-2`}
                onClick={() => setAddedRows((prev) => [...prev, createIngredientDraft()])}
              >
                <Plus className="h-4 w-4" />
                Add ingredient
              </button>
            </div>
            <div
              className="grid grid-cols-3 gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-center ring-1 ring-emerald-200"
              aria-live="polite"
            >
              <div>
                <p className="text-[11px] font-medium uppercase text-emerald-700">Total</p>
                <p className="text-sm font-bold tabular-nums text-emerald-950">{mealTotals.grams} g</p>
                {mealTotals.unknownWeight && <p className="text-[10px] text-emerald-700">plus items without weight</p>}
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase text-emerald-700">Calories</p>
                <p className="text-sm font-bold tabular-nums text-emerald-950">{mealTotals.calories} kcal</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase text-emerald-700">Protein</p>
                <p className="text-sm font-bold tabular-nums text-emerald-950">
                  {formatNumber(mealTotals.proteinG, 1)} g
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">Meal totals are recalculated from the ingredients.</p>
          </>
        ) : (
          <>
            <QuantityInput
              measure={singleMeasure}
              draft={quantity}
              onChange={handleQuantityChange}
              foodLabel={entry.name}
              error={submitted || quantity.text !== '' ? errors.quantity : undefined}
            />
            <p className="text-xs text-slate-500">
              {singleBasis
                ? 'Changing the amount rescales calories and protein.'
                : 'No amount was recorded for this entry, so calories and protein are not rescaled.'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Calories"
                inputMode="decimal"
                suffix="kcal"
                value={calories}
                onChange={(event) => setCalories(event.target.value)}
                error={submitted ? errors.calories : undefined}
              />
              <TextField
                label="Protein"
                inputMode="decimal"
                suffix="g"
                value={protein}
                onChange={(event) => setProtein(event.target.value)}
                error={submitted ? errors.protein : undefined}
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
