import { AlertTriangle } from 'lucide-react';
import type { DuplicateChoice } from '../../utils/foodNames';

interface DuplicateWarningProps {
  /** Display name of the food already in the library. */
  existingName: string;
  /** Name used when saving as new, for example "Oatmeal (2)". */
  newName: string;
  /** Currently chosen resolution, when the choice is applied later on submit. */
  choice?: DuplicateChoice;
  onReplace: () => void;
  onSaveAsNew: () => void;
}

export function DuplicateWarning({ existingName, newName, choice, onReplace, onSaveAsNew }: DuplicateWarningProps) {
  const buttonClass = (active: boolean) =>
    `flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
      active ? 'bg-amber-600 text-white' : 'bg-white text-amber-800 ring-1 ring-amber-300 hover:bg-amber-100'
    }`;

  return (
    <div role="alert" className="space-y-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
      <p className="flex items-start gap-1.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <span>A food named &apos;{existingName}&apos; already exists in your library.</span>
      </p>
      <div className="flex gap-2">
        <button type="button" className={buttonClass(choice === 'replace')} onClick={onReplace} aria-pressed={choice === 'replace'}>
          Replace existing
        </button>
        <button type="button" className={buttonClass(choice === 'new')} onClick={onSaveAsNew} aria-pressed={choice === 'new'}>
          Save as new
        </button>
      </div>
      {choice && (
        <p className="text-xs text-amber-800">
          {choice === 'replace' ? `Will replace '${existingName}'.` : `Will save as '${newName}'.`}
        </p>
      )}
    </div>
  );
}
