import { describe, expect, it, vi } from 'vitest';
import { SEED_FOODS } from '../data/foods';
import type { FoodItem } from '../types';
import { detectMeasure, formatAmount, formatNutritionBasis, pluralizeUnit } from './measure';

// Tests use a fixed food list; the real built-ins in library.json change with the user's library.
vi.mock('../data/foods', async () => ({ SEED_FOODS: (await import('../test/seedFoods')).SEED_FOODS }));

describe('detectMeasure', () => {
  it.each([
    ['Myprotein chocolate smooth', 'scoop', 30],
    ['Whey isolate vanilla', 'scoop', 30],
    ['Casein', 'scoop', 30],
    ['Mass gainer', 'scoop', 30],
    ['Pre-workout', 'scoop', 30],
    ['Creatine monohydrate', 'scoop', 5],
    ['Strawberry protein yogurt', 'tub', 200],
    ['Skyr vanilla', 'tub', 200],
    ['Strauss PRO chocolate pudding', 'tub', 200],
    ['Eggs', 'piece', 50],
    ['Egg, whole', 'piece', 50],
    ['Whole wheat bread', 'slice', 30],
    ['Toast', 'slice', 30],
    ['Banana', 'piece', 120],
    ['Apple', 'piece', 180],
    ['Orange', 'piece', 130],
  ])('detects %s as %s', (name, unitName, servingWeightG) => {
    expect(detectMeasure(name)).toEqual({
      kind: 'serving',
      unitName,
      unitNamePlural: pluralizeUnit(unitName),
      servingWeightG,
    });
  });

  it('detects bars and cans without a default weight', () => {
    expect(detectMeasure('Protein bar')).toEqual({ kind: 'serving', unitName: 'bar', unitNamePlural: 'bars' });
    expect(detectMeasure('Tuna can')).toEqual({ kind: 'serving', unitName: 'can', unitNamePlural: 'cans' });
  });

  it.each(['Chicken breast', 'White rice', 'Pasta', 'Potato', 'Rolled oats', 'Lentils', 'Olive oil', 'Egg whites', 'Eggplant', 'Pineapple', 'Barley', 'Tuna, canned in water'])(
    'keeps %s weight-based',
    (name) => {
      expect(detectMeasure(name)).toEqual({ kind: 'weight' });
    },
  );
});

describe('pluralizeUnit', () => {
  it('handles common endings', () => {
    expect(pluralizeUnit('scoop')).toBe('scoops');
    expect(pluralizeUnit('piece')).toBe('pieces');
    expect(pluralizeUnit('glass')).toBe('glasses');
    expect(pluralizeUnit('patty')).toBe('patties');
  });
});

describe('formatAmount', () => {
  it('shows the native unit', () => {
    expect(formatAmount({ grams: 200, quantity: 200, unit: 'g' })).toBe('200 g');
    expect(formatAmount({ grams: 0, quantity: 1, unit: 'tub', unitPlural: 'tubs' })).toBe('1 tub');
    expect(formatAmount({ grams: 45, quantity: 1.5, unit: 'scoop', unitPlural: 'scoops' })).toBe('1.5 scoops (45 g)');
  });

  it('falls back to grams for entries logged before units were tracked', () => {
    expect(formatAmount({ grams: 150 })).toBe('150 g');
    expect(formatAmount({ grams: 0 })).toBe('');
  });
});

describe('formatNutritionBasis', () => {
  it('describes values in the food’s own unit', () => {
    const whey = SEED_FOODS.find((food) => food.id === 'food-whey-protein') as FoodItem;
    const chicken = SEED_FOODS.find((food) => food.id === 'food-chicken-breast-raw') as FoodItem;
    expect(formatNutritionBasis(whey)).toBe('120 kcal / 24 g protein per scoop (30 g)');
    expect(formatNutritionBasis(chicken)).toBe('120 kcal / 22.5 g protein per 100 g');
  });
});
