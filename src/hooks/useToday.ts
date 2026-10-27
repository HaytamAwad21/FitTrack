import { useEffect, useState } from 'react';
import { todayISO } from '../utils/date';

/** Current local date (YYYY-MM-DD). Updates when the day rolls over. */
export function useToday(): string {
  const [today, setToday] = useState(todayISO);

  useEffect(() => {
    const check = () => setToday((previous) => {
      const current = todayISO();
      return current === previous ? previous : current;
    });
    const interval = window.setInterval(check, 30_000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, []);

  return today;
}
