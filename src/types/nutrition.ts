/** Micronutrient amounts keyed by nutrient name (for example "vitaminC_mg"). */
export type Micronutrients = Record<string, number>;

export interface NutritionTargets {
  calories: number;
  proteinG: number;
  fiberG?: number;
  micronutrients?: Micronutrients;
}

/** Preparation state the nutrition values refer to. "n/a" for foods like whey, oils or fruit. */
export type FoodState = 'raw' | 'cooked' | 'n/a';

/** Food measured by weight. Nutrition is stored per 100 g and logged in grams. */
export interface WeightMeasure {
  kind: 'weight';
}

/** Food measured in servings such as scoops, tubs or pieces. Nutrition is stored per serving. */
export interface ServingMeasure {
  kind: 'serving';
  /** Singular unit, for example "scoop". */
  unitName: string;
  /** Plural unit, for example "scoops". */
  unitNamePlural: string;
  /** Weight of one serving in grams, when known. Enables logging by grams. */
  servingWeightG?: number;
}

export type Measure = WeightMeasure | ServingMeasure;

/** Nutrition of a weight-based food, per 100 g. */
export interface WeightNutrition {
  measure: WeightMeasure;
  caloriesPer100g: number;
  proteinPer100g: number;
  fiberPer100g?: number;
  caloriesPerServing?: never;
  proteinPerServing?: never;
  fiberPerServing?: never;
}

/** Nutrition of a serving-based food, per serving (as printed on most labels). */
export interface ServingNutrition {
  measure: ServingMeasure;
  caloriesPerServing: number;
  proteinPerServing: number;
  fiberPerServing?: number;
  caloriesPer100g?: never;
  proteinPer100g?: never;
  fiberPer100g?: never;
}

export type FoodNutrition = WeightNutrition | ServingNutrition;

/** One ingredient of a saved multi-ingredient meal. */
export interface FoodIngredient {
  foodId?: string;
  name: string;
  /** Weight in grams; 0 when unknown. */
  grams: number;
  /** Amount in `unit`: grams for "g", otherwise servings. */
  quantity?: number;
  /** "g" or the serving unit name, for example "scoop". */
  unit?: string;
}

export interface FoodItemBase {
  id: string;
  name: string;
  state: FoodState;
  /** Overrides the state word shown after the name, for example "boiled" or "dry". */
  stateLabel?: string;
  micronutrients?: Micronutrients;
  /** True for a saved multi-ingredient meal. */
  isComposite?: boolean;
  ingredients?: FoodIngredient[];
  /** Set by migration when the values or the measurement should be checked by the user. */
  needsReview?: boolean;
  /** Explains why the food was flagged for review. */
  reviewNote?: string;
  /** Measurement suggested by migration; the edit form pre-selects it. */
  suggestedMeasure?: ServingMeasure;
}

export type WeightFoodItem = FoodItemBase & WeightNutrition;
export type ServingFoodItem = FoodItemBase & ServingNutrition;

/** Library food: either weight-based (per 100 g) or serving-based (per serving), never both. */
export type FoodItem = WeightFoodItem | ServingFoodItem;

/** Amount fields shared by log entries and their ingredients. */
export interface LoggedAmount {
  /** Weight in grams. 0 when unknown (a serving without a known weight, or an old entry). */
  grams: number;
  /** Amount in `unit`. Missing on entries logged before units were tracked. */
  quantity?: number;
  /** "g" or the serving unit name, for example "tub". */
  unit?: string;
  /** Plural of `unit`, for example "tubs". */
  unitPlural?: string;
}

/** Ingredient breakdown stored on a logged multi-ingredient meal. Values are frozen at log time. */
export interface MealIngredient extends LoggedAmount {
  foodId?: string;
  name: string;
  calories: number;
  proteinG: number;
}

/** Logged food or meal. Totals are frozen at log time, so editing a library food never rewrites history. */
export interface MealEntry extends LoggedAmount {
  id: string;
  /** Library food this entry was logged from, if any. */
  foodId?: string;
  name: string;
  calories: number;
  proteinG: number;
  fiberG?: number;
  /** Full ISO 8601 timestamp of when the entry was logged. */
  timestamp: string;
  ingredients?: MealIngredient[];
}

export interface DailyLog {
  /** Same value as `date`; one log per local calendar day. */
  id: string;
  /** Local date, YYYY-MM-DD. */
  date: string;
  entries: MealEntry[];
}
