import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { AlertCircle, AlertTriangle, Search } from 'lucide-react';
import type { FoodItem } from '../../types';
import { formatFoodName } from '../../utils/foodNames';
import { suggestFoods } from '../../utils/foodSearch';
import { formatNutritionBasis } from '../../utils/measure';
import { filterFoods } from '../../utils/nutrition';

interface FoodComboboxProps {
  foods: FoodItem[];
  /** Text shown in the input. */
  inputValue: string;
  onInputChange: (text: string) => void;
  onSelect: (food: FoodItem) => void;
  selectedFoodId: string | null;
  label: string;
  placeholder?: string;
  error?: string;
  /** Shown in the dropdown when the typed text matches no library food. */
  noMatchText?: string;
  autoFocus?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const MAX_RESULTS = 50;

/**
 * Searchable food picker: type to filter, arrow keys to move, Enter or click to select.
 * Close names appear under "Did you mean" and must be picked on purpose, so Enter
 * never swaps a new food's name for a similar one.
 */
export function FoodCombobox({
  foods,
  inputValue,
  onInputChange,
  onSelect,
  selectedFoodId,
  label,
  placeholder = 'Search foods',
  error,
  noMatchText = 'No foods match.',
  autoFocus,
  onOpenChange,
}: FoodComboboxProps) {
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listId = `${baseId}-list`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  /** Last pointer position, so hover only moves the highlight on real mouse movement. */
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  const { options, nearStart } = useMemo(() => {
    const selected = selectedFoodId ? foods.find((food) => food.id === selectedFoodId) : undefined;
    if (selected && formatFoodName(selected) === inputValue) {
      // The input shows the selected food: list it first (so Enter keeps it), then everything else to switch to.
      const others = filterFoods(foods, '').filter((food) => food.id !== selected.id);
      const list = [selected, ...others].slice(0, MAX_RESULTS);
      return { options: list, nearStart: list.length };
    }
    const { matches, nearMatches } = suggestFoods(foods, inputValue);
    const list = [...matches.slice(0, MAX_RESULTS - nearMatches.length), ...nearMatches];
    return { options: list, nearStart: list.length - nearMatches.length };
  }, [foods, inputValue, selectedFoodId]);

  // Highlight the selected food (for example after an exact name match), otherwise the first plain match.
  useEffect(() => {
    const selectedIndex = options.findIndex((food) => food.id === selectedFoodId);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : nearStart > 0 ? 0 : -1);
  }, [options, nearStart, selectedFoodId]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const choose = (food: FoodItem) => {
    onSelect(food);
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) {
          setOpen(true);
          break;
        }
        setActiveIndex((index) => Math.min(index + 1, options.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case 'Enter':
        if (!open || options.length === 0) break;
        event.preventDefault();
        if (options[activeIndex]) choose(options[activeIndex]);
        else setOpen(false);
        break;
      case 'Escape':
        if (open) {
          // Close only the dropdown, not the surrounding dialog.
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }
        break;
      default:
        break;
    }
  };

  const activeOptionId = open && options[activeIndex] ? `${baseId}-option-${activeIndex}` : undefined;

  return (
    <div
      className="relative"
      onMouseMove={(event) => {
        lastPointer.current = { x: event.clientX, y: event.clientY };
      }}
    >
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div
        className={`flex items-center gap-2 rounded-xl border bg-white px-3 transition ${
          error
            ? 'border-red-400 ring-1 ring-red-200'
            : 'border-slate-200 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-200'
        }`}
      >
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          className="w-full min-w-0 bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          placeholder={placeholder}
          value={inputValue}
          onChange={(event) => {
            onInputChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">{noMatchText}</li>
          ) : (
            options.flatMap((food, index) => {
              const option = (
                <li
                  key={food.id}
                  id={`${baseId}-option-${index}`}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  role="option"
                  aria-selected={food.id === selectedFoodId}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(food)}
                  onMouseMove={(event) => {
                    // When the list appears or scrolls under a still pointer the browser fires a synthetic
                    // mousemove at the same position; only real movement should move the highlight.
                    // (This handler runs before the container's, which records the position.)
                    const previous = lastPointer.current;
                    if (previous && previous.x === event.clientX && previous.y === event.clientY) return;
                    setActiveIndex(index);
                  }}
                  className={`cursor-pointer px-3 py-2 ${index === activeIndex ? 'bg-emerald-50' : ''}`}
                >
                  <span className="flex items-center gap-1 text-sm font-medium text-slate-900">
                    {food.needsReview && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                    {formatFoodName(food)}
                  </span>
                  <span className="block text-xs tabular-nums text-slate-500">{formatNutritionBasis(food)}</span>
                </li>
              );
              if (index !== nearStart) return [option];
              return [
                <li
                  key="did-you-mean"
                  role="presentation"
                  onMouseDown={(event) => event.preventDefault()}
                  className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Did you mean
                </li>,
                option,
              ];
            })
          )}
        </ul>
      )}

      {error && (
        <span className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}
