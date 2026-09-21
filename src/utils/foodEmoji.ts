import type { FoodCategory } from '../types/database';

export const CATEGORY_EMOJI: Record<FoodCategory, string> = {
  cooked_meals: '🍛',
  bakery: '🥐',
  produce: '🥬',
  dairy: '🥛',
  packaged: '📦',
  beverages: '🥤',
  grains_staples: '🌾',
  other: '🍽️',
};
