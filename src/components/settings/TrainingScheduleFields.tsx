import type { Weekday } from '../../types';
import { WEEKDAY_SHORT } from '../../utils/date';

interface TrainingScheduleFieldsProps {
  weekdays: Weekday[];
  /** Days-per-week button: the parent selects the default spread for that count. */
  onDaysPerWeek: (count: number) => void;
  /** Weekday toggle: the days-per-week count follows the selection. */
  onToggleWeekday: (day: Weekday) => void;
}

/**
 * Days-per-week buttons and weekday picker. The count is always the number of
 * selected weekdays, so the two can never disagree.
 */
export function TrainingScheduleFields({ weekdays, onDaysPerWeek, onToggleWeekday }: TrainingScheduleFieldsProps) {
  const daysPerWeek = weekdays.length;
  return (
    <div className="space-y-3">
      <div>
        <span className="mb-1 block text-sm font-medium text-slate-700">Days per week</span>
        <div className="grid grid-cols-7 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => onDaysPerWeek(count)}
              aria-pressed={count === daysPerWeek}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                count === daysPerWeek ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="mb-1 flex items-center justify-between text-sm font-medium text-slate-700">
          Training days
          <span className="text-xs font-normal text-slate-500">At least 1 day</span>
        </span>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_SHORT.map((label, index) => {
            const day = index as Weekday;
            const selected = weekdays.includes(day);
            const isLast = selected && weekdays.length === 1;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onToggleWeekday(day)}
                aria-pressed={selected}
                disabled={isLast}
                title={isLast ? 'Keep at least one training day' : undefined}
                className={`rounded-lg py-2 text-xs font-semibold transition disabled:cursor-not-allowed ${
                  selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
