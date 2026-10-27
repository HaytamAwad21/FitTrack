import { describe, expect, it, vi } from 'vitest';
import { SEED_EXERCISES } from '../data/exercises';
import { SEED_FOODS } from '../data/foods';
import type { FoodItem, MealEntry } from '../types';
import { migrateState, parseServingGrams } from './migrate';

// Tests use a fixed food list; the real built-ins in library.json change with the user's library.
vi.mock('../data/foods', async () => ({ SEED_FOODS: (await import('../test/seedFoods')).SEED_FOODS }));

const v1State = {
  schemaVersion: 1,
  user: null,
  targets: null,
  exercises: [],
  routine: null,
  sessions: [],
  foods: [
    {
      id: 'food-rolled-oats',
      name: 'Rolled oats, dry',
      servingDescription: '1/2 cup (40 g)',
      caloriesPerServing: 150,
      proteinPerServing: 5,
      fiberPerServing: 4,
    },
    {
      id: 'custom-bar',
      name: 'Protein bar',
      servingDescription: '1 bar (60 g)',
      caloriesPerServing: 240,
      proteinPerServing: 20,
    },
    {
      id: 'custom-lasagna',
      name: 'Lasagna',
      servingDescription: '1 serving',
      caloriesPerServing: 520,
      proteinPerServing: 30,
    },
  ],
  logs: {
    '2026-10-20': {
      id: '2026-10-20',
      date: '2026-10-20',
      entries: [
        { id: 'e1', foodId: 'food-rolled-oats', name: 'Rolled oats, dry', servings: 2, calories: 300, proteinG: 10, timestamp: '2026-10-20T08:00:00.000Z' },
        { id: 'e2', foodId: 'custom-lasagna', name: 'Lasagna', servings: 1, calories: 520, proteinG: 30, timestamp: '2026-10-20T19:00:00.000Z' },
        { id: 'e3', name: 'Snack', servings: 1, calories: 200, proteinG: 4, timestamp: '2026-10-20T15:00:00.000Z' },
      ],
    },
  },
};

describe('parseServingGrams', () => {
  it('reads grams from common serving descriptions', () => {
    expect(parseServingGrams('1 cup (158 g)')).toBe(158);
    expect(parseServingGrams('100 g')).toBe(100);
    expect(parseServingGrams('100g drained')).toBe(100);
    expect(parseServingGrams('1 serving')).toBeNull();
    expect(parseServingGrams(undefined)).toBeNull();
  });
});

describe('migrateState v1 to v2', () => {
  const migrated = migrateState(structuredClone(v1State), 1);
  const foods = migrated.foods as FoodItem[];

  it('replaces seed foods with the current seed list and keeps user foods', () => {
    expect(migrated.schemaVersion).toBe(9);
    expect(foods).toHaveLength(SEED_FOODS.length + 2);
    expect(foods.find((f) => f.id === 'food-rolled-oats')?.caloriesPer100g).toBe(367);
  });

  it('converts user foods with a parseable weight to per 100 g', () => {
    const bar = foods.find((f) => f.id === 'custom-bar');
    expect(bar).toMatchObject({ caloriesPer100g: 400, proteinPer100g: 33.3, state: 'n/a', measure: { kind: 'weight' } });
    // The name says "bar", so version 5 flags it for a per-bar measurement.
    expect(bar?.suggestedMeasure?.unitName).toBe('bar');
  });

  it('flags user foods without a parseable weight for review', () => {
    const lasagna = foods.find((f) => f.id === 'custom-lasagna');
    expect(lasagna?.needsReview).toBe(true);
    expect(lasagna?.reviewNote).toContain('1 serving');
  });

  it('keeps log totals and derives grams where possible', () => {
    const entries = migrated.logs['2026-10-20'].entries as MealEntry[];
    expect(entries.map((e) => e.grams)).toEqual([80, 0, 0]);
    expect(entries.map((e) => e.calories)).toEqual([300, 520, 200]);
    expect(entries[0]).not.toHaveProperty('servings');
  });

  it('does not crash on empty or malformed state', () => {
    expect(() => migrateState({}, 1)).not.toThrow();
    expect(() => migrateState(null, 0)).not.toThrow();
    expect(migrateState({ logs: { x: null }, foods: 'bad' }, 1).foods).toHaveLength(SEED_FOODS.length);
  });

  it('returns current-version state unchanged', () => {
    const current = { schemaVersion: 9, foods: SEED_FOODS };
    expect(migrateState(current, 9)).toBe(current);
  });
});

describe('migrateState v2 and v3 to v4', () => {
  it('adds missing fruit and vegetable seeds to version 3 data too', () => {
    const v3Foods = SEED_FOODS.filter((food) => food.id !== 'food-kiwi');
    const migrated = migrateState({ schemaVersion: 3, foods: v3Foods, logs: {} }, 3);
    expect((migrated.foods as FoodItem[]).some((food) => food.id === 'food-kiwi')).toBe(true);
  });

  it('adds new fruit and vegetable seeds without duplicating user foods', () => {
    const userGrapes = { id: 'my-grapes', name: ' grapes ', state: 'n/a', caloriesPer100g: 70, proteinPer100g: 0.6 };
    const v2Foods = SEED_FOODS.filter((food) => !food.id.startsWith('food-grapes') && food.id !== 'food-kiwi');
    const migrated = migrateState({ schemaVersion: 2, foods: [...v2Foods, userGrapes], logs: {} }, 2);
    const foods = migrated.foods as FoodItem[];
    expect(migrated.schemaVersion).toBe(9);
    expect(foods.some((food) => food.id === 'food-kiwi')).toBe(true);
    expect(foods.some((food) => food.id === 'food-grapes')).toBe(false);
    expect(foods.filter((food) => food.name.trim().toLowerCase() === 'grapes')).toHaveLength(1);
    expect(foods).toHaveLength(SEED_FOODS.length);
  });
});

describe('migrateState v4 to v5', () => {
  /** Version 4 foods: per 100 g and no measure. */
  const legacy = (id: string, name: string, caloriesPer100g: number, proteinPer100g: number, extra = {}) => ({
    id,
    name,
    state: 'n/a',
    caloriesPer100g,
    proteinPer100g,
    ...extra,
  });
  const entry = {
    id: 'e1',
    foodId: 'food-whey-protein',
    name: 'Whey protein powder',
    grams: 30,
    calories: 120,
    proteinG: 24,
    timestamp: '2026-10-26T08:00:00.000Z',
  };
  const v4State = {
    schemaVersion: 4,
    foods: [
      legacy('food-whey-protein', 'Whey protein powder', 400, 80, { fiberPer100g: 0 }),
      legacy('food-banana', 'Banana', 89, 1.1, { fiberPer100g: 2.6 }),
      legacy('food-chicken-breast', 'Chicken breast', 165, 31, { state: 'cooked' }),
      legacy('c52bf4b3', 'myprotein chocolate smooth', 113, 20),
      legacy('yog1', 'Strawberry protein yogurt', 72, 13.3, {
        needsReview: true,
        reviewNote: 'Label: 108 kcal, 20 g protein per cup.',
      }),
      legacy('oats1', 'Oats', 368, 12.3, { state: 'raw', stateLabel: 'dry' }),
    ],
    logs: { '2026-10-26': { id: '2026-10-26', date: '2026-10-26', entries: [entry] } },
  };
  const migrated = migrateState(structuredClone(v4State), 4);
  const foods = migrated.foods as FoodItem[];
  const find = (id: string) => foods.find((food) => food.id === id);

  it('turns seed whey and fruit into serving foods, keeping their per-100 g values', () => {
    expect(migrated.schemaVersion).toBe(9);
    expect(find('food-whey-protein')).toMatchObject({
      measure: { kind: 'serving', unitName: 'scoop', unitNamePlural: 'scoops', servingWeightG: 30 },
      caloriesPerServing: 120,
      proteinPerServing: 24,
    });
    expect(find('food-whey-protein')).not.toHaveProperty('caloriesPer100g');
    expect(find('food-banana')).toMatchObject({ measure: { unitName: 'piece', servingWeightG: 120 }, caloriesPerServing: 107 });
  });

  it('keeps other foods weight-based', () => {
    expect(find('food-chicken-breast')).toMatchObject({ measure: { kind: 'weight' }, caloriesPer100g: 165 });
    expect(find('oats1')).toMatchObject({ measure: { kind: 'weight' } });
    expect(find('oats1')?.needsReview).toBeUndefined();
  });

  it('flags user foods that look serving-based, with the suggested unit', () => {
    expect(find('c52bf4b3')).toMatchObject({
      measure: { kind: 'weight' },
      caloriesPer100g: 113,
      needsReview: true,
      suggestedMeasure: { unitName: 'scoop' },
      reviewNote: 'This looks like it should be measured in scoops.',
    });
    expect(find('yog1')?.reviewNote).toBe(
      'This looks like it should be measured in tubs. Label: 108 kcal, 20 g protein per cup.',
    );
  });

  it('adds the new protein yogurt seed and leaves log entries unchanged', () => {
    expect(find('food-protein-yogurt')).toMatchObject({ measure: { unitName: 'tub' }, caloriesPerServing: 120 });
    expect(migrated.logs['2026-10-26'].entries).toEqual([entry]);
  });
});

describe('migrateState v5 to v6', () => {
  /** Shaped like a real v5 store: 4-day Upper / Lower A/B plan, a finished session and custom targets. */
  const v5State = {
    schemaVersion: 5,
    user: {
      id: 'u1',
      unitSystem: 'metric',
      weightKg: 81.6,
      heightCm: 177.8,
      age: 30,
      gender: 'male',
      activityLevel: 'moderately_active',
      goal: 'cutting',
      trainingDaysPerWeek: 4,
      trainingWeekdays: [0, 1, 3, 4],
      customTargets: { calories: 2200, proteinG: 180 },
    },
    targets: { calories: 2200, proteinG: 180 },
    foods: SEED_FOODS,
    logs: {},
    exercises: SEED_EXERCISES.filter((exercise) => exercise.id !== 'ex-chest-supported-row'),
    routine: {
      id: 'routine-upper-lower-0134',
      splitName: 'Upper / Lower',
      days: [
        { id: 'upper-a', name: 'Upper A', muscleGroups: ['Chest', 'Back'], exercises: [{ exerciseId: 'ex-barbell-bench-press', targetSets: 3, targetReps: '6-8' }, { exerciseId: 'ex-triceps-pushdown', targetSets: 3, targetReps: '10-12' }] },
        { id: 'lower-a', name: 'Lower A', muscleGroups: ['Quads'], exercises: [{ exerciseId: 'ex-back-squat', targetSets: 3, targetReps: '6-8' }] },
        { id: 'upper-b', name: 'Upper B', muscleGroups: ['Chest'], exercises: [{ exerciseId: 'ex-incline-dumbbell-press', targetSets: 3, targetReps: '10' }] },
        { id: 'lower-b', name: 'Lower B', muscleGroups: ['Hamstrings'], exercises: [{ exerciseId: 'ex-romanian-deadlift', targetSets: 4, targetReps: '6-8' }] },
      ],
      weekdayMap: { 0: 'upper-a', 1: 'lower-a', 3: 'upper-b', 4: 'lower-b' },
    },
    sessions: [
      {
        id: 's1',
        date: '2026-10-19',
        routineDayId: 'upper-a',
        routineDayName: 'Upper A',
        exercises: [{ exerciseId: 'ex-barbell-bench-press', sets: [{ id: 'set1', weightKg: 61.2, reps: 6, rpe: 8.5 }] }],
        completed: true,
      },
    ],
  };
  const migrated = migrateState(structuredClone(v5State), 5) as unknown as Record<string, unknown> & {
    nutritionSettings: Record<string, unknown>;
    trainingSettings: { trainingWeekdays: number[]; routine: { presetId: string; weekdayAssignments: Record<number, string | null>; workoutTypes: { id: string; name: string; isBuiltIn: boolean; builtInKey?: string; exercises: { exerciseId: string; sets: number; repMin: number; repMax: number; order: number }[] }[] } };
    sessions: { workoutTypeId: string; workoutName: string; exercises: { targetSets?: number; repMin?: number; repMax?: number; sets: unknown[] }[] }[];
    exercises: { id: string }[];
  };
  const workouts = migrated.trainingSettings.routine.workoutTypes;
  const byName = (name: string) => workouts.find((workout) => workout.name === name);

  it('moves stats into nutrition settings and drops the old keys', () => {
    expect(migrated.schemaVersion).toBe(9);
    expect(migrated).not.toHaveProperty('user');
    expect(migrated).not.toHaveProperty('routine');
    expect(migrated.nutritionSettings).toMatchObject({ weightKg: 81.6, goal: 'cutting', customTargets: { calories: 2200 } });
    expect(migrated.nutritionSettings).not.toHaveProperty('trainingWeekdays');
  });

  it('turns routine days into workouts and keeps the weekday mapping', () => {
    expect(migrated.trainingSettings.trainingWeekdays).toEqual([0, 1, 3, 4]);
    const assignments = migrated.trainingSettings.routine.weekdayAssignments;
    expect([0, 1, 3, 4].map((day) => workouts.find((workout) => workout.id === assignments[day])?.name)).toEqual([
      'Upper A',
      'Lower A',
      'Upper B',
      'Lower B',
    ]);
    expect([2, 5, 6].map((day) => assignments[day])).toEqual([null, null, null]);
    // A/B variants are not what the preset would produce, so the label is Custom.
    expect(migrated.trainingSettings.routine.presetId).toBe('custom');
  });

  it('marks the first day of each kind built-in and converts rep targets', () => {
    expect(byName('Upper A')).toMatchObject({ isBuiltIn: true, builtInKey: 'upper' });
    expect(byName('Upper B')).toMatchObject({ isBuiltIn: false });
    expect(byName('Upper A')?.exercises[1]).toMatchObject({ exerciseId: 'ex-triceps-pushdown', repMin: 10, repMax: 12, order: 1 });
    expect(byName('Upper B')?.exercises[0]).toMatchObject({ repMin: 10, repMax: 10 });
    expect(byName('Lower B')?.exercises[0].sets).toBe(4);
  });

  it('adds missing built-in workouts and library exercises', () => {
    expect(['Push', 'Pull', 'Legs', 'Full Body'].every((name) => byName(name)?.isBuiltIn)).toBe(true);
    expect(workouts.filter((workout) => workout.builtInKey === 'upper')).toHaveLength(1);
    expect(migrated.exercises.some((exercise) => exercise.id === 'ex-chest-supported-row')).toBe(true);
  });

  it('keeps sessions with a snapshot of their plan', () => {
    const [session] = migrated.sessions;
    expect(session.workoutName).toBe('Upper A');
    expect(session.workoutTypeId).toBe(byName('Upper A')?.id);
    expect(session.exercises[0]).toMatchObject({ targetSets: 3, repMin: 6, repMax: 8 });
    expect(session.exercises[0].sets).toHaveLength(1);
  });

  it('keeps the preset label when the old split matches it exactly', () => {
    const ppl = {
      ...structuredClone(v5State),
      routine: {
        id: 'routine-ppl-024',
        days: [
          { id: 'push', name: 'Push', muscleGroups: ['Chest'], exercises: [] },
          { id: 'pull', name: 'Pull', muscleGroups: ['Back'], exercises: [] },
          { id: 'legs', name: 'Legs', muscleGroups: ['Quads'], exercises: [] },
        ],
        weekdayMap: { 0: 'push', 2: 'pull', 4: 'legs' },
      },
    };
    const result = migrateState(ppl, 5) as unknown as { trainingSettings: { routine: { presetId: string } } };
    expect(result.trainingSettings.routine.presetId).toBe('ppl');
  });

  it('does not crash without a user or routine', () => {
    const result = migrateState({ schemaVersion: 5, user: null, routine: null, sessions: [], foods: [] }, 5);
    expect(result).toMatchObject({ nutritionSettings: null, trainingSettings: null });
  });
});

describe('migrateState v6 to v7', () => {
  it('adds the personal-library foods without duplicating copies the user already has', () => {
    const userCopy = {
      id: '87a429d1-9139-45c6-94e5-07b41f78b355',
      name: 'cheese 9%',
      state: 'n/a',
      measure: { kind: 'weight' },
      caloriesPer100g: 200,
      proteinPer100g: 30,
      fiberPer100g: 0,
    };
    const v6Foods = SEED_FOODS.filter((food) => food.id !== 'food-cheese-9' && food.id !== 'food-cheese-15');
    const migrated = migrateState({ schemaVersion: 6, foods: [...v6Foods, userCopy], logs: {} }, 6);
    const foods = migrated.foods as FoodItem[];
    expect(migrated.schemaVersion).toBe(9);
    expect(foods.filter((food) => food.name.toLowerCase() === 'cheese 9%')).toHaveLength(1);
    expect(foods.some((food) => food.id === 'food-cheese-15')).toBe(true);
  });
});

describe('migrateState v7 to v8', () => {
  const userFood = (id: string, name: string): FoodItem => ({
    id,
    name,
    state: 'n/a',
    measure: { kind: 'weight' },
    caloriesPer100g: 276,
    proteinPer100g: 24,
  });

  it('gives the user copies of renamed built-ins the tidied names', () => {
    const foods = [
      userFood('a', 'mozzarela sticks'),
      userFood('b', 'Myprotein chocolate smooth poweder'),
      { ...userFood('food-rolled-oats', 'oats'), state: 'raw' as const, stateLabel: 'dry' },
      userFood('c', 'Grapes'),
    ];
    const migrated = migrateState({ schemaVersion: 7, foods, logs: {} }, 7);
    expect(migrated.schemaVersion).toBe(9);
    expect(migrated.foods.map((food) => food.name)).toEqual([
      'Mozzarella sticks',
      'Myprotein chocolate smooth powder',
      'Oats',
      'Grapes',
    ]);
  });

  it('skips a rename that would duplicate another food', () => {
    const foods = [userFood('a', 'mozzarela sticks'), userFood('b', 'Mozzarella sticks')];
    const migrated = migrateState({ schemaVersion: 7, foods, logs: {} }, 7);
    expect(migrated.foods.map((food) => food.name)).toEqual(['mozzarela sticks', 'Mozzarella sticks']);
  });
});

describe('migrateState v8 to v9', () => {
  it('adds the new exercises and keeps the user exercises and same-name copies', () => {
    const original = SEED_EXERCISES.filter((exercise) => exercise.id !== 'ex-dumbbell-bench-press').slice(0, 54);
    const userCopy = { id: 'user-1', name: 'flat dumbbell bench press', muscleGroup: 'Chest', type: 'compound' };
    const migrated = migrateState({ schemaVersion: 8, foods: [], logs: {}, exercises: [...original, userCopy] }, 8);
    expect(migrated.schemaVersion).toBe(9);
    const names = migrated.exercises.map((exercise) => exercise.name.toLowerCase());
    expect(names.filter((name) => name === 'flat dumbbell bench press')).toHaveLength(1);
    expect(migrated.exercises.some((exercise) => exercise.id === 'ex-single-arm-cable-pushdown')).toBe(true);
    expect(migrated.exercises.slice(0, 55)).toEqual([...original, userCopy]);
    expect(migrated.exercises).toHaveLength(SEED_EXERCISES.length);
  });
});
