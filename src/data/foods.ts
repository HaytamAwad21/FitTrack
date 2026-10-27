import type { FoodItem } from '../types';
import library from './library.json';
import { LIBRARY_FILE, parseLibrary } from './libraryFile';

function loadLibrary(): FoodItem[] {
  const foods = parseLibrary(library);
  if (!foods) throw new Error(`${LIBRARY_FILE} is not a valid food library`);
  return foods;
}

/**
 * Built-in foods: every new install starts with this library. They are loaded from
 * library.json, which the dev server rewrites whenever the library changes in the
 * app (see vite.config.ts), so foods added there become built-in.
 * Weight foods are per 100 g; serving foods (scoops, tubs, pieces) are per serving.
 * Ids of foods that existed in schema version 1 are kept so older log entries still link.
 */
export const SEED_FOODS: FoodItem[] = loadLibrary();
