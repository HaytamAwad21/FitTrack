import type { ExerciseType } from '../../types';
import { badgeClass } from '../ui/styles';

export function ExerciseTypeBadge({ type }: { type: ExerciseType }) {
  return (
    <span
      className={`${badgeClass} ${
        type === 'compound' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
      }`}
    >
      {type === 'compound' ? 'Compound' : 'Isolation'}
    </span>
  );
}
