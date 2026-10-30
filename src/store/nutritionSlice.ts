import type { StateCreator } from 'zustand';
import { SEED_FOODS } from '../data/foods';
import type { DailyLog, FoodItem, MealEntry } from '../types';
import { recalculateLogs, unlinkFood } from '../utils/entryUpdates';
import { createId } from '../utils/id';
import type { AppState, NutritionSlice } from './types';

function emptyLog(date: string): DailyLog {
  return { id: date, date, entries: [] };
}

export const createNutritionSlice: StateCreator<
  AppState,
  [['zustand/persist', unknown]],
  [],
  NutritionSlice
> = (set) => ({
  foods: SEED_FOODS,
  logs: {},

  addFood: (food) => {
    const item = { ...food, id: createId() } as FoodItem;
    set((state) => ({ foods: [...state.foods, item] }));
    return item;
  },

  updateFood: (id, patch) =>
    set((state) => ({
      foods: state.foods.map((food) => (food.id === id ? ({ ...food, ...patch } as FoodItem) : food)),
    })),

  replaceFood: (id, data) =>
    set((state) => ({
      foods: state.foods.map((food) => (food.id === id ? ({ ...data, id } as FoodItem) : food)),
    })),

  deleteFood: (id) =>
    set((state) => ({ foods: state.foods.filter((food) => food.id !== id), logs: unlinkFood(state.logs, id) })),

  refreshFoodEntries: (id, date) =>
    set((state) => {
      const food = state.foods.find((item) => item.id === id);
      return food ? { logs: recalculateLogs(state.logs, food, date) } : {};
    }),

  addEntries: (date, entries) =>
    set((state) => {
      const log = state.logs[date] ?? emptyLog(date);
      const timestamp = new Date().toISOString();
      const created: MealEntry[] = entries.map((entry) => ({ ...entry, id: createId(), timestamp }));
      return { logs: { ...state.logs, [date]: { ...log, entries: [...log.entries, ...created] } } };
    }),

  updateEntry: (date, entryId, patch) =>
    set((state) => {
      const log = state.logs[date];
      if (!log) return {};
      const entries = log.entries.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry));
      return { logs: { ...state.logs, [date]: { ...log, entries } } };
    }),

  deleteEntry: (date, entryId) =>
    set((state) => {
      const log = state.logs[date];
      if (!log) return {};
      const entries = log.entries.filter((entry) => entry.id !== entryId);
      return { logs: { ...state.logs, [date]: { ...log, entries } } };
    }),
});
