import { describe, expect, it, vi } from 'vitest';
import { SEED_FOODS } from '../data/foods';
import { changeIngredientState, changeIngredientText, createIngredientDraft, resolveIngredientDraft } from './ingredientDraft';

// Tests use a fixed food list; the real built-ins in library.json change with the user's library.
vi.mock('../data/foods', async () => ({ SEED_FOODS: (await import('../test/seedFoods')).SEED_FOODS }));

describe('entering a food', () => {
  it('an exact name uses the library food', () => {
    const row = changeIngredientText(createIngredientDraft(), '  almonds ', SEED_FOODS);
    const resolved = resolveIngredientDraft(row, SEED_FOODS);
    expect(resolved).toMatchObject({ isNew: false, name: 'Almonds' });
    expect(resolved.food?.id).toBe('food-almonds');
  });

  it('an unknown name becomes a new food, measured by detectMeasure', () => {
    const row = changeIngredientText(createIngredientDraft(), 'Vanilla protein scoop', SEED_FOODS);
    const resolved = resolveIngredientDraft(row, SEED_FOODS);
    expect(resolved.isNew).toBe(true);
    expect(resolved.measure).toMatchObject({ kind: 'serving', unitName: 'scoop' });
  });

  it('choosing raw on an existing name and state uses that food instead of a duplicate', () => {
    const typed = changeIngredientText(createIngredientDraft(), 'Chicken breast', SEED_FOODS);
    expect(typed.foodId).toBeNull();
    const row = changeIngredientState(typed, 'raw', SEED_FOODS);
    expect(row.foodId).toBe('food-chicken-breast-raw');
  });

  it('choosing a state with no match keeps it a new food', () => {
    const typed = changeIngredientText(createIngredientDraft(), 'Tofu', SEED_FOODS);
    expect(changeIngredientState(typed, 'cooked', SEED_FOODS)).toMatchObject({ foodId: null, state: 'cooked' });
  });

  it('leaving a library food resets the state', () => {
    const typed = changeIngredientText(createIngredientDraft(), 'Chicken breast', SEED_FOODS);
    const picked = changeIngredientState(typed, 'raw', SEED_FOODS);
    expect(changeIngredientText(picked, 'Chicken', SEED_FOODS)).toMatchObject({ foodId: null, state: 'n/a' });
  });
});
