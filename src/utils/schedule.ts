import type { Weekday } from '../types';

/** Default training weekdays (Monday = 0) for each training-days-per-week count. */
export const DEFAULT_WEEKDAYS: Record<number, Weekday[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

export function clampDaysPerWeek(daysPerWeek: number): number {
  return Math.min(7, Math.max(1, Math.round(daysPerWeek)));
}

export function getDefaultWeekdays(daysPerWeek: number): Weekday[] {
  return [...DEFAULT_WEEKDAYS[clampDaysPerWeek(daysPerWeek)]];
}

export function sortWeekdays(days: Weekday[]): Weekday[] {
  return [...new Set(days)].sort((a, b) => a - b);
}

/** Adds or removes a weekday. The last remaining day cannot be removed (minimum 1 day per week). */
export function toggleWeekday(days: Weekday[], day: Weekday): Weekday[] {
  if (days.includes(day)) return days.length > 1 ? days.filter((d) => d !== day) : days;
  return sortWeekdays([...days, day]);
}
