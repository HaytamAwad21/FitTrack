import { AlertCircle, Minus, Plus } from 'lucide-react';
import type { Measure } from '../../types';
import { capitalize } from '../../utils/measure';
import { stepServings, switchQuantityMode, type QuantityDraft } from '../../utils/portion';
import { formatNumber } from '../../utils/units';
import { parseNumber } from '../../utils/validation';
import { SegmentedControl } from '../ui/SegmentedControl';
import { iconButtonClass } from '../ui/styles';

interface QuantityInputProps {
  measure: Measure;
  draft: QuantityDraft;
  onChange: (draft: QuantityDraft) => void;
  error?: string;
  /** Food name used in accessible labels, for example "Whey protein powder". */
  foodLabel?: string;
}

function fieldClass(error?: string): string {
  return `flex items-center rounded-xl border bg-white px-3 transition ${
    error
      ? 'border-red-400 ring-1 ring-red-200'
      : 'border-slate-200 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-200'
  }`;
}

const inputClass =
  'w-full min-w-0 bg-transparent py-2.5 text-sm tabular-nums text-slate-900 outline-none placeholder:text-slate-400';

/**
 * Quantity entry that adapts to how a food is measured: grams for weight foods,
 * or servings with a +/- stepper. When the serving weight is known, a toggle
 * lets the user enter grams instead.
 */
export function QuantityInput({ measure, draft, onChange, error, foodLabel }: QuantityInputProps) {
  const named = (text: string) => (foodLabel ? `${foodLabel} ${text}` : text);

  if (measure.kind === 'weight') {
    return (
      <div>
        <span className="mb-1 block text-sm font-medium text-slate-700">Grams</span>
        <div className={fieldClass(error)}>
          <input
            className={inputClass}
            inputMode="numeric"
            placeholder="100"
            value={draft.text}
            onChange={(event) => onChange({ mode: 'grams', text: event.target.value })}
            aria-label={named('grams')}
            aria-invalid={error ? true : undefined}
          />
          <span className="ml-2 shrink-0 text-sm text-slate-500">g</span>
        </div>
        <QuantityMessage error={error} />
      </div>
    );
  }

  const weight = measure.servingWeightG;
  const byGrams = draft.mode === 'grams' && weight !== undefined;
  const value = parseNumber(draft.text);
  const plural = capitalize(measure.unitNamePlural);
  let hint: string | undefined;
  if (weight !== undefined) {
    if (byGrams && value !== null && value > 0) {
      const servings = value / weight;
      hint = `= ${formatNumber(servings, 2)} ${servings === 1 ? measure.unitName : measure.unitNamePlural}`;
    } else if (!byGrams) {
      hint = `1 ${measure.unitName} = ${formatNumber(weight, 1)} g`;
    }
  }

  return (
    <div>
      <div className="mb-1 flex min-h-[2.25rem] items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{byGrams ? 'Grams' : plural}</span>
        {weight !== undefined && (
          <div className="w-40">
            <SegmentedControl
              ariaLabel={named('logged in')}
              value={draft.mode}
              onChange={(mode) => onChange(switchQuantityMode(measure, draft, mode))}
              options={[
                { value: 'servings', label: plural },
                { value: 'grams', label: 'g' },
              ]}
            />
          </div>
        )}
      </div>
      {byGrams ? (
        <div className={fieldClass(error)}>
          <input
            className={inputClass}
            inputMode="numeric"
            placeholder={String(weight)}
            value={draft.text}
            onChange={(event) => onChange({ mode: 'grams', text: event.target.value })}
            aria-label={named('grams')}
            aria-invalid={error ? true : undefined}
          />
          <span className="ml-2 shrink-0 text-sm text-slate-500">g</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`${iconButtonClass} h-10 w-10 ring-1 ring-slate-200`}
            onClick={() => onChange({ mode: 'servings', text: stepServings(draft.text, -1) })}
            aria-label={named(`fewer ${measure.unitNamePlural}`)}
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className={`${fieldClass(error)} flex-1`}>
            <input
              className={`${inputClass} text-center`}
              inputMode="decimal"
              value={draft.text}
              onChange={(event) => onChange({ mode: 'servings', text: event.target.value })}
              aria-label={named(measure.unitNamePlural)}
              aria-invalid={error ? true : undefined}
            />
            <span className="ml-2 shrink-0 text-sm text-slate-500">
              {value === 1 ? measure.unitName : measure.unitNamePlural}
            </span>
          </div>
          <button
            type="button"
            className={`${iconButtonClass} h-10 w-10 ring-1 ring-slate-200`}
            onClick={() => onChange({ mode: 'servings', text: stepServings(draft.text, 1) })}
            aria-label={named(`more ${measure.unitNamePlural}`)}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
      <QuantityMessage error={error} hint={hint} />
    </div>
  );
}

function QuantityMessage({ error, hint }: { error?: string; hint?: string }) {
  if (error) {
    return (
      <span className="mt-1 flex items-center gap-1 text-xs text-red-600">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        {error}
      </span>
    );
  }
  return hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null;
}
