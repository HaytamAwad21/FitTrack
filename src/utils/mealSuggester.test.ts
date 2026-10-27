import { describe, expect, it, vi } from 'vitest';
import { SEED_FOODS } from '../data/foods';
import type { FoodItem } from '../types';
import { isServingBased } from './measure';
import { bulkingProteinFloor, isProteinSource, portionLimits, suggestMeals } from './mealSuggester';

// Tests use a fixed food list; the real built-ins in library.json change with the user's library.
vi.mock('../data/foods', async () => ({ SEED_FOODS: (await import('../test/seedFoods')).SEED_FOODS }));

const foodsById = new Map(SEED_FOODS.map((food) => [food.id, food]));

function proteinDensity(calories: number, protein: number): number {
  return protein / calories;
}

describe('suggestMeals', () => {
  const cutting = suggestMeals({ foods: SEED_FOODS, budget: 600, goal: 'cutting', remainingProteinG: 120 });

  it('returns several cutting suggestions within 10% of budget with realistic portions', () => {
    expect(cutting.length).toBeGreaterThanOrEqual(6);
    for (const suggestion of cutting) {
      expect(suggestion.items.length).toBeGreaterThanOrEqual(2);
      expect(suggestion.items.length).toBeLessThanOrEqual(4);
      expect(suggestion.totalCalories).toBeGreaterThanOrEqual(540);
      expect(suggestion.totalCalories).toBeLessThanOrEqual(660);
      for (const item of suggestion.items) {
        const food = foodsById.get(item.foodId) as FoodItem;
        const limits = portionLimits(food);
        expect(Number.isInteger(Math.round((item.quantity / limits.step) * 1e6) / 1e6)).toBe(true);
        expect(item.quantity).toBeGreaterThanOrEqual(limits.min);
        expect(item.quantity).toBeLessThanOrEqual(limits.max);
        expect(item.unit === 'g').toBe(!isServingBased(food));
      }
    }
  });

  it('uses grams in 10 g steps, half scoops, and whole pieces or tubs', () => {
    const whey = foodsById.get('food-whey-protein') as FoodItem;
    const egg = foodsById.get('food-egg-boiled') as FoodItem;
    const yogurt = foodsById.get('food-protein-yogurt') as FoodItem;
    const rice = foodsById.get('food-white-rice') as FoodItem;
    expect(portionLimits(whey)).toMatchObject({ unit: 'serving', step: 0.5 });
    expect(portionLimits(egg)).toMatchObject({ unit: 'serving', step: 1 });
    expect(portionLimits(yogurt)).toMatchObject({ unit: 'serving', step: 1 });
    expect(portionLimits(rice)).toMatchObject({ unit: 'g', step: 10 });
  });

  it('builds every meal from a protein source plus a side', () => {
    for (const suggestion of cutting) {
      const foods = suggestion.items.map((item) => foodsById.get(item.foodId) as FoodItem);
      expect(foods.some(isProteinSource)).toBe(true);
      expect(foods.some((food) => !isProteinSource(food))).toBe(true);
    }
  });

  it('does not repeat foods across the first three suggestions', () => {
    const ids = cutting.slice(0, 3).flatMap((s) => s.items.map((item) => item.foodId));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never pairs the raw and cooked form of the same food', () => {
    for (const suggestion of cutting) {
      const names = suggestion.items.map((item) => (foodsById.get(item.foodId) as FoodItem).name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('ranks the top cutting suggestions by protein per calorie', () => {
    const densities = cutting.slice(0, 3).map((s) => proteinDensity(s.totalCalories, s.totalProteinG));
    expect(densities[0]).toBeGreaterThanOrEqual(densities[1] - 0.01);
  });

  it('meets 25% of remaining protein when bulking', () => {
    const remainingProteinG = 140;
    const suggestions = suggestMeals({
      foods: SEED_FOODS,
      budget: 900,
      goal: 'bulking',
      remainingProteinG,
    });
    expect(suggestions.length).toBeGreaterThanOrEqual(3);
    for (const suggestion of suggestions) {
      expect(suggestion.totalCalories).toBeGreaterThanOrEqual(810);
      expect(suggestion.totalCalories).toBeLessThanOrEqual(990);
      expect(suggestion.totalProteinG).toBeGreaterThanOrEqual(bulkingProteinFloor(remainingProteinG) - 0.5);
    }
  });

  it('skips foods flagged for review', () => {
    const flagged = SEED_FOODS.map((food) => ({ ...food, needsReview: true }));
    expect(suggestMeals({ foods: flagged, budget: 500, goal: 'cutting', remainingProteinG: 50 })).toEqual([]);
  });

  it('returns nothing for a zero budget or a library without both protein and sides', () => {
    expect(suggestMeals({ foods: SEED_FOODS, budget: 0, goal: 'cutting', remainingProteinG: 50 })).toEqual([]);
    const onlyProtein = SEED_FOODS.filter(isProteinSource);
    expect(suggestMeals({ foods: onlyProtein, budget: 500, goal: 'cutting', remainingProteinG: 50 })).toEqual([]);
  });
});
