import { describe, expect, it } from 'vitest';
import type { FoodItem } from '../types';
import {
  applyMeasureToDraft,
  convertDraftKind,
  draftForReview,
  draftLooksUnusual,
  draftToNutrition,
  emptyFoodDraft,
  validateFoodDraft,
  type FoodDraft,
} from './foodDraft';
import { detectMeasure, servingMeasure } from './measure';

const weightDraft = (calories: string, protein: string): FoodDraft => ({ ...emptyFoodDraft(), calories, protein });

describe('new food drafts', () => {
  it('pre-selects Servings / scoop for "Myprotein chocolate smooth"', () => {
    const draft = applyMeasureToDraft(emptyFoodDraft(), detectMeasure('Myprotein chocolate smooth'));
    expect(draft).toMatchObject({ kind: 'serving', unitName: 'scoop', servingWeight: '30' });
  });

  it('stores serving foods per serving and weight foods per 100 g', () => {
    const scoop: FoodDraft = { kind: 'serving', unitName: 'scoop', servingWeight: '30', calories: '103', protein: '21', fiber: '' };
    expect(draftToNutrition(scoop)).toEqual({
      measure: servingMeasure('scoop', 30),
      caloriesPerServing: 103,
      proteinPerServing: 21,
      fiberPerServing: undefined,
    });
    expect(draftToNutrition(weightDraft('120', '22.5'))).toEqual({
      measure: { kind: 'weight' },
      caloriesPer100g: 120,
      proteinPer100g: 22.5,
      fiberPer100g: undefined,
    });
  });

  it('requires a unit name for serving foods', () => {
    const draft: FoodDraft = { ...weightDraft('100', '10'), kind: 'serving' };
    expect(validateFoodDraft(draft).unitName).toBeDefined();
    expect(draftToNutrition(draft)).toBeNull();
  });
});

describe('draftLooksUnusual', () => {
  it('flags labels that cannot be right, without blocking them', () => {
    expect(draftLooksUnusual(weightDraft('950', '0'))).toBe(true);
    expect(draftLooksUnusual(weightDraft('400', '120'))).toBe(true);
    expect(draftLooksUnusual(weightDraft('100', '30'))).toBe(true);
    expect(draftLooksUnusual({ kind: 'serving', unitName: 'scoop', servingWeight: '30', calories: '200', protein: '35', fiber: '' })).toBe(true);
    expect(draftLooksUnusual(weightDraft('165', '31'))).toBe(false);
    expect(draftToNutrition(weightDraft('950', '0'))).not.toBeNull();
  });
});

describe('convertDraftKind', () => {
  it('converts values with the serving weight', () => {
    const scoop: FoodDraft = { kind: 'weight', unitName: 'scoop', servingWeight: '30', calories: '400', protein: '80', fiber: '' };
    expect(convertDraftKind(scoop, 'serving')).toMatchObject({ kind: 'serving', calories: '120', protein: '24' });
  });

  it('keeps the numbers when no weight is known', () => {
    expect(convertDraftKind(weightDraft('108', '20'), 'serving')).toMatchObject({ kind: 'serving', unitName: 'serving', calories: '108', protein: '20' });
  });
});

describe('draftForReview', () => {
  it('opens a flagged food with Servings pre-selected and converted values', () => {
    const food: FoodItem = {
      id: 'x',
      name: 'Whey',
      state: 'n/a',
      measure: { kind: 'weight' },
      caloriesPer100g: 400,
      proteinPer100g: 80,
    };
    expect(draftForReview(food, servingMeasure('scoop', 30))).toMatchObject({
      kind: 'serving',
      unitName: 'scoop',
      servingWeight: '30',
      calories: '120',
      protein: '24',
    });
  });
});
