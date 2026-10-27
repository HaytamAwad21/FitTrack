import { useState } from 'react';
import { BookOpen, Check, PenLine } from 'lucide-react';
import { useAppStore } from '../../store';
import type { FoodItem } from '../../types';
import { formatFoodName } from '../../utils/foodNames';
import { WEIGHT_MEASURE, basisOf, measureOf } from '../../utils/measure';
import { buildEntryFromFood, computePortion } from '../../utils/nutrition';
import { defaultQuantityDraft, parseQuantity, type QuantityDraft } from '../../utils/portion';
import { Modal } from '../ui/Modal';
import { SegmentedControl } from '../ui/SegmentedControl';
import { primaryButtonClass } from '../ui/styles';
import { FoodCombobox } from './FoodCombobox';
import { ManualMealForm } from './ManualMealForm';
import { NutritionPreview } from './NutritionPreview';
import { QuantityInput } from './QuantityInput';

type LogMode = 'library' | 'manual';

const MANUAL_FORM_ID = 'manual-meal-form';

interface LogFoodModalProps {
  date: string;
  onClose: () => void;
}

export function LogFoodModal({ date, onClose }: LogFoodModalProps) {
  const foods = useAppStore((state) => state.foods);
  const addEntries = useAppStore((state) => state.addEntries);

  const [mode, setMode] = useState<LogMode>(foods.length > 0 ? 'library' : 'manual');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<QuantityDraft>(() => defaultQuantityDraft(WEIGHT_MEASURE));
  const [submitted, setSubmitted] = useState(false);

  const selected = foods.find((food) => food.id === selectedId) ?? null;
  const measure = selected ? measureOf(selected) : WEIGHT_MEASURE;
  const { amount, error: quantityError } = parseQuantity(measure, quantity);
  const portion = selected && amount ? computePortion(basisOf(selected), amount) : null;

  const selectFood = (food: FoodItem) => {
    setSelectedId(food.id);
    setQuery(formatFoodName(food));
    setQuantity(defaultQuantityDraft(measureOf(food)));
  };

  const handleLogFromLibrary = () => {
    setSubmitted(true);
    if (!selected || !amount) return;
    const entry = buildEntryFromFood(selected, amount, foods);
    if (!entry) return;
    addEntries(date, [entry]);
    onClose();
  };

  const footer =
    mode === 'library' ? (
      <button type="button" className={`${primaryButtonClass} w-full`} onClick={handleLogFromLibrary}>
        <Check className="h-4 w-4" />
        Add to log
      </button>
    ) : (
      <button type="submit" form={MANUAL_FORM_ID} className={`${primaryButtonClass} w-full`}>
        <Check className="h-4 w-4" />
        Add to log
      </button>
    );

  return (
    <Modal title="Log food" onClose={onClose} footer={footer}>
      <div className="space-y-4">
        <SegmentedControl
          ariaLabel="Logging method"
          value={mode}
          onChange={(next) => {
            setMode(next);
            setSubmitted(false);
          }}
          options={[
            { value: 'library', label: 'From library', icon: BookOpen },
            { value: 'manual', label: 'Manual entry', icon: PenLine },
          ]}
        />

        {mode === 'library' ? (
          <div className="space-y-3">
            <FoodCombobox
              foods={foods}
              label="Food"
              inputValue={query}
              selectedFoodId={selectedId}
              onInputChange={(text) => {
                setQuery(text);
                setSelectedId(null);
              }}
              onSelect={selectFood}
              noMatchText="No foods match. Use manual entry to add one."
              error={submitted && !selected ? 'Select a food from the library' : undefined}
            />
            <QuantityInput
              measure={measure}
              draft={quantity}
              onChange={setQuantity}
              foodLabel={selected ? formatFoodName(selected) : undefined}
              error={submitted || quantity.text !== '' ? quantityError : undefined}
            />
            <NutritionPreview
              values={portion}
              emptyText={selected ? 'Enter an amount to see calories and protein' : 'Select a food and enter an amount'}
            />
          </div>
        ) : (
          <ManualMealForm formId={MANUAL_FORM_ID} date={date} onLogged={onClose} />
        )}
      </div>
    </Modal>
  );
}
