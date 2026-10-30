import type { FoodItem } from '../types';
import { formatFoodName, normalizeFoodName } from './foodNames';
import { filterFoods } from './nutrition';

/** Names this short only match after normalizing; one typo would match unrelated foods. */
const MIN_FUZZY_LENGTH = 5;
const MAX_FUZZY_DISTANCE = 2;
const MAX_NEAR_MATCHES = 5;

export interface FoodSuggestions {
  matches: FoodItem[];
  /** Close but not exact names, shown under "Did you mean". */
  nearMatches: FoodItem[];
}

/** Number of single-character edits between two strings. */
export function levenshtein(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
}

/** Comparable form of a name: ignores case, extra spaces, raw/cooked labels and a trailing "s". */
export function fuzzyKey(name: string): string {
  return normalizeFoodName(name)
    .replace(/\((raw|cooked)\)/g, ' ')
    .replace(/\b(raw|cooked)\b/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (word.length > 1 ? word.replace(/s$/, '') : word))
    .join(' ');
}

/** Edits between two comparable names, or null when they are too far apart to suggest. */
function closeness(a: string, b: string): number | null {
  if (a === b) return 0;
  if (a.length < MIN_FUZZY_LENGTH || b.length < MIN_FUZZY_LENGTH) return null;
  const distance = levenshtein(a, b);
  return distance <= MAX_FUZZY_DISTANCE ? distance : null;
}

/**
 * Library foods for typed text. A name that is close but not exact (typing "Almond"
 * finds "Almonds") goes under "Did you mean", so an exact name never looks confirmed
 * when it is not. Other foods containing the text are plain matches. Near matches
 * start with the closest name, and an exact name needs none.
 */
export function suggestFoods(foods: FoodItem[], query: string): FoodSuggestions {
  const typed = normalizeFoodName(query);
  if (typed === '') return { matches: filterFoods(foods, ''), nearMatches: [] };

  const key = fuzzyKey(typed);
  const matches: FoodItem[] = [];
  const near: { food: FoodItem; distance: number }[] = [];
  let hasExact = false;
  for (const food of filterFoods(foods, '')) {
    const label = normalizeFoodName(formatFoodName(food));
    const foodKey = fuzzyKey(food.name);
    const distance = key === '' ? null : closeness(key, foodKey);
    if (label === typed) {
      hasExact = true;
      matches.push(food);
    } else if (distance !== null) {
      near.push({ food, distance });
    } else if (label.includes(typed)) {
      matches.push(food);
    } else if (key !== '') {
      // A typo in one word of a longer name, or the text inside it after normalizing.
      const wordDistances = foodKey.split(' ').map((word) => closeness(key, word) ?? Infinity);
      const best = Math.min(...wordDistances);
      if (best !== Infinity) near.push({ food, distance: best + 1 });
      else if (foodKey.includes(key)) near.push({ food, distance: MAX_FUZZY_DISTANCE + 1 });
    }
  }
  if (hasExact) return { matches, nearMatches: [] };
  const nearMatches = near
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_NEAR_MATCHES)
    .map(({ food }) => food);
  return { matches, nearMatches };
}
