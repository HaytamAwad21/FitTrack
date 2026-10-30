import { describe, expect, it, vi } from 'vitest';
import { SEED_FOODS } from '../data/foods';
import { fuzzyKey, levenshtein, suggestFoods } from './foodSearch';

// Tests use a fixed food list; the real built-ins in library.json change with the user's library.
vi.mock('../data/foods', async () => ({ SEED_FOODS: (await import('../test/seedFoods')).SEED_FOODS }));

const names = (foods: { name: string }[]) => foods.map((food) => food.name);

describe('levenshtein', () => {
  it('counts single-character edits', () => {
    expect(levenshtein('salmon', 'salmen')).toBe(1);
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
  });
});

describe('fuzzyKey', () => {
  it('ignores case, extra spaces, raw/cooked labels and a trailing s', () => {
    expect(fuzzyKey('  Chicken   Breasts (raw) ')).toBe('chicken breast');
    expect(fuzzyKey('Cooked rice')).toBe('rice');
  });
});

describe('suggestFoods', () => {
  it('lists an exact name as a plain match', () => {
    const { matches, nearMatches } = suggestFoods(SEED_FOODS, 'almonds');
    expect(names(matches)).toEqual(['Almonds']);
    expect(nearMatches).toEqual([]);
  });

  it('suggests "Almonds" for "Almond" under Did you mean', () => {
    const { matches, nearMatches } = suggestFoods(SEED_FOODS, 'Almond');
    expect(names(matches)).toEqual([]);
    expect(names(nearMatches)[0]).toBe('Almonds');
  });

  it('matches anywhere in the name, case-insensitively', () => {
    expect(names(suggestFoods(SEED_FOODS, 'RICE').matches)).toContain('White rice');
  });

  it('allows two typos in names longer than 4 characters, not in short ones', () => {
    expect(names(suggestFoods(SEED_FOODS, 'Salmn').nearMatches)).toContain('Salmon');
    expect(names(suggestFoods(SEED_FOODS, 'Brocoli').nearMatches)).toContain('Broccoli');
    expect(names(suggestFoods(SEED_FOODS, 'Kiwo').nearMatches)).toEqual([]);
  });

  it('ignores raw/cooked labels and finds a typo inside a longer name', () => {
    expect(names(suggestFoods(SEED_FOODS, 'pasta raw').nearMatches)).toContain('Pasta');
    expect(names(suggestFoods(SEED_FOODS, 'chiken').nearMatches)).toContain('Chicken breast');
  });

  it('shows the whole library for empty text', () => {
    expect(suggestFoods(SEED_FOODS, '  ').matches).toHaveLength(SEED_FOODS.length);
  });
});
