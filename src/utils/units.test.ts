import { describe, expect, it } from 'vitest';
import { formatNumber, heightFromDisplay, heightToDisplay, weightFromDisplay, weightToDisplay } from './units';
import { validateProfile } from './validation';

describe('unit conversion', () => {
  it('round-trips weight between kg and lbs', () => {
    const kg = weightFromDisplay(180, 'imperial');
    expect(kg).toBeCloseTo(81.6466, 3);
    expect(formatNumber(weightToDisplay(kg, 'imperial'), 1)).toBe('180');
    expect(weightToDisplay(80, 'metric')).toBe(80);
  });

  it('round-trips height between cm and inches', () => {
    expect(heightFromDisplay(70, 'imperial')).toBeCloseTo(177.8);
    expect(heightToDisplay(177.8, 'imperial')).toBeCloseTo(70);
  });
});

describe('validateProfile', () => {
  const base = {
    unitSystem: 'metric' as const,
    weight: '80',
    height: '180',
    age: '30',
  };

  it('accepts valid metric input', () => {
    expect(validateProfile(base)).toEqual({});
  });

  it('checks ranges in the selected unit system', () => {
    expect(validateProfile({ ...base, weight: '25' }).weight).toBeDefined();
    expect(validateProfile({ ...base, unitSystem: 'imperial', weight: '180', height: '70' })).toEqual({});
    expect(validateProfile({ ...base, unitSystem: 'imperial', weight: '700', height: '95' })).toMatchObject({
      weight: expect.any(String),
      height: expect.any(String),
    });
  });

  it('rejects out-of-range age', () => {
    expect(validateProfile({ ...base, age: '13' }).age).toBeDefined();
  });
});
