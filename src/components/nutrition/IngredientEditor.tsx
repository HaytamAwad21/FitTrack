import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { FoodItem } from '../../types';
import { FOOD_STATE_OPTIONS } from '../../utils/foodNames';
import { suggestFoods } from '../../utils/foodSearch';
import {
  changeIngredientFoodDraft,
  changeIngredientState,
  changeIngredientText,
  selectIngredientFood,
  type IngredientDraft,
  type ResolvedIngredient,
} from '../../utils/ingredientDraft';
import { SegmentedControl } from '../ui/SegmentedControl';
import { iconButtonClass } from '../ui/styles';
import { FoodCombobox } from './FoodCombobox';
import { FoodMeasureFields } from './FoodMeasureFields';
import { NutritionPreview } from './NutritionPreview';
import { QuantityInput } from './QuantityInput';

interface IngredientEditorProps {
  item: ResolvedIngredient;
  foods: FoodItem[];
  label: string;
  /** Show validation errors (after the user tried to submit). */
  submitted: boolean;
  onChange: (row: IngredientDraft) => void;
  onRemove?: () => void;
  /** Ask whether a new food is raw or cooked (needed when it joins the library). */
  showState?: boolean;
}

/**
 * One ingredient row. Picking a library food asks only for the amount. A name that is
 * not in the library opens the new-food fields once the suggestions are out of the way.
 */
export function IngredientEditor({
  item,
  foods,
  label,
  submitted,
  onChange,
  onRemove,
  showState = false,
}: IngredientEditorProps) {
  const { row } = item;
  const [listOpen, setListOpen] = useState(false);

  const hasText = row.text.trim() !== '';
  const hasSuggestions = useMemo(() => {
    const { matches, nearMatches } = suggestFoods(foods, row.text);
    return matches.length + nearMatches.length > 0;
  }, [foods, row.text]);
  const showNewFields = item.isNew && hasText && !(listOpen && hasSuggestions);
  const showAmount = item.food !== null || showNewFields;

  return (
    <div className="space-y-3 rounded-xl p-3 ring-1 ring-slate-200">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <FoodCombobox
            foods={foods}
            label={label}
            placeholder="Search library or type a new name"
            noMatchText="Not in your library. Describe it below."
            inputValue={row.text}
            selectedFoodId={item.food?.id ?? null}
            onInputChange={(text) => onChange(changeIngredientText(row, text, foods))}
            onSelect={(food) => onChange(selectIngredientFood(row, food))}
            onOpenChange={setListOpen}
            error={submitted ? item.errors.name : undefined}
          />
        </div>
        {onRemove && (
          <button
            type="button"
            className={`${iconButtonClass} mt-6 hover:bg-red-50 hover:text-red-600`}
            onClick={onRemove}
            aria-label={`Remove ${label.toLowerCase()}`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showNewFields && (
        <FoodMeasureFields
          draft={row.draft}
          onChange={(draft, measureEdited) => onChange(changeIngredientFoodDraft(row, draft, measureEdited))}
          errors={submitted ? item.errors : {}}
        />
      )}

      {showNewFields && showState && (
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">State</span>
          <SegmentedControl
            ariaLabel={`State of ${item.name}`}
            value={row.state}
            onChange={(state) => onChange(changeIngredientState(row, state, foods))}
            options={FOOD_STATE_OPTIONS}
          />
        </div>
      )}

      {showAmount && (
        <>
          <QuantityInput
            measure={item.measure}
            draft={row.quantity}
            onChange={(quantity) => onChange({ ...row, quantity })}
            foodLabel={item.name || undefined}
            error={submitted || row.quantity.text !== '' ? item.errors.quantity : undefined}
          />
          <NutritionPreview
            values={item.portion}
            emptyText={item.food ? 'Enter an amount to see calories and protein' : 'Enter an amount and the label values'}
          />
        </>
      )}
    </div>
  );
}
