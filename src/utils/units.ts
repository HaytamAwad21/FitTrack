import type { UnitSystem } from '../types';

export const LB_PER_KG = 2.20462262;
export const CM_PER_INCH = 2.54;

export interface NumericRange {
  min: number;
  max: number;
}

/** Valid body weight range, expressed in each unit system's display unit. */
export const WEIGHT_RANGE: Record<UnitSystem, NumericRange> = {
  metric: { min: 30, max: 300 },
  imperial: { min: 66, max: 660 },
};

/** Valid height range, expressed in each unit system's display unit. */
export const HEIGHT_RANGE: Record<UnitSystem, NumericRange> = {
  metric: { min: 120, max: 230 },
  imperial: { min: 47, max: 91 },
};

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

export function cmToInch(cm: number): number {
  return cm / CM_PER_INCH;
}

export function inchToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

/** Converts a stored weight (kg) into the given display unit. */
export function weightToDisplay(kg: number, unit: UnitSystem): number {
  return unit === 'imperial' ? kgToLb(kg) : kg;
}

/** Converts a weight entered in the given display unit into kilograms. */
export function weightFromDisplay(value: number, unit: UnitSystem): number {
  return unit === 'imperial' ? lbToKg(value) : value;
}

/** Converts a stored height (cm) into the given display unit. */
export function heightToDisplay(cm: number, unit: UnitSystem): number {
  return unit === 'imperial' ? cmToInch(cm) : cm;
}

/** Converts a height entered in the given display unit into centimeters. */
export function heightFromDisplay(value: number, unit: UnitSystem): number {
  return unit === 'imperial' ? inchToCm(value) : value;
}

export function weightUnitLabel(unit: UnitSystem): string {
  return unit === 'imperial' ? 'lbs' : 'kg';
}

export function heightUnitLabel(unit: UnitSystem): string {
  return unit === 'imperial' ? 'in' : 'cm';
}

/** Rounds to at most `maxDecimals` places and drops trailing zeros. */
export function formatNumber(value: number, maxDecimals = 1): string {
  const rounded = roundTo(value, maxDecimals);
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

export function formatWeight(kg: number, unit: UnitSystem): string {
  return `${formatNumber(weightToDisplay(kg, unit), 1)} ${weightUnitLabel(unit)}`;
}

export function formatHeight(cm: number, unit: UnitSystem): string {
  return `${formatNumber(heightToDisplay(cm, unit), 1)} ${heightUnitLabel(unit)}`;
}
