import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { SCHEMA_VERSION, migrateState } from './migrate';
import { createNutritionSettingsSlice } from './nutritionSettingsSlice';
import { createNutritionSlice } from './nutritionSlice';
import { createTrainingSettingsSlice } from './trainingSettingsSlice';
import { createTrainingSlice } from './trainingSlice';
import type { AppState, PersistedState } from './types';

export const STORAGE_KEY = 'fittrack-store';

export const useAppStore = create<AppState>()(
  persist(
    (...args) => ({
      schemaVersion: SCHEMA_VERSION,
      ...createNutritionSettingsSlice(...args),
      ...createTrainingSettingsSlice(...args),
      ...createNutritionSlice(...args),
      ...createTrainingSlice(...args),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedState => ({
        schemaVersion: state.schemaVersion,
        nutritionSettings: state.nutritionSettings,
        targets: state.targets,
        trainingSettings: state.trainingSettings,
        foods: state.foods,
        logs: state.logs,
        exercises: state.exercises,
        sessions: state.sessions,
      }),
      migrate: migrateState,
    },
  ),
);

export type { AppState, NutritionSettingsInput } from './types';
