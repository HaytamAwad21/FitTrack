import type { Exercise, MuscleGroup } from '../types';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
];

/** Exercise library. Order within a group matters: the routine generator rotates through it. */
export const SEED_EXERCISES: Exercise[] = [
  // Chest
  { id: 'ex-barbell-bench-press', name: 'Barbell Bench Press', muscleGroup: 'Chest', type: 'compound' },
  { id: 'ex-incline-dumbbell-press', name: 'Incline Dumbbell Press', muscleGroup: 'Chest', type: 'compound' },
  { id: 'ex-weighted-push-up', name: 'Weighted Push-Up', muscleGroup: 'Chest', type: 'compound' },
  { id: 'ex-cable-fly', name: 'Cable Fly', muscleGroup: 'Chest', type: 'isolation' },
  { id: 'ex-pec-deck', name: 'Pec Deck', muscleGroup: 'Chest', type: 'isolation' },

  // Back
  { id: 'ex-pull-up', name: 'Pull-Up', muscleGroup: 'Back', type: 'compound' },
  { id: 'ex-barbell-row', name: 'Barbell Row', muscleGroup: 'Back', type: 'compound' },
  { id: 'ex-lat-pulldown', name: 'Lat Pulldown', muscleGroup: 'Back', type: 'compound' },
  { id: 'ex-seated-cable-row', name: 'Seated Cable Row', muscleGroup: 'Back', type: 'compound' },
  { id: 'ex-chest-supported-row', name: 'Chest-Supported Row', muscleGroup: 'Back', type: 'compound' },
  { id: 'ex-straight-arm-pulldown', name: 'Straight-Arm Pulldown', muscleGroup: 'Back', type: 'isolation' },

  // Shoulders
  { id: 'ex-overhead-press', name: 'Overhead Press', muscleGroup: 'Shoulders', type: 'compound' },
  { id: 'ex-seated-dumbbell-press', name: 'Seated Dumbbell Shoulder Press', muscleGroup: 'Shoulders', type: 'compound' },
  { id: 'ex-face-pull', name: 'Face Pull', muscleGroup: 'Shoulders', type: 'isolation' },
  { id: 'ex-lateral-raise', name: 'Lateral Raise', muscleGroup: 'Shoulders', type: 'isolation' },
  { id: 'ex-reverse-pec-deck', name: 'Reverse Pec Deck', muscleGroup: 'Shoulders', type: 'isolation' },

  // Biceps
  { id: 'ex-barbell-curl', name: 'Barbell Curl', muscleGroup: 'Biceps', type: 'isolation' },
  { id: 'ex-incline-dumbbell-curl', name: 'Incline Dumbbell Curl', muscleGroup: 'Biceps', type: 'isolation' },
  { id: 'ex-hammer-curl', name: 'Hammer Curl', muscleGroup: 'Biceps', type: 'isolation' },
  { id: 'ex-cable-curl', name: 'Cable Curl', muscleGroup: 'Biceps', type: 'isolation' },

  // Triceps
  { id: 'ex-close-grip-bench-press', name: 'Close-Grip Bench Press', muscleGroup: 'Triceps', type: 'compound' },
  { id: 'ex-parallel-bar-dip', name: 'Parallel Bar Dip', muscleGroup: 'Triceps', type: 'compound' },
  { id: 'ex-triceps-pushdown', name: 'Cable Triceps Pushdown', muscleGroup: 'Triceps', type: 'isolation' },
  { id: 'ex-overhead-triceps-extension', name: 'Overhead Cable Triceps Extension', muscleGroup: 'Triceps', type: 'isolation' },
  { id: 'ex-skull-crusher', name: 'Skull Crusher', muscleGroup: 'Triceps', type: 'isolation' },

  // Quads
  { id: 'ex-back-squat', name: 'Back Squat', muscleGroup: 'Quads', type: 'compound' },
  { id: 'ex-front-squat', name: 'Front Squat', muscleGroup: 'Quads', type: 'compound' },
  { id: 'ex-leg-press', name: 'Leg Press', muscleGroup: 'Quads', type: 'compound' },
  { id: 'ex-bulgarian-split-squat', name: 'Bulgarian Split Squat', muscleGroup: 'Quads', type: 'compound' },
  { id: 'ex-leg-extension', name: 'Leg Extension', muscleGroup: 'Quads', type: 'isolation' },

  // Hamstrings
  { id: 'ex-romanian-deadlift', name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', type: 'compound' },
  { id: 'ex-conventional-deadlift', name: 'Conventional Deadlift', muscleGroup: 'Hamstrings', type: 'compound' },
  { id: 'ex-lying-leg-curl', name: 'Lying Leg Curl', muscleGroup: 'Hamstrings', type: 'isolation' },
  { id: 'ex-seated-leg-curl', name: 'Seated Leg Curl', muscleGroup: 'Hamstrings', type: 'isolation' },
  { id: 'ex-nordic-curl', name: 'Nordic Hamstring Curl', muscleGroup: 'Hamstrings', type: 'isolation' },

  // Glutes
  { id: 'ex-barbell-hip-thrust', name: 'Barbell Hip Thrust', muscleGroup: 'Glutes', type: 'compound' },
  { id: 'ex-walking-lunge', name: 'Walking Lunge', muscleGroup: 'Glutes', type: 'compound' },
  { id: 'ex-cable-kickback', name: 'Cable Glute Kickback', muscleGroup: 'Glutes', type: 'isolation' },
  { id: 'ex-hip-abduction', name: 'Hip Abduction Machine', muscleGroup: 'Glutes', type: 'isolation' },

  // Calves
  { id: 'ex-standing-calf-raise', name: 'Standing Calf Raise', muscleGroup: 'Calves', type: 'isolation' },
  { id: 'ex-seated-calf-raise', name: 'Seated Calf Raise', muscleGroup: 'Calves', type: 'isolation' },
  { id: 'ex-leg-press-calf-raise', name: 'Leg Press Calf Raise', muscleGroup: 'Calves', type: 'isolation' },
  { id: 'ex-single-leg-calf-raise', name: 'Single-Leg Calf Raise', muscleGroup: 'Calves', type: 'isolation' },

  // Core
  { id: 'ex-plank', name: 'Plank', muscleGroup: 'Core', type: 'isolation' },
  { id: 'ex-dead-bug', name: 'Dead Bug', muscleGroup: 'Core', type: 'isolation' },
  { id: 'ex-cable-crunch', name: 'Cable Crunch', muscleGroup: 'Core', type: 'isolation' },
  { id: 'ex-hanging-leg-raise', name: 'Hanging Leg Raise', muscleGroup: 'Core', type: 'isolation' },
  { id: 'ex-ab-wheel-rollout', name: 'Ab Wheel Rollout', muscleGroup: 'Core', type: 'isolation' },
];
