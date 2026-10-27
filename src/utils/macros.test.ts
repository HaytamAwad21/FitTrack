import { describe, expect, it } from 'vitest';
import { ACTIVITY_MULTIPLIERS, calculateBmr, calculateTargets, calculateTdee } from './macros';

describe('calculateBmr', () => {
  it('uses the male Mifflin-St Jeor equation', () => {
    expect(calculateBmr({ weightKg: 80, heightCm: 180, age: 30, gender: 'male' })).toBe(1780);
  });

  it('uses the female Mifflin-St Jeor equation', () => {
    expect(calculateBmr({ weightKg: 60, heightCm: 165, age: 25, gender: 'female' })).toBeCloseTo(1345.25);
  });
});

describe('calculateTdee', () => {
  it('multiplies BMR by the activity multiplier', () => {
    expect(calculateTdee(1780, 'moderately_active')).toBeCloseTo(2759);
    expect(ACTIVITY_MULTIPLIERS.extremely_active).toBe(1.9);
  });
});

describe('calculateTargets', () => {
  it('subtracts 500 kcal and uses 2.2 g/kg protein when cutting', () => {
    const targets = calculateTargets({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      gender: 'male',
      activityLevel: 'moderately_active',
      goal: 'cutting',
    });
    // TDEE 2759 - 500 = 2259, rounded to nearest 10.
    expect(targets.calories).toBe(2260);
    expect(targets.proteinG).toBe(176);
  });

  it('adds 300 kcal and uses 2.0 g/kg protein when bulking', () => {
    const targets = calculateTargets({
      weightKg: 60,
      heightCm: 165,
      age: 25,
      gender: 'female',
      activityLevel: 'sedentary',
      goal: 'bulking',
    });
    // 1345.25 * 1.2 = 1614.3; + 300 = 1914.3, rounded to nearest 10.
    expect(targets.calories).toBe(1910);
    expect(targets.proteinG).toBe(120);
  });

  it('exposes optional fiber and micronutrient fields', () => {
    const targets = calculateTargets({
      weightKg: 70,
      heightCm: 175,
      age: 40,
      gender: 'male',
      activityLevel: 'sedentary',
      goal: 'cutting',
    });
    expect('fiberG' in targets).toBe(true);
    expect('micronutrients' in targets).toBe(true);
  });
});
