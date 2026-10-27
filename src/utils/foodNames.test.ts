import { describe, expect, it, vi } from 'vitest';
import { SEED_FOODS } from '../data/foods';
import type { FoodItem } from '../types';
import { findDuplicateFood, findFoodByDisplayName, formatFoodName, nextAvailableName } from './foodNames';

// Tests use a fixed food list; the real built-ins in library.json change with the user's library.
vi.mock('../data/foods', async () => ({ SEED_FOODS: (await import('../test/seedFoods')).SEED_FOODS }));

describe('formatFoodName', () => {
  it('appends the state or its label', () => {
    expect(formatFoodName({ name: 'Chicken breast', state: 'raw' })).toBe('Chicken breast (raw)');
    expect(formatFoodName({ name: 'Chicken breast', state: 'cooked' })).toBe('Chicken breast (cooked)');
    expect(formatFoodName({ name: 'Potato', state: 'cooked', stateLabel: 'boiled' })).toBe('Potato (boiled)');
    expect(formatFoodName({ name: 'Olive oil', state: 'n/a' })).toBe('Olive oil');
  });
});

describe('duplicate detection', () => {
  it('matches trimmed, case-insensitive names with the same state', () => {
    expect(findDuplicateFood(SEED_FOODS, '  chicken BREAST ', 'raw')?.id).toBe('food-chicken-breast-raw');
    expect(findDuplicateFood(SEED_FOODS, 'Olive oil', 'raw')).toBeUndefined();
    expect(findDuplicateFood(SEED_FOODS, 'Chicken breast', 'raw', 'food-chicken-breast-raw')).toBeUndefined();
  });

  it('suggests the next free numbered name', () => {
    const foods: FoodItem[] = [
      ...SEED_FOODS,
      { id: 'x', name: 'Olive oil (2)', state: 'n/a', measure: { kind: 'weight' }, caloriesPer100g: 884, proteinPer100g: 0 },
    ];
    expect(nextAvailableName(SEED_FOODS, 'Olive oil', 'n/a')).toBe('Olive oil (2)');
    expect(nextAvailableName(foods, 'Olive oil', 'n/a')).toBe('Olive oil (3)');
  });

  it('finds foods by full display name', () => {
    expect(findFoodByDisplayName(SEED_FOODS, 'OATS (dry)')?.id).toBe('food-rolled-oats');
    expect(findFoodByDisplayName(SEED_FOODS, 'oats')).toBeUndefined();
  });
});
