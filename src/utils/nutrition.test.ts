import { describe, expect, it, vi } from 'vitest';
import { SEED_FOODS } from '../data/foods';
import type { FoodItem } from '../types';
import { basisOf, formatAmount, servingMeasure } from './measure';
import { basisFromLogged, buildEntryFromFood, computePortion, filterFoods } from './nutrition';

// Tests use a fixed food list; the real built-ins in library.json change with the user's library.
vi.mock('../data/foods', async () => ({ SEED_FOODS: (await import('../test/seedFoods')).SEED_FOODS }));

const seedFood = (id: string) => SEED_FOODS.find((food) => food.id === id) as FoodItem;
/** Fixed test food (label values for rolled oats), independent of the built-in list. */
const oats: FoodItem = {
  id: 'test-rolled-oats',
  name: 'Rolled oats',
  state: 'raw',
  stateLabel: 'dry',
  measure: { kind: 'weight' },
  caloriesPer100g: 379,
  proteinPer100g: 13,
  fiberPer100g: 10.1,
};
const whey = seedFood('food-whey-protein');
const blueberries = seedFood('food-blueberries');

const myprotein: FoodItem = {
  id: 'myprotein',
  name: 'Myprotein whey',
  state: 'n/a',
  measure: servingMeasure('scoop', 30),
  caloriesPerServing: 103,
  proteinPerServing: 21,
};

const yogurtTub: FoodItem = {
  id: 'yogurt',
  name: 'Strawberry protein yogurt',
  state: 'n/a',
  measure: servingMeasure('tub'),
  caloriesPerServing: 120,
  proteinPerServing: 20,
};

describe('computePortion', () => {
  it('weight foods: 80 g of rolled oats (dry) is 303 kcal and 10.4 g protein', () => {
    expect(computePortion(basisOf(oats), { quantity: 80, unit: 'g' })).toMatchObject({
      quantity: 80,
      unit: 'g',
      grams: 80,
      calories: 303,
      proteinG: 10.4,
    });
  });

  it('serving foods: 1.5 scoops of a 103 kcal / 21 g food is 155 kcal and 31.5 g', () => {
    expect(computePortion(basisOf(myprotein), { quantity: 1.5, unit: 'serving' })).toMatchObject({
      quantity: 1.5,
      unit: 'scoop',
      unitPlural: 'scoops',
      grams: 45,
      calories: 155,
      proteinG: 31.5,
    });
  });

  it('serving foods logged in grams convert with the serving weight', () => {
    expect(computePortion(basisOf(myprotein), { quantity: 45, unit: 'g' })).toMatchObject({ quantity: 1.5, calories: 155 });
  });

  it('rejects amounts that do not fit the measure', () => {
    expect(computePortion(basisOf(yogurtTub), { quantity: 200, unit: 'g' })).toBeNull();
    expect(computePortion(basisOf(oats), { quantity: 1, unit: 'serving' })).toBeNull();
  });
});

describe('buildEntryFromFood', () => {
  it('stores the native unit: 1 tub is shown as "1 tub", not grams', () => {
    const entry = buildEntryFromFood(yogurtTub, { quantity: 1, unit: 'serving' });
    expect(entry).toMatchObject({ quantity: 1, unit: 'tub', grams: 0, calories: 120, proteinG: 20 });
    expect(formatAmount(entry ?? { grams: 0 })).toBe('1 tub');
  });

  it('names entries with the state label', () => {
    expect(buildEntryFromFood(oats, { quantity: 80, unit: 'g' })).toMatchObject({ name: 'Rolled oats (dry)', unit: 'g' });
  });

  it('oatmeal: 80 g oats + 1 scoop whey + 100 g blueberries totals 480 kcal and 35.1 g', () => {
    const parts = [
      computePortion(basisOf(oats), { quantity: 80, unit: 'g' }),
      computePortion(basisOf(whey), { quantity: 1, unit: 'serving' }),
      computePortion(basisOf(blueberries), { quantity: 100, unit: 'g' }),
    ];
    expect(parts.map((part) => part?.calories)).toEqual([303, 120, 57]);
    expect(parts.reduce((sum, part) => sum + (part?.calories ?? 0), 0)).toBe(480);
    expect(Math.round(parts.reduce((sum, part) => sum + (part?.proteinG ?? 0), 0) * 10) / 10).toBe(35.1);
    expect(parts.reduce((sum, part) => sum + (part?.grams ?? 0), 0)).toBe(210);
  });

  it('scales a saved meal into an ingredient breakdown in each ingredient’s unit', () => {
    const oatmeal: FoodItem = {
      id: 'meal-oatmeal',
      name: 'Oatmeal',
      state: 'n/a',
      measure: { kind: 'weight' },
      caloriesPer100g: 229,
      proteinPer100g: 16.7,
      isComposite: true,
      ingredients: [
        { foodId: oats.id, name: 'Rolled oats (dry)', grams: 80, quantity: 80, unit: 'g' },
        { foodId: whey.id, name: 'Whey protein powder', grams: 30, quantity: 1, unit: 'scoop' },
        { foodId: blueberries.id, name: 'Blueberries', grams: 100, quantity: 100, unit: 'g' },
      ],
    };
    const entry = buildEntryFromFood(oatmeal, { quantity: 420, unit: 'g' }, [...SEED_FOODS, oats]);
    expect(entry?.ingredients?.map(formatAmount)).toEqual(['160 g', '2 scoops (60 g)', '200 g']);
    expect(entry?.ingredients?.[1].calories).toBe(240);
  });
});

describe('basisFromLogged', () => {
  it('rescales frozen values when an entry is edited', () => {
    const basis = basisFromLogged({ quantity: 1.5, unit: 'scoop', unitPlural: 'scoops', grams: 45, calories: 155, proteinG: 31.5 });
    expect(basis && computePortion(basis, { quantity: 2, unit: 'serving' })).toMatchObject({ grams: 60, calories: 207, proteinG: 42 });
  });
});

describe('filterFoods', () => {
  it('matches on the display name including state', () => {
    const names = filterFoods(SEED_FOODS, 'chicken breast (raw').map((food) => food.id);
    expect(names).toEqual(['food-chicken-breast-raw']);
  });
});
