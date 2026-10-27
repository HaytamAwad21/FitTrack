import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import type { FoodItem } from '../../types';
import {
  changeIngredientFoodDraft,
  changeIngredientText,
  selectIngredientFood,
  type IngredientDraft,
  type ResolvedIngredient,
} from '../../utils/ingredientDraft';
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
  /** Extra controls under the amount, for example the raw/cooked selector. */
  beforePreview?: ReactNode;
  /** Shown under the live calories, for example a duplicate-name warning. */
  afterPreview?: ReactNode;
}

/**
 * One ingredient row: pick a library food or type a new one (with label values),
 * then enter the amount in the food's natural unit. Shows live calories and protein.
 */
export function IngredientEditor({
  item,
  foods,
  label,
  submitted,
  onChange,
  onRemove,
  beforePreview,
  afterPreview,
}: IngredientEditorProps) {
  const { row } = item;
  const showNewFields = item.isNew && row.text.trim() !== '';

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

      <QuantityInput
        measure={item.measure}
        draft={row.quantity}
        onChange={(quantity) => onChange({ ...row, quantity })}
        foodLabel={item.name || undefined}
        error={submitted || row.quantity.text !== '' ? item.errors.quantity : undefined}
      />

      {beforePreview}

      <NutritionPreview
        values={item.portion}
        emptyText={item.food ? 'Enter an amount to see calories and protein' : 'Enter an amount and the label values'}
      />

      {afterPreview}
    </div>
  );
}
