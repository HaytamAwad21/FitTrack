import { Minus, Plus } from 'lucide-react';

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Accessible name, for example "Bench press sets". */
  label: string;
}

const buttonClass =
  'inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40';

/** Compact - / + control for small whole numbers. */
export function Stepper({ value, min, max, onChange, label }: StepperProps) {
  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={label}>
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={`Decrease ${label}`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums text-slate-900" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={`Increase ${label}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
