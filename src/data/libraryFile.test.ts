import { describe, expect, it } from 'vitest';
import { SEED_FOODS as FIXTURE_FOODS } from '../test/seedFoods';
import { parseFood, parseLibrary, serializeLibrary } from './libraryFile';
import library from './library.json';

describe('library file', () => {
  it('library.json is a valid food library', () => {
    expect(parseLibrary(library)).not.toBeNull();
  });

  it('round-trips foods unchanged, one food per line', () => {
    const text = serializeLibrary(FIXTURE_FOODS);
    expect(text.split('\n')).toHaveLength(FIXTURE_FOODS.length + 3);
    expect(parseLibrary(JSON.parse(text))).toEqual(FIXTURE_FOODS);
    expect(serializeLibrary([])).toBe('[]\n');
  });

  it('keeps saved meals with their ingredients', () => {
    const meal = {
      id: 'meal-1',
      name: 'Oatmeal',
      state: 'n/a',
      measure: { kind: 'weight' },
      caloriesPer100g: 229,
      proteinPer100g: 16.7,
      isComposite: true,
      ingredients: [{ foodId: 'food-rolled-oats', name: 'Oats (dry)', grams: 80, quantity: 80, unit: 'g' }],
    };
    expect(parseFood(meal)).toEqual(meal);
  });

  it('drops unknown fields', () => {
    const food = { ...FIXTURE_FOODS[0], extra: '<script>' };
    expect(parseFood(food)).toEqual(FIXTURE_FOODS[0]);
  });

  it('rejects malformed foods and libraries', () => {
    const base = FIXTURE_FOODS[0];
    expect(parseFood({ ...base, name: '' })).toBeNull();
    expect(parseFood({ ...base, state: 'fried' })).toBeNull();
    expect(parseFood({ ...base, caloriesPer100g: -5 })).toBeNull();
    expect(parseFood({ ...base, caloriesPer100g: Number.NaN })).toBeNull();
    expect(parseFood({ ...base, measure: { kind: 'serving', unitName: 'tub' } })).toBeNull();
    expect(parseFood({ ...base, caloriesPerServing: 100 })).toBeNull();
    expect(parseLibrary({ foods: [] })).toBeNull();
    expect(parseLibrary([base, base])).toBeNull();
  });
});
