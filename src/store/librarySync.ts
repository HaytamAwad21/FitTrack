import { LIBRARY_SYNC_PATH } from '../data/libraryFile';
import type { FoodItem } from '../types';
import { useAppStore } from './index';

/** Wait after the last library change before sending, so quick edits go in one request. */
const SYNC_DELAY_MS = 400;
/** Browsers cap keepalive request bodies at 64 KB. */
const KEEPALIVE_LIMIT = 60_000;

/**
 * Development only: every change to the food library is sent to the dev server, which
 * writes it to src/data/library.json. New installs start from that file, so foods
 * added, edited or deleted here become the built-in library.
 */
export function startLibrarySync(): void {
  let pending: FoodItem[] | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const send = (keepalive: boolean) => {
    clearTimeout(timer);
    const foods = pending;
    pending = null;
    if (!foods) return;
    const body = JSON.stringify(foods);
    fetch(LIBRARY_SYNC_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: keepalive && body.length < KEEPALIVE_LIMIT,
    })
      .then((response) => {
        if (!response.ok) console.warn(`Library sync failed (${response.status}): src/data/library.json was not updated.`);
      })
      .catch(() => console.warn('Library sync failed: the dev server could not be reached.'));
  };

  useAppStore.subscribe((state, previous) => {
    if (state.foods === previous.foods) return;
    pending = state.foods;
    clearTimeout(timer);
    timer = setTimeout(() => send(false), SYNC_DELAY_MS);
  });

  // Send a change made just before the tab closes.
  window.addEventListener('pagehide', () => send(true));
}
