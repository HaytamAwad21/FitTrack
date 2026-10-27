import { Calculator } from 'lucide-react';
import { formatNumber } from '../../utils/units';

interface NutritionPreviewProps {
  values: { calories: number; proteinG: number } | null;
  emptyText: string;
}

/** Live calories and protein for the grams being entered. */
export function NutritionPreview({ values, emptyText }: NutritionPreviewProps) {
  return (
    <p
      aria-live="polite"
      className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm tabular-nums"
    >
      <Calculator className="h-4 w-4 shrink-0 text-slate-400" />
      {values ? (
        <span className="font-semibold text-slate-900">
          {values.calories} kcal / {formatNumber(values.proteinG, 1)} g protein
        </span>
      ) : (
        <span className="text-slate-500">{emptyText}</span>
      )}
    </p>
  );
}
