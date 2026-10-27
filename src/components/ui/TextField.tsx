import type { InputHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  suffix?: string;
  hint?: string;
};

export function TextField({ label, error, suffix, hint, className, ...inputProps }: TextFieldProps) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <span
        className={`flex items-center rounded-xl border bg-white px-3 transition ${
          error
            ? 'border-red-400 ring-1 ring-red-200'
            : 'border-slate-200 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-200'
        }`}
      >
        <input
          className="w-full min-w-0 bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          aria-invalid={error ? true : undefined}
          {...inputProps}
        />
        {suffix && <span className="ml-2 shrink-0 text-sm text-slate-500">{suffix}</span>}
      </span>
      {error ? (
        <span className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </span>
      ) : (
        hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      )}
    </label>
  );
}
