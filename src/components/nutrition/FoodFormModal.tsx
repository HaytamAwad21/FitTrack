import { useState } from 'react';
import { AlertTriangle, RotateCcw, Save } from 'lucide-react';
import { useToday } from '../../hooks/useToday';
import { useAppStore } from '../../store';
import type { NewFoodItem } from '../../store/types';
import type { FoodItem, FoodState } from '../../types';
import { countFoodEntries, nutritionChanged } from '../../utils/entryUpdates';
import {
  applyMeasureToDraft,
  draftForReview,
  draftFromFood,
  draftToNutrition,
  emptyFoodDraft,
  hasDraftErrors,
  validateFoodDraft,
  type FoodDraft,
} from '../../utils/foodDraft';
import { FOOD_STATE_OPTIONS, findDuplicateFood, formatFoodName, nextAvailableName } from '../../utils/foodNames';
import { detectMeasure, formatAmount, isServingBased } from '../../utils/measure';
import { Modal } from '../ui/Modal';
import { SegmentedControl } from '../ui/SegmentedControl';
import { TextField } from '../ui/TextField';
import { primaryButtonClass } from '../ui/styles';
import { DuplicateWarning } from './DuplicateWarning';
import { FoodMeasureFields } from './FoodMeasureFields';
import { UpdateEntriesDialog, type EntryUpdateScope } from './UpdateEntriesDialog';

interface FoodFormModalProps {
  food?: FoodItem;
  onClose: () => void;
}

/** A flagged weight food with a suggested serving opens with Servings pre-selected. */
function initialDraft(food: FoodItem | undefined): FoodDraft {
  if (!food) return emptyFoodDraft();
  if (food.needsReview && food.suggestedMeasure && !isServingBased(food)) {
    return draftForReview(food, food.suggestedMeasure);
  }
  return draftFromFood(food);
}

export function FoodFormModal({ food, onClose }: FoodFormModalProps) {
  const foods = useAppStore((state) => state.foods);
  const addFood = useAppStore((state) => state.addFood);
  const replaceFood = useAppStore((state) => state.replaceFood);
  const deleteFood = useAppStore((state) => state.deleteFood);
  const refreshFoodEntries = useAppStore((state) => state.refreshFoodEntries);
  const logs = useAppStore((state) => state.logs);
  const today = useToday();

  const reviewingMeasure = Boolean(food?.needsReview && food.suggestedMeasure && !isServingBased(food));
  const [name, setName] = useState(food?.name ?? '');
  const [foodState, setFoodState] = useState<FoodState>(food?.state ?? 'n/a');
  const [draft, setDraft] = useState<FoodDraft>(() => initialDraft(food));
  const [measureEdited, setMeasureEdited] = useState(Boolean(food));
  const [submitted, setSubmitted] = useState(false);
  /** An edit waiting for the answer to "update logged entries?". */
  const [pendingEdit, setPendingEdit] = useState<NewFoodItem | null>(null);

  const entryCounts = food ? countFoodEntries(logs, food.id, today) : null;
  const draftErrors = validateFoodDraft(draft);
  const nameError = name.trim() === '' ? 'Enter a name' : undefined;
  const hasErrors = Boolean(nameError) || hasDraftErrors(draftErrors);
  const duplicate = findDuplicateFood(foods, name, foodState, food?.id);
  const original = food ? draftFromFood(food) : null;

  /** New foods: the measurement follows the name until the user picks one. */
  const handleNameChange = (text: string) => {
    setName(text);
    if (!measureEdited) setDraft((prev) => applyMeasureToDraft(prev, detectMeasure(text)));
  };

  const buildData = (finalName: string): NewFoodItem | null => {
    const nutrition = draftToNutrition(draft);
    if (hasErrors || !nutrition) return null;
    return {
      name: finalName,
      state: foodState,
      // A custom label such as "boiled" only applies while the state is unchanged.
      stateLabel: food && food.state === foodState ? food.stateLabel : undefined,
      micronutrients: food?.micronutrients,
      isComposite: food?.isComposite,
      ingredients: food?.ingredients,
      ...nutrition,
    };
  };

  const persist = (finalName: string) => {
    setSubmitted(true);
    const data = buildData(finalName);
    if (!data) return;
    if (food && nutritionChanged(food, data) && entryCounts && entryCounts.all > 0) {
      setPendingEdit(data);
      return;
    }
    if (food) replaceFood(food.id, data);
    else addFood(data);
    onClose();
  };

  const applyPendingEdit = (scope: EntryUpdateScope) => {
    if (!food || !pendingEdit) return;
    replaceFood(food.id, pendingEdit);
    if (scope === 'today') refreshFoodEntries(food.id, today);
    if (scope === 'all') refreshFoodEntries(food.id);
    onClose();
  };

  const handleSave = () => {
    if (duplicate) {
      setSubmitted(true);
      return;
    }
    persist(name.trim());
  };

  /** Overwrites the existing food. When editing, the edited food merges into it. */
  const handleReplace = () => {
    setSubmitted(true);
    const data = buildData(name.trim());
    if (!data || !duplicate) return;
    replaceFood(duplicate.id, data);
    if (food) deleteFood(food.id);
    onClose();
  };

  const handleSaveAsNew = () => persist(nextAvailableName(foods, name, foodState, food?.id));

  /** Review helper: the old per-100 g numbers were often typed from a per-serving label. */
  const useOldNumbersPerServing = () => {
    if (!original) return;
    setDraft((prev) => ({ ...prev, calories: original.calories, protein: original.protein, fiber: original.fiber }));
  };

  if (pendingEdit && entryCounts) {
    return (
      <UpdateEntriesDialog
        todayCount={entryCounts.date}
        allCount={entryCounts.all}
        onChoose={applyPendingEdit}
        onCancel={() => setPendingEdit(null)}
      />
    );
  }

  return (
    <Modal
      title={food ? 'Edit food' : 'Add food'}
      onClose={onClose}
      footer={
        <button
          type="button"
          className={`${primaryButtonClass} w-full`}
          onClick={handleSave}
          disabled={Boolean(duplicate)}
        >
          <Save className="h-4 w-4" />
          {food ? 'Save changes' : 'Add to library'}
        </button>
      }
    >
      <div className="space-y-3">
        {food?.needsReview && (
          <div className="space-y-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
            <p className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>{food.reviewNote ?? 'Check this food against its label.'}</span>
            </p>
            {reviewingMeasure && original && draft.kind === 'serving' && (
              <>
                <p>
                  Values below were converted from your per-100 g numbers ({original.calories} kcal /{' '}
                  {original.protein} g). If those numbers were already per {draft.unitName || 'serving'}, use them as
                  they are.
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 font-semibold text-amber-800 ring-1 ring-amber-300 hover:bg-amber-100"
                  onClick={useOldNumbersPerServing}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Use {original.calories} kcal / {original.protein} g per {draft.unitName || 'serving'}
                </button>
              </>
            )}
          </div>
        )}
        <TextField
          label="Name"
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
          error={submitted ? nameError : undefined}
        />
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">State</span>
          <SegmentedControl ariaLabel="Food state" value={foodState} onChange={setFoodState} options={FOOD_STATE_OPTIONS} />
        </div>
        {duplicate && (
          <DuplicateWarning
            existingName={formatFoodName(duplicate)}
            newName={formatFoodName({ name: nextAvailableName(foods, name, foodState, food?.id), state: foodState })}
            onReplace={handleReplace}
            onSaveAsNew={handleSaveAsNew}
          />
        )}
        <FoodMeasureFields
          draft={draft}
          onChange={(next, edited) => {
            setDraft(next);
            if (edited) setMeasureEdited(true);
          }}
          errors={submitted ? draftErrors : {}}
          showFiber
        />
        {food?.isComposite && food.ingredients && food.ingredients.length > 0 && (
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <p className="mb-1 font-semibold text-slate-700">Ingredients</p>
            <ul className="space-y-0.5">
              {food.ingredients.map((ingredient, index) => (
                <li key={`${ingredient.name}-${index}`}>
                  {[formatAmount(ingredient), ingredient.name].filter(Boolean).join(' ')}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
