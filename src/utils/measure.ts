import type { FoodItem, FoodNutrition, LoggedAmount, Measure, ServingMeasure, ServingNutrition } from '../types';
import { formatNumber } from './units';

export const WEIGHT_MEASURE: Measure = { kind: 'weight' };

/** Pluralizes a unit name: scoop -> scoops, glass -> glasses, patty -> patties. */
export function pluralizeUnit(unit: string): string {
  const word = unit.trim();
  if (word === '') return word;
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

export function servingMeasure(unitName: string, servingWeightG?: number): ServingMeasure {
  const name = unitName.trim();
  const measure: ServingMeasure = { kind: 'serving', unitName: name, unitNamePlural: pluralizeUnit(name) };
  if (servingWeightG !== undefined) measure.servingWeightG = servingWeightG;
  return measure;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** True for serving-based foods. Foods stored before schema version 5 have no measure and are weight-based. */
export function isServingBased<T extends FoodNutrition>(food: T): food is Extract<T, ServingNutrition> {
  return food.measure?.kind === 'serving';
}

export function measureOf(food: FoodNutrition): Measure {
  return isServingBased(food) ? food.measure : WEIGHT_MEASURE;
}

/** Nutrition values together with what they refer to: per 100 g (weight) or per serving. */
export interface NutritionBasis {
  measure: Measure;
  calories: number;
  protein: number;
  fiber?: number;
}

export function basisOf(food: FoodNutrition): NutritionBasis {
  if (isServingBased(food)) {
    return {
      measure: food.measure,
      calories: food.caloriesPerServing,
      protein: food.proteinPerServing,
      fiber: food.fiberPerServing,
    };
  }
  return {
    measure: WEIGHT_MEASURE,
    calories: food.caloriesPer100g,
    protein: food.proteinPer100g,
    fiber: food.fiberPer100g,
  };
}

interface MeasureRule {
  /** Patterns tested against the lower-cased food name. */
  match: RegExp[];
  /** Patterns that cancel the rule even when `match` hits. */
  exclude?: RegExp[];
  unitName: string;
  servingWeightG?: number;
}

/**
 * Keyword rules for auto-detecting how a new food is measured. The first matching
 * rule wins, so more specific rules (bars, yogurt) come before broader ones (protein powders).
 * Anything that matches no rule is weight-based.
 */
export const MEASURE_RULES: MeasureRule[] = [
  { match: [/\bbars?\b/], unitName: 'bar' },
  { match: [/yogh?urt/, /\bskyr\b/, /pudding/, /\btubs?\b/, /\bcups?\b/], unitName: 'tub', servingWeightG: 200 },
  // Creatine is dosed in small scoops, so it gets its own weight.
  { match: [/creatine/], unitName: 'scoop', servingWeightG: 5 },
  {
    match: [/whey/, /protein powder/, /casein/, /isolate/, /gainer/, /pre-?\s?workout/, /\bscoops?\b/, /myprotein/],
    unitName: 'scoop',
    servingWeightG: 30,
  },
  { match: [/\beggs?\b/], exclude: [/white/], unitName: 'piece', servingWeightG: 50 },
  { match: [/bread/, /toast/, /\bslices?\b/], unitName: 'slice', servingWeightG: 30 },
  { match: [/\bcans?\b/], unitName: 'can' },
  { match: [/\bbananas?\b/], unitName: 'piece', servingWeightG: 120 },
  { match: [/\bapples?\b/], unitName: 'piece', servingWeightG: 180 },
  { match: [/\boranges?\b/], unitName: 'piece', servingWeightG: 130 },
];

/** Suggests how a food should be measured from its name. Pure; the user can always override it. */
export function detectMeasure(name: string): Measure {
  const text = name.toLowerCase();
  for (const rule of MEASURE_RULES) {
    const matches = rule.match.some((pattern) => pattern.test(text));
    const excluded = (rule.exclude ?? []).some((pattern) => pattern.test(text));
    if (matches && !excluded) return servingMeasure(rule.unitName, rule.servingWeightG);
  }
  return { kind: 'weight' };
}

/** Step used by the meal suggester: half scoops, whole tubs, pieces, bars and cans. */
export function servingStep(measure: ServingMeasure): number {
  return measure.unitName.toLowerCase() === 'scoop' ? 0.5 : 1;
}

/** "per 100 g", "per scoop" or "per tub (200 g)". */
export function basisLabel(measure: Measure): string {
  if (measure.kind === 'weight') return 'per 100 g';
  return measure.servingWeightG !== undefined
    ? `per ${measure.unitName} (${formatNumber(measure.servingWeightG, 1)} g)`
    : `per ${measure.unitName}`;
}

/** "103 kcal / 21 g protein per scoop" or "120 kcal / 22.5 g protein per 100 g". */
export function formatNutritionBasis(food: FoodItem): string {
  const basis = basisOf(food);
  return `${formatNumber(basis.calories, 0)} kcal / ${formatNumber(basis.protein, 1)} g protein ${basisLabel(basis.measure)}`;
}

/** "200 g", "1 tub", or "1.5 scoops (45 g)" when the weight is known. Empty when nothing is known. */
export function formatAmount(amount: LoggedAmount): string {
  const { quantity, unit, grams } = amount;
  if (!unit || quantity === undefined) return grams > 0 ? `${formatNumber(grams, 0)} g` : '';
  if (unit === 'g') return `${formatNumber(quantity, 0)} g`;
  const label = quantity === 1 ? unit : (amount.unitPlural ?? pluralizeUnit(unit));
  const text = `${formatNumber(quantity, 2)} ${label}`;
  return grams > 0 ? `${text} (${formatNumber(grams, 0)} g)` : text;
}
