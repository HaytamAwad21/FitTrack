import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '../../store';
import type { FoodIngredient, FoodItem, FoodNutrition, FoodState, MealIngredient } from '../../types';
import {
  FOOD_STATE_OPTIONS,
  duplicateSignature,
  findDuplicateFood,
  formatFoodName,
  nextAvailableName,
  type DuplicateChoice,
} from '../../utils/foodNames';
import {
  createIngredientDraft,
  portionToIngredient,
  resolveIngredientDraft,
  type IngredientDraft,
} from '../../utils/ingredientDraft';
import { servingMeasure } from '../../utils/measure';
import { buildEntryFromFood } from '../../utils/nutrition';
import { parseQuantity } from '../../utils/portion';
import { formatNumber, roundTo } from '../../utils/units';
import { SegmentedControl } from '../ui/SegmentedControl';
import { TextField } from '../ui/TextField';
import { secondaryButtonClass } from '../ui/styles';
import { DuplicateWarning } from './DuplicateWarning';
import { IngredientEditor } from './IngredientEditor';

interface ManualMealFormProps {
  /** Id of the form element, so a submit button outside the form can target it. */
  formId: string;
  date: string;
  onLogged: () => void;
}

interface SaveCandidate {
  key: string;
  name: string;
  state: FoodState;
}

interface ChoiceRecord {
  choice: DuplicateChoice;
  /** Name + state the choice was made for; a changed name invalidates the choice. */
  signature: string;
}

/** Nutrition plus the composite fields a saved meal may carry. */
type FoodData = FoodNutrition & { isComposite?: boolean; ingredients?: FoodIngredient[] };

const MEAL_KEY = 'meal';

/** Manual entry: one food or a multi-ingredient meal mixing grams and servings. */
export function ManualMealForm({ formId, date, onLogged }: ManualMealFormProps) {
  const foods = useAppStore((state) => state.foods);
  const addFood = useAppStore((state) => state.addFood);
  const replaceFood = useAppStore((state) => state.replaceFood);
  const addEntries = useAppStore((state) => state.addEntries);

  const [rows, setRows] = useState<IngredientDraft[]>(() => [createIngredientDraft()]);
  const [mealName, setMealName] = useState('');
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [choices, setChoices] = useState<Record<string, ChoiceRecord>>({});

  const isMulti = rows.length > 1;
  const trimmedMealName = mealName.trim();
  const resolved = rows.map((row) => resolveIngredientDraft(row, foods));
  const canSaveToLibrary = isMulti || resolved[0].isNew;
  const willSave = saveToLibrary && canSaveToLibrary;

  const candidates: SaveCandidate[] = [];
  if (willSave) {
    for (const item of resolved) {
      if (item.isNew && item.name !== '') candidates.push({ key: item.row.key, name: item.name, state: item.row.state });
    }
    if (isMulti && trimmedMealName !== '') candidates.push({ key: MEAL_KEY, name: trimmedMealName, state: 'n/a' });
  }
  const duplicates = new Map<string, FoodItem>();
  for (const candidate of candidates) {
    const existing = findDuplicateFood(foods, candidate.name, candidate.state);
    if (existing) duplicates.set(candidate.key, existing);
  }

  const choiceFor = (candidate: SaveCandidate): DuplicateChoice | undefined => {
    const record = choices[candidate.key];
    return record && record.signature === duplicateSignature(candidate.name, candidate.state)
      ? record.choice
      : undefined;
  };
  const setChoice = (candidate: SaveCandidate, choice: DuplicateChoice) =>
    setChoices((prev) => ({
      ...prev,
      [candidate.key]: { choice, signature: duplicateSignature(candidate.name, candidate.state) },
    }));
  const hasUnresolvedDuplicate = candidates.some((candidate) => duplicates.has(candidate.key) && !choiceFor(candidate));

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

  const renderDuplicate = (key: string) => {
    const candidate = candidates.find((item) => item.key === key);
    const existing = duplicates.get(key);
    if (!candidate || !existing) return null;
    return (
      <DuplicateWarning
        existingName={formatFoodName(existing)}
        newName={formatFoodName({ name: nextAvailableName(foods, candidate.name, candidate.state), state: candidate.state })}
        choice={choiceFor(candidate)}
        onReplace={() => setChoice(candidate, 'replace')}
        onSaveAsNew={() => setChoice(candidate, 'new')}
      />
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (isMulti && trimmedMealName === '') return;
    const valid = resolved.flatMap((item) => (item.portion ? [{ ...item, portion: item.portion }] : []));
    if (valid.length !== resolved.length) return;
    if (hasUnresolvedDuplicate) return;

    // Working copy of the library so every name saved in this batch stays unique.
    let library = [...foods];
    const saveFood = (candidate: SaveCandidate, data: FoodData): FoodItem => {
      const existing = findDuplicateFood(library, candidate.name, candidate.state);
      if (existing && choiceFor(candidate) === 'replace') {
        const replacement = { ...data, name: candidate.name, state: candidate.state };
        replaceFood(existing.id, replacement);
        const updated = { ...replacement, id: existing.id } as FoodItem;
        library = library.map((food) => (food.id === existing.id ? updated : food));
        return updated;
      }
      const name = existing ? nextAvailableName(library, candidate.name, candidate.state) : candidate.name;
      const created = addFood({ ...data, name, state: candidate.state });
      library = [...library, created];
      return created;
    };

    const savedByRow = new Map<string, FoodItem>();
    if (willSave) {
      for (const item of valid) {
        if (!item.isNew || !item.nutrition) continue;
        const saved = saveFood({ key: item.row.key, name: item.name, state: item.row.state }, item.nutrition);
        savedByRow.set(item.row.key, saved);
      }
    }

    if (!isMulti) {
      const [item] = valid;
      const saved = savedByRow.get(item.row.key);
      const source = item.food ?? saved;
      const amount = parseQuantity(item.measure, item.row.quantity).amount;
      const fromLibrary = source && amount ? buildEntryFromFood(source, amount, library) : null;
      addEntries(date, [
        fromLibrary ?? {
          name: item.name,
          grams: item.portion.grams,
          quantity: item.portion.quantity,
          unit: item.portion.unit,
          unitPlural: item.portion.unitPlural,
          calories: item.portion.calories,
          proteinG: item.portion.proteinG,
          fiberG: item.portion.fiberG,
        },
      ]);
      onLogged();
      return;
    }

    const ingredients: MealIngredient[] = valid.map((item) => {
      const saved = savedByRow.get(item.row.key);
      return portionToIngredient(item.portion, saved ? formatFoodName(saved) : item.name, item.food?.id ?? saved?.id);
    });
    const allWeightsKnown = valid.every((item) => item.portion.grams > 0);
    const totalGrams = valid.reduce((sum, item) => sum + item.portion.grams, 0);
    const totalCalories = valid.reduce((sum, item) => sum + item.portion.calories, 0);
    const totalProtein = roundTo(
      valid.reduce((sum, item) => sum + item.portion.proteinG, 0),
      1,
    );
    const hasFiber = valid.some((item) => item.portion.fiberG !== undefined);
    const totalFiber = hasFiber
      ? roundTo(
          valid.reduce((sum, item) => sum + (item.portion.fiberG ?? 0), 0),
          1,
        )
      : undefined;

    let mealFood: FoodItem | undefined;
    if (willSave) {
      // With every weight known the meal is stored per 100 g; otherwise one serving is the whole meal.
      const nutrition: FoodNutrition = allWeightsKnown
        ? {
            measure: { kind: 'weight' },
            caloriesPer100g: Math.round((totalCalories / totalGrams) * 100),
            proteinPer100g: roundTo((totalProtein / totalGrams) * 100, 1),
            fiberPer100g: totalFiber === undefined ? undefined : roundTo((totalFiber / totalGrams) * 100, 1),
          }
        : {
            measure: servingMeasure('serving'),
            caloriesPerServing: totalCalories,
            proteinPerServing: totalProtein,
            fiberPerServing: totalFiber,
          };
      mealFood = saveFood(
        { key: MEAL_KEY, name: trimmedMealName, state: 'n/a' },
        {
          ...nutrition,
          isComposite: true,
          ingredients: ingredients.map(({ foodId, name, grams, quantity, unit }) => ({
            foodId,
            name,
            grams,
            quantity,
            unit,
          })),
        },
      );
    }

    addEntries(date, [
      {
        foodId: mealFood?.id,
        name: mealFood ? formatFoodName(mealFood) : trimmedMealName,
        grams: allWeightsKnown ? totalGrams : 0,
        quantity: allWeightsKnown ? totalGrams : 1,
        unit: allWeightsKnown ? 'g' : 'serving',
        unitPlural: allWeightsKnown ? undefined : 'servings',
        calories: totalCalories,
        proteinG: totalProtein,
        fiberG: totalFiber,
        ingredients,
      },
    ]);
    onLogged();
  };

  return (
    <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-3">
      {isMulti && (
        <div className="space-y-2">
          <TextField
            label="Meal name"
            value={mealName}
            placeholder="Oatmeal"
            onChange={(event) => setMealName(event.target.value)}
            error={submitted && trimmedMealName === '' ? 'Enter a meal name' : undefined}
          />
          {renderDuplicate(MEAL_KEY)}
        </div>
      )}

      {resolved.map((item, index) => {
        const showStateSelector = item.isNew && item.row.text.trim() !== '' && willSave;
        return (
          <IngredientEditor
            key={item.row.key}
            item={item}
            foods={foods}
            label={isMulti ? `Ingredient ${index + 1}` : 'Food'}
            submitted={submitted}
            onChange={replaceRow}
            onRemove={isMulti ? () => setRows((prev) => prev.filter((row) => row.key !== item.row.key)) : undefined}
            beforePreview={
              showStateSelector && (
                <div>
                  <span className="mb-1 block text-sm font-medium text-slate-700">State</span>
                  <SegmentedControl
                    ariaLabel={`State of ingredient ${index + 1}`}
                    value={item.row.state}
                    onChange={(state) => replaceRow({ ...item.row, state })}
                    options={FOOD_STATE_OPTIONS}
                  />
                </div>
              )
            }
            afterPreview={renderDuplicate(item.row.key)}
          />
        );
      })}

      <button
        type="button"
        className={`${secondaryButtonClass} w-full py-2`}
        onClick={() => setRows((prev) => [...prev, createIngredientDraft()])}
      >
        <Plus className="h-4 w-4" />
        Add ingredient
      </button>

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

      {canSaveToLibrary && (
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-600"
            checked={saveToLibrary}
            onChange={(event) => setSaveToLibrary(event.target.checked)}
          />
          <span>
            Save to library
            <span className="block text-xs text-slate-500">
              {isMulti
                ? 'Saves new ingredients and the whole meal.'
                : 'Saves this food with its measurement and label values.'}
            </span>
          </span>
        </label>
      )}

      {submitted && hasUnresolvedDuplicate && (
        <p className="text-xs text-red-600" role="alert">
          Choose Replace existing or Save as new for each duplicate name.
        </p>
      )}
    </form>
  );
}
