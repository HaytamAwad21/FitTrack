import { useMemo } from 'react';
import { Repeat } from 'lucide-react';
import { useAppStore } from '../../store';
import type { WorkoutSession } from '../../types';
import { addDays, getWeekDates, startOfWeekISO, weekdayOf } from '../../utils/date';
import { findPreset, getWorkoutForDate } from '../../utils/routine';
import { cardClass } from '../ui/styles';
import { DayDetail } from './DayDetail';
import { WeekSlider, type WeekDayInfo } from './WeekSlider';

interface ScheduleViewProps {
  today: string;
  selectedDate: string;
  weekStart: string;
  onSelectDate: (date: string) => void;
  onWeekStartChange: (weekStart: string) => void;
  onOpenSession: (sessionId: string) => void;
}

export function ScheduleView({
  today,
  selectedDate,
  weekStart,
  onSelectDate,
  onWeekStartChange,
  onOpenSession,
}: ScheduleViewProps) {
  const trainingSettings = useAppStore((state) => state.trainingSettings);
  const sessions = useAppStore((state) => state.sessions);
  const exercises = useAppStore((state) => state.exercises);
  const startSession = useAppStore((state) => state.startSession);
  const trainingDaysPerWeek = trainingSettings?.trainingWeekdays.length ?? 0;
  const presetLabel = trainingSettings
    ? (findPreset(trainingSettings.routine.presetId)?.label ?? 'Custom split')
    : null;

  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, WorkoutSession>();
    for (const session of sessions) map.set(session.date, session);
    return map;
  }, [sessions]);

  const days: WeekDayInfo[] = getWeekDates(weekStart).map((date) => {
    const workout = getWorkoutForDate(trainingSettings, date);
    const session = sessionsByDate.get(date);
    return {
      date,
      // A logged session shows what was trained; otherwise the planned workout.
      label: session?.workoutName ?? workout?.name ?? 'Rest',
      isRest: !workout && !session,
      completed: session?.completed ?? false,
      inProgress: session !== undefined && !session.completed,
    };
  });

  const shiftWeek = (weeks: number) => {
    const nextStart = addDays(weekStart, weeks * 7);
    onWeekStartChange(nextStart);
    onSelectDate(addDays(nextStart, weekdayOf(selectedDate)));
  };

  const goToToday = () => {
    onWeekStartChange(startOfWeekISO(today));
    onSelectDate(today);
  };

  const selectedWorkout = getWorkoutForDate(trainingSettings, selectedDate);
  const selectedSession = sessionsByDate.get(selectedDate) ?? null;

  return (
    <div className="space-y-4">
      {presetLabel && (
        <div className={`${cardClass} flex items-center gap-3 py-3`}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Repeat className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{presetLabel}</p>
            <p className="text-xs text-slate-500">
              {trainingDaysPerWeek} training {trainingDaysPerWeek === 1 ? 'day' : 'days'} per week. Change it in
              Training settings.
            </p>
          </div>
        </div>
      )}

      <WeekSlider
        days={days}
        today={today}
        selectedDate={selectedDate}
        isCurrentWeek={weekStart === startOfWeekISO(today)}
        onSelect={onSelectDate}
        onPrev={() => shiftWeek(-1)}
        onNext={() => shiftWeek(1)}
        onToday={goToToday}
      />

      <DayDetail
        date={selectedDate}
        today={today}
        workout={selectedWorkout}
        session={selectedSession}
        exercisesById={exercisesById}
        onStart={() => {
          if (!selectedWorkout) return;
          onOpenSession(startSession(selectedDate, selectedWorkout));
        }}
        onOpenSession={onOpenSession}
      />
    </div>
  );
}
