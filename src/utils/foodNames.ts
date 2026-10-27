import type { FoodItem, FoodState } from '../types';

export const FOOD_STATE_OPTIONS: { value: FoodState; label: string }[] = [
  { value: 'raw', label: 'Raw' },
  { value: 'cooked', label: 'Cooked' },
  { value: 'n/a', label: 'N/A' },
];

/** How a duplicate name is resolved: overwrite the existing food or save under a numbered name. */
export type DuplicateChoice = 'replace' | 'new';

type NamedFood = Pick<FoodItem, 'name' | 'state' | 'stateLabel'>;

/** Display name with the state appended, for example "Chicken breast (raw)". */
export function formatFoodName(food: NamedFood): string {
  const name = food.name.trim();
  const label = food.stateLabel ?? (food.state === 'n/a' ? '' : food.state);
  return label ? `${name} (${label})` : name;
}

export function normalizeFoodName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Key that identifies a name + state pair for duplicate checks. */
export function duplicateSignature(name: string, state: FoodState): string {
  return `${normalizeFoodName(name)}|${state}`;
}

/** Finds a library food with the same name (case-insensitive, trimmed) and the same state. */
export function findDuplicateFood(
  foods: FoodItem[],
  name: string,
  state: FoodState,
  excludeId?: string,
): FoodItem | undefined {
  const target = normalizeFoodName(name);
  if (target === '') return undefined;
  return foods.find(
    (food) => food.id !== excludeId && food.state === state && normalizeFoodName(food.name) === target,
  );
}

/** Returns "name (2)", "name (3)", ... whichever is the first not yet in the library. */
export function nextAvailableName(
  foods: FoodItem[],
  name: string,
  state: FoodState,
  excludeId?: string,
): string {
  const base = name.trim();
  for (let suffix = 2; ; suffix++) {
    const candidate = `${base} (${suffix})`;
    if (!findDuplicateFood(foods, candidate, state, excludeId)) return candidate;
  }
}

/** Finds a library food whose full display name matches the typed text. */
export function findFoodByDisplayName(foods: FoodItem[], text: string): FoodItem | undefined {
  const target = normalizeFoodName(text);
  if (target === '') return undefined;
  return foods.find((food) => normalizeFoodName(formatFoodName(food)) === target);
}
