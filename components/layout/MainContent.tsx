import React from 'react';
import { PantryScanner } from '../PantryScanner';
import { RecipeFinder } from '../RecipeFinder';
import { MealPlanner } from '../MealPlanner';
import { Login } from '../Login';
import { Tutorial } from '../Tutorial';
import { HouseholdManager } from '../Household';
import { ShoppingList } from '../ShoppingList';
import { Community } from '../Community';
import { Settings } from '../Settings';
import { Tab } from '../../types/app';
import { User, PantryItem, DayPlan, StructuredRecipe, Household, ShoppingItem, SavedRecipe, RecipeRating, RecipeSearchResult } from '../../types';

interface MainContentProps {
  activeTab: Tab;
  user: User;
  inventory: PantryItem[];
  setInventory: (inventory: PantryItem[]) => void;
  shoppingList: ShoppingItem[];
  setShoppingList: (shoppingList: ShoppingItem[]) => void;
  mealPlan: DayPlan[];
  setMealPlan: (mealPlan: DayPlan[]) => void;
  savedRecipes: SavedRecipe[];
  ratings: RecipeRating[];
  settings: any;
  setSettings: (settings: any) => void;
  persistedRecipeResult: RecipeSearchResult | null;
  setPersistedRecipeResult: (result: RecipeSearchResult | null) => void;
  onAddToPlan: (recipe: StructuredRecipe) => void;
  onSaveRecipe: (recipe: StructuredRecipe) => void;
  onDeleteRecipe: (recipe: SavedRecipe) => void;
  onRateRecipe: (rating: any) => void;
  onMoveToPantry: (items: ShoppingItem[]) => void;
  onAddToShoppingList: (items: string[]) => void;
  onLogout: () => void;
}

export const MainContent: React.FC<MainContentProps> = ({
  activeTab,
  user,
  inventory,
  setInventory,
  shoppingList,
  setShoppingList,
  mealPlan,
  setMealPlan,
  savedRecipes,
  ratings,
  settings,
  setSettings,
  persistedRecipeResult,
  setPersistedRecipeResult,
  onAddToPlan,
  onSaveRecipe,
  onDeleteRecipe,
  onRateRecipe,
  onMoveToPantry,
  onAddToShoppingList,
  onLogout,
}) => {
  return (
    <main className="flex-1 overflow-y-auto p-4 scrollbar-hide bg-theme-primary relative">
      {activeTab === Tab.PANTRY && (
        <PantryScanner
          inventory={inventory}
          setInventory={setInventory}
          addToShoppingList={onAddToShoppingList}
        />
      )}
      {activeTab === Tab.MEALS && (
        <MealPlanner
          mealPlan={mealPlan}
          setMealPlan={setMealPlan}
          inventory={inventory}
          addToShoppingList={onAddToShoppingList}
          onAddToPlan={onAddToPlan}
          onSaveRecipe={onSaveRecipe}
          onMarkAsMade={()=>{}}
        />
      )}
      {activeTab === Tab.SHOPPING && (
        <ShoppingList
          items={shoppingList}
          setItems={setShoppingList}
          onMoveToPantry={onMoveToPantry}
        />
      )}
      {activeTab === Tab.RECIPES && (
        <RecipeFinder
          onAddToPlan={onAddToPlan}
          onSaveRecipe={onSaveRecipe}
          onDeleteRecipe={onDeleteRecipe}
          onMarkAsMade={()=>{}}
          inventory={inventory}
          ratings={ratings}
          onRate={onRateRecipe}
          savedRecipes={savedRecipes}
          onShareRecipe={(recipe) => {
            alert(`Recipe shared: ${recipe.title}`);
          }}
          persistedResult={persistedRecipeResult}
          setPersistedResult={setPersistedRecipeResult}
        />
      )}
      {activeTab === Tab.COMMUNITY && (
        <Community
          ratings={ratings}
          onAddToPlan={onAddToPlan}
          onSaveRecipe={onSaveRecipe}
        />
      )}
      {activeTab === Tab.SETTINGS && (
        <Settings settings={settings} setSettings={setSettings} user={user || undefined} onLogout={onLogout} />
      )}
    </main>
  );
};