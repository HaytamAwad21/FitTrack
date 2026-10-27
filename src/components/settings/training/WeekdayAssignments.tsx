import { useAppStore } from '../../../store';
import type { TrainingSettings, Weekday } from '../../../types';
import { WEEKDAY_LONG } from '../../../utils/date';
import { WEEKDAYS } from '../../../utils/routine';

interface WeekdayAssignmentsProps {
  settings: TrainingSettings;
}

/**
 * One row per weekday: selected days pick a workout from every workout type,
 * unselected days are rest days. Days sharing a workout share its definition.
 */
export function WeekdayAssignments({ settings }: WeekdayAssignmentsProps) {
  const assignWorkout = useAppStore((state) => state.assignWorkout);
  const { routine, trainingWeekdays } = settings;

  return (
    <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
      {WEEKDAYS.map((day: Weekday) => {
        const selected = trainingWeekdays.includes(day);
        const assigned = routine.weekdayAssignments[day];
        return (
          <li key={day} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className={`text-sm font-medium ${selected ? 'text-slate-900' : 'text-slate-400'}`}>
              {WEEKDAY_LONG[day]}
            </span>
            {selected ? (
              <select
                className="min-w-0 max-w-[60%] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-emerald-500"
                value={assigned ?? ''}
                onChange={(event) => assignWorkout(day, event.target.value)}
                aria-label={`Workout on ${WEEKDAY_LONG[day]}`}
              >
                {routine.workoutTypes.map((workout) => (
                  <option key={workout.id} value={workout.id}>
                    {workout.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-slate-400">Rest</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
