import type { StateCreator } from 'zustand';
import type { NutritionSettings } from '../types';
import { createId } from '../utils/id';
import { calculateTargets } from '../utils/macros';
import type { AppState, NutritionSettingsSlice } from './types';

export const createNutritionSettingsSlice: StateCreator<
  AppState,
  [['zustand/persist', unknown]],
  [],
  NutritionSettingsSlice
> = (set, get) => ({
  nutritionSettings: null,
  targets: null,

  saveNutritionSettings: (input) => {
    const nutritionSettings: NutritionSettings = { ...input, id: get().nutritionSettings?.id ?? createId() };
    const calculated = calculateTargets(nutritionSettings);
    // Only nutrition state changes here; the training schedule and workouts are separate.
    set({
      nutritionSettings,
      targets: nutritionSettings.customTargets ? { ...calculated, ...nutritionSettings.customTargets } : calculated,
    });
  },
});
