import type { ActivityLevel } from '../types';

export interface ActivityLevelOption {
  value: ActivityLevel;
  label: string;
  description: string;
}

export const ACTIVITY_LEVEL_OPTIONS: ActivityLevelOption[] = [
  { value: 'sedentary', label: 'Sedentary', description: 'Desk job, little or no exercise' },
  { value: 'lightly_active', label: 'Lightly active', description: 'Light exercise 1-3 days per week' },
  { value: 'moderately_active', label: 'Moderately active', description: 'Moderate exercise 3-5 days per week' },
  { value: 'very_active', label: 'Very active', description: 'Hard exercise 6-7 days per week' },
  { value: 'extremely_active', label: 'Extremely active', description: 'Physical job plus hard training' },
];
