import type { Weekday } from '../types';

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const WEEKDAY_LONG = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Formats a Date as a local-time ISO date string (YYYY-MM-DD). */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses a YYYY-MM-DD string as local midnight. */
export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Weekday index with Monday = 0 and Sunday = 6. */
export function weekdayOf(iso: string): Weekday {
  return ((parseISODate(iso).getDay() + 6) % 7) as Weekday;
}

/** Returns the Monday of the week containing the given date. */
export function startOfWeekISO(iso: string): string {
  return addDays(iso, -weekdayOf(iso));
}

export function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function dayOfMonth(iso: string): number {
  return parseISODate(iso).getDate();
}

export function formatShortDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatLongDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
