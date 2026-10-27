import { useRef } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { WEEKDAY_SHORT, dayOfMonth, formatShortDate, weekdayOf } from '../../utils/date';
import { cardClass, iconButtonClass } from '../ui/styles';

export interface WeekDayInfo {
  date: string;
  label: string;
  isRest: boolean;
  completed: boolean;
  inProgress: boolean;
}

interface WeekSliderProps {
  days: WeekDayInfo[];
  today: string;
  selectedDate: string;
  isCurrentWeek: boolean;
  onSelect: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

const SWIPE_THRESHOLD_PX = 50;

export function WeekSlider({
  days,
  today,
  selectedDate,
  isCurrentWeek,
  onSelect,
  onPrev,
  onNext,
  onToday,
}: WeekSliderProps) {
  const touchStartX = useRef<number | null>(null);
  const first = days[0]?.date;
  const last = days[days.length - 1]?.date;

  return (
    <section className={`${cardClass} px-3`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" className={iconButtonClass} onClick={onPrev} aria-label="Previous week">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold text-slate-900">
            {isCurrentWeek ? 'This week' : first && last ? `${formatShortDate(first)} - ${formatShortDate(last)}` : ''}
          </span>
          {!isCurrentWeek && (
            <button type="button" className="text-xs font-medium text-emerald-600 hover:underline" onClick={onToday}>
              Back to today
            </button>
          )}
        </div>
        <button type="button" className={iconButtonClass} onClick={onNext} aria-label="Next week">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div
        className="no-scrollbar -mx-1 flex snap-x gap-1 overflow-x-auto px-1 pb-1"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0].clientX;
        }}
        onTouchEnd={(event) => {
          if (touchStartX.current === null) return;
          const deltaX = event.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
          if (deltaX < 0) onNext();
          else onPrev();
        }}
      >
        {days.map((day) => {
          const isToday = day.date === today;
          const isSelected = day.date === selectedDate;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelect(day.date)}
              aria-pressed={isSelected}
              aria-label={`${WEEKDAY_SHORT[weekdayOf(day.date)]} ${dayOfMonth(day.date)}: ${day.label}${
                day.completed ? ', completed' : ''
              }`}
              className={`flex min-w-[2.5rem] flex-1 snap-start flex-col items-center gap-0.5 rounded-xl px-1 py-2 transition ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isToday
                    ? 'bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className={`text-[10px] font-medium uppercase ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                {WEEKDAY_SHORT[weekdayOf(day.date)]}
              </span>
              <span className="text-base font-bold leading-tight tabular-nums">{dayOfMonth(day.date)}</span>
              <span
                className={`line-clamp-2 min-h-[1.5rem] text-center text-[10px] leading-3 ${
                  day.isRest ? (isSelected ? 'text-emerald-100' : 'text-slate-400') : 'font-semibold'
                }`}
              >
                {day.label}
              </span>
              <span className="flex h-4 items-center justify-center">
                {day.completed ? (
                  <CheckCircle2 className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                ) : day.inProgress ? (
                  <Circle className={`h-3 w-3 ${isSelected ? 'text-white' : 'text-amber-500'}`} />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
