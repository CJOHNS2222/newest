export interface PantryItem {
  item: string;
  category: string;
  quantity_estimate: string;
}

export interface ShoppingItem {
  id: string;
  item: string;
  category: string;
  checked: boolean;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface StructuredRecipe {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  cookTime: string;
}

export interface SavedRecipe extends StructuredRecipe {
  id: string;
  dateSaved: string;
  imagePlaceholder?: string; // CSS color or placeholder ID
}

export interface RecipeSearchResult {
  recipes: StructuredRecipe[];
  groundingChunks?: GroundingChunk[];
}

export interface MealPlanItem {
  id: string; // unique id for drag and drop
  recipe: StructuredRecipe;
}

export interface DayPlan {
  date: string;
  dayName: string;
  meals: MealPlanItem[];
}

export interface RecipeRating {
  id: string;
  recipeTitle: string;
  rating: number;
  comment: string;
  userName: string;
  userAvatar?: string;
  date: string;
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface RecipeSearchParams {
  query?: string; // For specific searches
  ingredients: string; // From pantry
  restrictions?: string;
  maxCookTime?: number;
  maxIngredients?: number;
  measurementSystem: 'Metric' | 'Standard';
  strictMode?: boolean; // Only use inventory
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: 'email' | 'google' | 'facebook';
  hasSeenTutorial: boolean;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Member';
  status: 'Active' | 'Invited';
}

export interface Household {
  id: string;
  name: string;
  members: Member[];
}