import { describe, expect, it } from 'vitest';
import type { DailyLog, FoodItem, MealEntry } from '../types';
import {
  amountForFood,
  countFoodEntries,
  nutritionChanged,
  recalculateEntry,
  recalculateLogs,
  unlinkFood,
} from './entryUpdates';
import { servingMeasure } from './measure';

const almonds: FoodItem = {
  id: 'almonds',
  name: 'Almonds',
  state: 'n/a',
  measure: { kind: 'weight' },
  caloriesPer100g: 600,
  proteinPer100g: 21,
  fiberPer100g: 12.5,
};

const whey: FoodItem = {
  id: 'whey',
  name: 'Whey',
  state: 'n/a',
  measure: servingMeasure('scoop', 30),
  caloriesPerServing: 130,
  proteinPerServing: 25,
};

const entry = (patch: Partial<MealEntry>): MealEntry => ({
  id: 'e1',
  foodId: 'almonds',
  name: 'Almonds',
  grams: 123,
  quantity: 123,
  unit: 'g',
  calories: 712,
  proteinG: 26,
  timestamp: '2026-10-30T08:00:00.000Z',
  ...patch,
});

const log = (date: string, entries: MealEntry[]): DailyLog => ({ id: date, date, entries });

const meal = entry({
  id: 'meal',
  foodId: null,
  name: 'Snack',
  grams: 153,
  quantity: 153,
  calories: 830,
  proteinG: 50,
  ingredients: [
    { foodId: 'almonds', name: 'Almonds', grams: 123, quantity: 123, unit: 'g', calories: 712, proteinG: 26 },
    { foodId: 'whey', name: 'Whey', grams: 30, quantity: 1, unit: 'scoop', calories: 118, proteinG: 24 },
  ],
});

describe('recalculateEntry', () => {
  it('Almonds at 600 kcal/100 g: the 123 g entry becomes 738 kcal', () => {
    expect(recalculateEntry(entry({}), almonds)).toMatchObject({ grams: 123, calories: 738, proteinG: 25.8, fiberG: 15.4 });
  });

  it('serving entries use the stored quantity', () => {
    const logged = entry({ foodId: 'whey', grams: 45, quantity: 1.5, unit: 'scoop', unitPlural: 'scoops', calories: 180 });
    expect(recalculateEntry(logged, whey)).toMatchObject({ quantity: 1.5, calories: 195, proteinG: 37.5 });
  });

  it('multi-ingredient entries recalculate one ingredient and re-sum the meal', () => {
    const updated = recalculateEntry(meal, almonds);
    expect(updated.ingredients?.map((item) => item.calories)).toEqual([738, 118]);
    expect(updated).toMatchObject({ calories: 856, proteinG: 49.8, grams: 153 });
  });

  it('keeps the ingredient breakdown adding up when a saved meal itself changes', () => {
    const food: FoodItem = { ...almonds, id: 'bowl', caloriesPer100g: 200, proteinPer100g: 20 };
    const logged = entry({
      foodId: 'bowl',
      grams: 100,
      quantity: 100,
      calories: 100,
      proteinG: 10,
      ingredients: [{ foodId: 'x', name: 'X', grams: 100, quantity: 100, unit: 'g', calories: 100, proteinG: 10 }],
    });
    const updated = recalculateEntry(logged, food);
    expect(updated).toMatchObject({ calories: 200, proteinG: 20 });
    expect(updated.ingredients?.[0]).toMatchObject({ calories: 200, proteinG: 20 });
  });

  it('leaves an entry that uses another food unchanged', () => {
    const other = entry({ foodId: 'other' });
    expect(recalculateEntry(other, almonds)).toBe(other);
  });
});

describe('amountForFood after a measure change', () => {
  it('grams convert through the serving weight', () => {
    expect(amountForFood({ grams: 60, quantity: 60, unit: 'g' }, whey)).toEqual({ quantity: 60, unit: 'g' });
  });

  it('servings fall back to grams on a weight food, and to nothing without a weight', () => {
    expect(amountForFood({ grams: 60, quantity: 2, unit: 'scoop' }, almonds)).toEqual({ quantity: 60, unit: 'g' });
    expect(amountForFood({ grams: 0, quantity: 2, unit: 'scoop' }, almonds)).toBeNull();
  });
});

describe('recalculateLogs', () => {
  const logs = { today: log('today', [entry({})]), older: log('older', [entry({ id: 'e2' })]) };

  it('"Today only" leaves older days unchanged', () => {
    const next = recalculateLogs(logs, almonds, 'today');
    expect(next.today.entries[0].calories).toBe(738);
    expect(next.older).toBe(logs.older);
  });

  it('"All entries" updates every day', () => {
    const next = recalculateLogs(logs, almonds);
    expect([next.today.entries[0].calories, next.older.entries[0].calories]).toEqual([738, 738]);
  });

  it('handles a date with no log', () => {
    expect(recalculateLogs(logs, almonds, 'missing')).toEqual(logs);
  });
});

describe('countFoodEntries', () => {
  it('counts entries and meals containing the food', () => {
    const logs = {
      today: log('today', [entry({}), meal]),
      older: log('older', [entry({ id: 'e2' }), entry({ id: 'e3', foodId: 'x' })]),
    };
    expect(countFoodEntries(logs, 'almonds', 'today')).toEqual({ date: 2, all: 3 });
    expect(countFoodEntries(logs, 'almonds', 'nothing')).toEqual({ date: 0, all: 3 });
  });
});

describe('unlinkFood', () => {
  it('keeps stored values and sets foodId to null', () => {
    const next = unlinkFood({ today: log('today', [entry({}), meal]) }, 'almonds');
    expect(next.today.entries[0]).toMatchObject({ foodId: null, calories: 712 });
    expect(next.today.entries[1].ingredients?.[0]).toMatchObject({ foodId: null, calories: 712 });
    expect(next.today.entries[1].ingredients?.[1].foodId).toBe('whey');
  });
});

describe('nutritionChanged', () => {
  it('ignores a rename and notices macro or measure changes', () => {
    expect(nutritionChanged(almonds, { ...almonds })).toBe(false);
    expect(nutritionChanged(almonds, { ...almonds, caloriesPer100g: 579 })).toBe(true);
    expect(nutritionChanged(whey, { ...whey, measure: servingMeasure('scoop', 35) })).toBe(true);
  });
});
