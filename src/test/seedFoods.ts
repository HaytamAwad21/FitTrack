import type { FoodItem, FoodState } from '../types';
import { servingMeasure } from '../utils/measure';

/** Weight-based seed food; values per 100 g. */
function seed(
  id: string,
  name: string,
  state: FoodState,
  caloriesPer100g: number,
  proteinPer100g: number,
  fiberPer100g: number,
  stateLabel?: string,
): FoodItem {
  const food: FoodItem = { id, name, state, measure: { kind: 'weight' }, caloriesPer100g, proteinPer100g, fiberPer100g };
  if (stateLabel) food.stateLabel = stateLabel;
  return food;
}

/** Serving-based seed food; values per serving of `servingWeightG` grams. */
function servingSeed(
  id: string,
  name: string,
  state: FoodState,
  unitName: string,
  servingWeightG: number,
  caloriesPerServing: number,
  proteinPerServing: number,
  fiberPerServing: number,
  stateLabel?: string,
): FoodItem {
  const food: FoodItem = {
    id,
    name,
    state,
    measure: servingMeasure(unitName, servingWeightG),
    caloriesPerServing,
    proteinPerServing,
    fiberPerServing,
  };
  if (stateLabel) food.stateLabel = stateLabel;
  return food;
}

/**
 * Fixed built-in food list for tests. The app's real built-ins live in
 * src/data/library.json and change whenever the library is edited under the dev
 * server, so tests mock '../data/foods' with this list instead.
 * Weight foods are per 100 g; serving foods (scoops, tubs, pieces) are per serving.
 */
export const SEED_FOODS: FoodItem[] = [
  seed('food-chicken-breast-raw', 'Chicken breast', 'raw', 120, 22.5, 0),
  seed('food-chicken-breast', 'Chicken breast', 'cooked', 165, 31, 0),
  seed('food-white-rice-raw', 'White rice', 'raw', 365, 7.1, 1.3),
  seed('food-white-rice', 'White rice', 'cooked', 130, 2.7, 0.4),
  seed('food-brown-rice-raw', 'Brown rice', 'raw', 370, 7.9, 3.5),
  seed('food-brown-rice', 'Brown rice', 'cooked', 123, 2.7, 1.6),
  seed('food-pasta-raw', 'Pasta', 'raw', 371, 13, 3.2),
  seed('food-pasta-cooked', 'Pasta', 'cooked', 158, 5.8, 1.8),
  seed('food-potato-raw', 'Potato', 'raw', 77, 2, 2.2),
  seed('food-potato', 'Potato', 'cooked', 87, 1.9, 1.8, 'boiled'),
  seed('food-sweet-potato-raw', 'Sweet potato', 'raw', 86, 1.6, 3),
  seed('food-sweet-potato', 'Sweet potato', 'cooked', 90, 2, 3.3, 'baked'),
  seed('food-lean-beef-raw', 'Lean ground beef 90/10', 'raw', 176, 20, 0),
  seed('food-lean-beef', 'Lean ground beef 90/10', 'cooked', 217, 26, 0),
  seed('food-salmon-raw', 'Salmon', 'raw', 208, 20, 0),
  seed('food-salmon', 'Salmon', 'cooked', 206, 22, 0),
  seed('food-lentils-dry', 'Lentils', 'raw', 352, 24.6, 10.7, 'dry'),
  seed('food-lentils-cooked', 'Lentils', 'cooked', 116, 9, 7.9),
  servingSeed('food-whole-egg', 'Egg, whole', 'raw', 'piece', 50, 72, 6.3, 0),
  servingSeed('food-egg-boiled', 'Egg, whole', 'cooked', 'piece', 50, 78, 6.3, 0, 'boiled'),
  seed('food-rolled-oats', 'Oats', 'raw', 367, 12, 10.1, 'dry'),
  seed('food-greek-yogurt', 'Greek yogurt, nonfat', 'n/a', 59, 10.2, 0),
  servingSeed('food-protein-yogurt', 'Protein yogurt', 'n/a', 'tub', 200, 120, 20, 0),
  servingSeed('food-banana', 'Banana', 'n/a', 'piece', 120, 107, 1.3, 3.1),
  seed('food-olive-oil', 'Olive oil', 'n/a', 884, 0, 0),
  servingSeed('food-whey-protein', 'Whey protein powder', 'n/a', 'scoop', 30, 120, 24, 0),
  seed('food-broccoli', 'Broccoli', 'raw', 34, 2.8, 2.6),
  servingSeed('food-apple', 'Apple', 'n/a', 'piece', 180, 94, 0.5, 4.3),
  seed('food-almonds', 'Almonds', 'n/a', 579, 21.2, 12.5),
  seed('food-whole-wheat-bread', 'Whole wheat bread', 'n/a', 252, 12.4, 6),
  seed('food-cottage-cheese', 'Cottage cheese, low-fat', 'n/a', 72, 12.4, 0),
  seed('food-peanut-butter', 'Peanut butter', 'n/a', 588, 25, 6),
  seed('food-tuna', 'Tuna, canned in water', 'n/a', 116, 26, 0),
  seed('food-blueberries', 'Blueberries', 'n/a', 57, 0.7, 2.4),

  // Fruit (added in schema version 3)
  seed('food-grapes', 'Grapes', 'n/a', 69, 0.7, 0.9),
  servingSeed('food-orange', 'Orange', 'n/a', 'piece', 130, 61, 1.2, 3.1),
  seed('food-mandarin', 'Mandarin / clementine', 'n/a', 53, 0.8, 1.8),
  seed('food-strawberries', 'Strawberries', 'n/a', 32, 0.7, 2),
  seed('food-raspberries', 'Raspberries', 'n/a', 52, 1.2, 6.5),
  seed('food-blackberries', 'Blackberries', 'n/a', 43, 1.4, 5.3),
  seed('food-cherries', 'Cherries', 'n/a', 63, 1.1, 2.1),
  seed('food-watermelon', 'Watermelon', 'n/a', 30, 0.6, 0.4),
  seed('food-cantaloupe', 'Melon, cantaloupe', 'n/a', 34, 0.8, 0.9),
  seed('food-pineapple', 'Pineapple', 'n/a', 50, 0.5, 1.4),
  seed('food-mango', 'Mango', 'n/a', 60, 0.8, 1.6),
  seed('food-pear', 'Pear', 'n/a', 57, 0.4, 3.1),
  seed('food-peach', 'Peach', 'n/a', 39, 0.9, 1.5),
  seed('food-plum', 'Plum', 'n/a', 46, 0.7, 1.4),
  seed('food-kiwi', 'Kiwi', 'n/a', 61, 1.1, 3),
  seed('food-grapefruit', 'Grapefruit', 'n/a', 42, 0.8, 1.6),
  seed('food-papaya', 'Papaya', 'n/a', 43, 0.5, 1.7),
  seed('food-pomegranate', 'Pomegranate', 'n/a', 83, 1.7, 4),
  seed('food-figs', 'Figs, fresh', 'n/a', 74, 0.8, 2.9),
  seed('food-lemon', 'Lemon', 'n/a', 29, 1.1, 2.8),
  seed('food-avocado', 'Avocado', 'n/a', 160, 2, 6.7),
  seed('food-dates', 'Dates, Medjool', 'n/a', 277, 1.8, 6.7),
  seed('food-raisins', 'Raisins', 'n/a', 299, 3.1, 3.7),

  // Vegetables (added in schema version 3)
  seed('food-broccoli-cooked', 'Broccoli', 'cooked', 35, 2.4, 3.3),
  seed('food-spinach-raw', 'Spinach', 'raw', 23, 2.9, 2.2),
  seed('food-spinach-cooked', 'Spinach', 'cooked', 23, 3, 2.4),
  seed('food-carrot-raw', 'Carrot', 'raw', 41, 0.9, 2.8),
  seed('food-carrot-cooked', 'Carrot', 'cooked', 35, 0.8, 3),
  seed('food-tomato', 'Tomato', 'raw', 18, 0.9, 1.2),
  seed('food-cucumber', 'Cucumber', 'raw', 15, 0.7, 0.5),
  seed('food-lettuce', 'Lettuce, romaine', 'raw', 17, 1.2, 2.1),
  seed('food-bell-pepper', 'Bell pepper', 'raw', 31, 1, 2.1),
  seed('food-onion', 'Onion', 'raw', 40, 1.1, 1.7),
  seed('food-garlic', 'Garlic', 'raw', 149, 6.4, 2.1),
  seed('food-zucchini-raw', 'Zucchini', 'raw', 17, 1.2, 1),
  seed('food-zucchini-cooked', 'Zucchini', 'cooked', 15, 1.1, 1),
  seed('food-cauliflower-raw', 'Cauliflower', 'raw', 25, 1.9, 2),
  seed('food-cauliflower-cooked', 'Cauliflower', 'cooked', 23, 1.8, 2.3),
  seed('food-cabbage', 'Cabbage', 'raw', 25, 1.3, 2.5),
  seed('food-kale', 'Kale', 'raw', 35, 2.9, 4.1),
  seed('food-mushrooms-raw', 'Mushrooms, white', 'raw', 22, 3.1, 1),
  seed('food-mushrooms-cooked', 'Mushrooms, white', 'cooked', 28, 2.2, 2.2),
  seed('food-green-beans-raw', 'Green beans', 'raw', 31, 1.8, 2.7),
  seed('food-green-beans-cooked', 'Green beans', 'cooked', 35, 1.9, 3.2),
  seed('food-peas-raw', 'Green peas', 'raw', 81, 5.4, 5.7),
  seed('food-peas-cooked', 'Green peas', 'cooked', 84, 5.4, 5.5),
  seed('food-corn-raw', 'Sweet corn', 'raw', 86, 3.3, 2.7),
  seed('food-corn-cooked', 'Sweet corn', 'cooked', 96, 3.4, 2.4),
  seed('food-asparagus', 'Asparagus', 'raw', 20, 2.2, 2.1),
  seed('food-eggplant', 'Eggplant', 'raw', 25, 1, 3),
  seed('food-celery', 'Celery', 'raw', 16, 0.7, 1.6),
  seed('food-brussels-sprouts', 'Brussels sprouts', 'raw', 43, 3.4, 3.8),
  seed('food-beetroot', 'Beetroot', 'raw', 43, 1.6, 2.8),
  seed('food-arugula', 'Arugula', 'raw', 25, 2.6, 1.6),
  seed('food-radish', 'Radish', 'raw', 16, 0.7, 1.6),
  seed('food-pumpkin', 'Pumpkin', 'raw', 26, 1, 0.5),

  // Personal library (added in schema version 7), values from the product labels
  seed('food-cheese-9', 'Cheese 9%', 'n/a', 200, 30, 0),
  seed('food-cheese-15', 'Cheese 15%', 'n/a', 251, 29, 0),
  seed('food-cheese-5', 'Cheese 5%', 'n/a', 177, 33, 0),
  seed('food-mozzarella-sticks', 'Mozzarella sticks', 'n/a', 276, 24, 0),
  seed('food-cottage-cheese-5', 'Cottage cheese 5%', 'n/a', 95, 11, 0),
  servingSeed('food-blueberry-jam-protein-yogurt', 'Blueberry jam protein yogurt', 'n/a', 'tub', 200, 118, 20, 0),
  servingSeed('food-strawberry-protein-yogurt', 'Strawberry protein yogurt', 'n/a', 'tub', 200, 108, 20, 0),
  servingSeed('food-allin-protein-powder', 'Allin protein powder', 'n/a', 'scoop', 30, 129, 25, 0),
  servingSeed('food-myprotein-chocolate-smooth', 'Myprotein chocolate smooth powder', 'n/a', 'scoop', 30, 114, 23, 0),
];
