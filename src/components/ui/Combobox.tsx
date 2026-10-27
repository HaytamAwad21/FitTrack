import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Search } from 'lucide-react';

interface ComboboxProps<T> {
  /** Options to show, already filtered by the caller for `inputValue`. */
  items: T[];
  getKey: (item: T) => string;
  renderOption: (item: T) => ReactNode;
  onSelect: (item: T) => void;
  inputValue: string;
  onInputChange: (text: string) => void;
  label: string;
  placeholder?: string;
  noMatchText?: string;
  autoFocus?: boolean;
}

/** Searchable picker: type to filter, arrow keys to move, Enter or click to pick. */
export function Combobox<T>({
  items,
  getKey,
  renderOption,
  onSelect,
  inputValue,
  onInputChange,
  label,
  placeholder = 'Search',
  noMatchText = 'Nothing matches.',
  autoFocus,
}: ComboboxProps<T>) {
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listId = `${baseId}-list`;
  // An auto-focused picker was opened on purpose, so show its options right away.
  const [open, setOpen] = useState(Boolean(autoFocus));
  const [activeIndex, setActiveIndex] = useState(0);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  /** Last pointer position, so hover only moves the highlight on real mouse movement. */
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  // A new search or a different set of options starts from the first match.
  useEffect(() => {
    setActiveIndex(0);
  }, [inputValue, items.length]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const choose = (item: T) => {
    onSelect(item);
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
        setActiveIndex((index) => (items.length === 0 ? 0 : Math.min(index + 1, items.length - 1)));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case 'Enter':
        if (open && items[activeIndex]) {
          event.preventDefault();
          choose(items[activeIndex]);
        }
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

  const activeOptionId = open && items[activeIndex] ? `${baseId}-option-${activeIndex}` : undefined;

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
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-200">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
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
          {items.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">{noMatchText}</li>
          ) : (
            items.map((item, index) => (
              <li
                key={getKey(item)}
                id={`${baseId}-option-${index}`}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
                onMouseMove={(event) => {
                  // Synthetic mousemoves fire when the list moves under a still pointer; ignore those.
                  const previous = lastPointer.current;
                  if (previous && previous.x === event.clientX && previous.y === event.clientY) return;
                  setActiveIndex(index);
                }}
                className={`cursor-pointer px-3 py-2 ${index === activeIndex ? 'bg-emerald-50' : ''}`}
              >
                {renderOption(item)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
