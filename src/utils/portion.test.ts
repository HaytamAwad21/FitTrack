import { describe, expect, it } from 'vitest';
import { servingMeasure } from './measure';
import { parseQuantity, reconcileQuantity, stepServings, switchQuantityMode } from './portion';

const scoop = servingMeasure('scoop', 30);
const tub = servingMeasure('tub');

describe('parseQuantity', () => {
  it('takes whole grams for weight foods', () => {
    expect(parseQuantity({ kind: 'weight' }, { mode: 'grams', text: '80' }).amount).toEqual({ quantity: 80, unit: 'g' });
    expect(parseQuantity({ kind: 'weight' }, { mode: 'grams', text: '80.5' }).error).toBeDefined();
  });

  it('takes servings in 0.25 steps, minimum 0.25', () => {
    expect(parseQuantity(scoop, { mode: 'servings', text: '1.5' }).amount).toEqual({ quantity: 1.5, unit: 'serving' });
    expect(parseQuantity(scoop, { mode: 'servings', text: '0.25' }).amount).toEqual({ quantity: 0.25, unit: 'serving' });
    expect(parseQuantity(scoop, { mode: 'servings', text: '0.3' }).error).toBe('Use steps of 0.25');
    expect(parseQuantity(scoop, { mode: 'servings', text: '0' }).error).toBeDefined();
  });

  it('accepts grams for a serving food only when its weight is known', () => {
    expect(parseQuantity(scoop, { mode: 'grams', text: '45' }).amount).toEqual({ quantity: 45, unit: 'g' });
    // A tub without a weight ignores the grams mode and reads servings.
    expect(parseQuantity(tub, { mode: 'grams', text: '2' }).amount).toEqual({ quantity: 2, unit: 'serving' });
  });
});

describe('stepServings', () => {
  it('moves in half servings and never below 0.25', () => {
    expect(stepServings('1', 1)).toBe('1.5');
    expect(stepServings('1', -1)).toBe('0.5');
    expect(stepServings('0.5', -1)).toBe('0.25');
    expect(stepServings('', 1)).toBe('1');
  });
});

describe('switchQuantityMode', () => {
  it('converts between servings and grams with the serving weight', () => {
    expect(switchQuantityMode(scoop, { mode: 'servings', text: '1.5' }, 'grams')).toEqual({ mode: 'grams', text: '45' });
    expect(switchQuantityMode(scoop, { mode: 'grams', text: '60' }, 'servings')).toEqual({ mode: 'servings', text: '2' });
  });
});

describe('reconcileQuantity', () => {
  it('resets the amount when the measure kind changes', () => {
    expect(reconcileQuantity({ kind: 'weight' }, scoop, { mode: 'grams', text: '80' })).toEqual({ mode: 'servings', text: '1' });
    expect(reconcileQuantity(scoop, scoop, { mode: 'servings', text: '2' })).toEqual({ mode: 'servings', text: '2' });
  });
});
