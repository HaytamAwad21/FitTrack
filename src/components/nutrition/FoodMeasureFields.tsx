import { AlertTriangle, Hash, Scale } from 'lucide-react';
import {
  convertDraftKind,
  draftBasisLabel,
  draftLooksUnusual,
  type FoodDraft,
  type FoodDraftErrors,
} from '../../utils/foodDraft';
import { SegmentedControl } from '../ui/SegmentedControl';
import { TextField } from '../ui/TextField';

interface FoodMeasureFieldsProps {
  draft: FoodDraft;
  /** `measureEdited` is true when the user changed how the food is measured. */
  onChange: (draft: FoodDraft, measureEdited: boolean) => void;
  /** Errors to show (the parent decides when, for example after submit). */
  errors: FoodDraftErrors;
  showFiber?: boolean;
}

/** "Measured by" control plus nutrition fields whose labels follow the selection (per 100 g or per scoop). */
export function FoodMeasureFields({ draft, onChange, errors, showFiber = false }: FoodMeasureFieldsProps) {
  const basis = draftBasisLabel(draft);
  const unit = draft.unitName.trim() || 'serving';

  return (
    <div className="space-y-3">
      <div>
        <span className="mb-1 block text-sm font-medium text-slate-700">Measured by</span>
        <SegmentedControl
          ariaLabel="Measured by"
          value={draft.kind}
          onChange={(kind) => onChange(convertDraftKind(draft, kind), true)}
          options={[
            { value: 'weight', label: 'Grams', icon: Scale },
            { value: 'serving', label: 'Servings', icon: Hash },
          ]}
        />
      </div>

      {draft.kind === 'serving' && (
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Unit"
            placeholder="scoop"
            value={draft.unitName}
            onChange={(event) => onChange({ ...draft, unitName: event.target.value }, true)}
            error={errors.unitName}
          />
          <TextField
            label={`1 ${unit} = (optional)`}
            inputMode="decimal"
            suffix="g"
            placeholder="30"
            value={draft.servingWeight}
            onChange={(event) => onChange({ ...draft, servingWeight: event.target.value }, true)}
            error={errors.servingWeight}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label={`kcal ${basis}`}
          inputMode="decimal"
          suffix="kcal"
          value={draft.calories}
          onChange={(event) => onChange({ ...draft, calories: event.target.value }, false)}
          error={errors.calories}
        />
        <TextField
          label={`Protein ${basis}`}
          inputMode="decimal"
          suffix="g"
          value={draft.protein}
          onChange={(event) => onChange({ ...draft, protein: event.target.value }, false)}
          error={errors.protein}
        />
      </div>

      {showFiber && (
        <TextField
          label={`Fiber ${basis} (optional)`}
          inputMode="decimal"
          suffix="g"
          value={draft.fiber}
          onChange={(event) => onChange({ ...draft, fiber: event.target.value }, false)}
          error={errors.fiber}
        />
      )}

      {draftLooksUnusual(draft) && (
        <p
          role="status"
          className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          These values look unusual. Check the label.
        </p>
      )}
    </div>
  );
}
