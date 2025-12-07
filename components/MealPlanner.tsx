import React, { useState, useEffect } from 'react';
import { CalendarClock, Plus, Move, AlertCircle, ShoppingBasket, Trash2 } from 'lucide-react';
import { DayPlan, MealPlanItem, PantryItem, StructuredRecipe, RecipeRating } from '../types';
import { RecipeRatingUI } from './RecipeRating';

interface MealPlannerProps {
  mealPlan: DayPlan[];
  setMealPlan: React.Dispatch<React.SetStateAction<DayPlan[]>>;
  inventory: PantryItem[];
  setInventory: React.Dispatch<React.SetStateAction<PantryItem[]>>;
  addToShoppingList: (items: string[]) => void;
  ratings?: RecipeRating[];
  onRate?: (rating: RecipeRating) => void;
}

export const MealPlanner: React.FC<MealPlannerProps> = ({ mealPlan, setMealPlan, inventory, setInventory, addToShoppingList, ratings = [], onRate = () => {} }) => {
  const [draggedMeal, setDraggedMeal] = useState<{ dayIndex: number, mealIndex: number } | null>(null);
  const [missingItemsCount, setMissingItemsCount] = useState(0);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [modalRecipe, setModalRecipe] = useState<StructuredRecipe | null>(null);

  // Basic pantry staples that don't need to be inventoried
  const basicIngredients = ['water', 'salt', 'pepper', 'oil', 'butter', 'olive oil', 'vegetable oil', 'cooking oil', 'garlic powder', 'onion powder', 'flour', 'sugar', 'vinegar', 'soy sauce', 'honey', 'lemon juice', 'lime juice'];
  
  const isBasicIngredient = (ingredient: string): boolean => {
    const ingredientLower = ingredient.toLowerCase().trim();
    return basicIngredients.some(basic => ingredientLower.includes(basic) || basic.includes(ingredientLower.split(/\d+/)[0].trim()));
  };

  const handleRecipeMade = (recipe: StructuredRecipe) => {
    // Parse ingredients and remove matching items from inventory (excluding basic staples)
    const updatedInventory = [...inventory];
    
    recipe.ingredients.forEach(ingredient => {
      // Skip basic ingredients
      if (isBasicIngredient(ingredient)) {
        return;
      }
      
      const ingredientLower = ingredient.toLowerCase();
      // Find matching inventory item
      const matchingIndex = updatedInventory.findIndex(item => 
        ingredientLower.includes(item.item.toLowerCase()) || 
        item.item.toLowerCase().includes(ingredientLower.split(/\d+/)[0].trim())
      );
      
      if (matchingIndex !== -1) {
        updatedInventory.splice(matchingIndex, 1);
      }
    });
    
    setInventory(updatedInventory);
    setShowRecipeModal(false);
    alert(`✓ Ingredients removed from inventory!`);
  };

  const getMissingIngredients = () => {
    const allNeededIngredients = mealPlan.flatMap(day => 
        day.meals.flatMap(meal => meal.recipe.ingredients)
    );
    
    const missing = allNeededIngredients.filter(needed => {
        const neededLower = needed.toLowerCase();
        return !inventory.some(pantryItem => 
            neededLower.includes(pantryItem.item.toLowerCase()) || 
            pantryItem.item.toLowerCase().includes(neededLower)
        );
    });

    return [...new Set(missing)];
  };

  useEffect(() => {
    setMissingItemsCount(getMissingIngredients().length);
  }, [mealPlan, inventory]);

  const handleDragStart = (e: React.DragEvent, dayIndex: number, mealIndex: number) => {
    setDraggedMeal({ dayIndex, mealIndex });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetDayIndex: number) => {
    e.preventDefault();
    if (!draggedMeal) return;

    const sourceDay = mealPlan[draggedMeal.dayIndex];
    const mealToMove = sourceDay.meals[draggedMeal.mealIndex];

    const newPlan = [...mealPlan];
    newPlan[draggedMeal.dayIndex].meals = newPlan[draggedMeal.dayIndex].meals.filter((_, i) => i !== draggedMeal.mealIndex);
    newPlan[targetDayIndex].meals.push(mealToMove);
    
    setMealPlan(newPlan);
    setDraggedMeal(null);
  };

  const handleAddMissingToShopping = () => {
    const missing = getMissingIngredients();
    if (missing.length > 0) {
        addToShoppingList(missing);
        alert(`Added ${missing.length} items to your shopping list.`);
    }
  };

  const removeMeal = (dayIndex: number, mealIndex: number) => {
      const newPlan = [...mealPlan];
      newPlan[dayIndex].meals = newPlan[dayIndex].meals.filter((_, i) => i !== mealIndex);
      setMealPlan(newPlan);
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-serif font-bold text-theme-secondary">Meal Schedule</h2>
        <p className="text-theme-secondary opacity-60 text-sm mt-1">Plan your week ahead</p>
      </div>

      <button 
        onClick={handleAddMissingToShopping}
        disabled={missingItemsCount === 0}
        className={`w-full border font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 mb-6 ${
            missingItemsCount > 0 
            ? 'bg-theme-secondary border-[var(--accent-color)] text-[var(--accent-color)] shadow-lg' 
            : 'opacity-50 cursor-not-allowed border-theme'
        }`}
      >
        <ShoppingBasket className="w-5 h-5" />
        {missingItemsCount > 0 ? `Add ${missingItemsCount} Missing Items to List` : "Pantry is Stocked"}
      </button>

      <div className="space-y-4">
        {mealPlan.map((day, dayIndex) => (
          <div 
            key={dayIndex}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, dayIndex)}
            className="bg-theme-secondary p-4 rounded-xl border border-theme shadow-sm min-h-[100px] transition-all"
          >
            <div className="flex justify-between items-start mb-2 pointer-events-none">
              <div>
                <h3 className="text-lg font-bold text-theme-primary">{day.dayName}</h3>
                <p className="text-xs opacity-50 font-mono mt-0.5">{day.date}</p>
              </div>
            </div>

            <div className="space-y-2">
                {day.meals.length === 0 && (
                    <div className="h-10 border-2 border-dashed border-theme rounded-lg flex items-center justify-center text-xs opacity-40">
                        Drag meals here
                    </div>
                )}
                {day.meals.map((meal, mealIndex) => (
                  <div
                    key={meal.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, dayIndex, mealIndex)}
                    className="bg-theme-primary border border-theme rounded-lg p-3 flex justify-between items-center cursor-move hover:border-[var(--accent-color)]/50 group shadow-sm active:cursor-grabbing"
                    onClick={() => { setModalRecipe(meal.recipe); setShowRecipeModal(true); }}
                  >
                    <div>
                      <span className="text-[var(--accent-color)] font-bold text-sm block">{meal.recipe.title}</span>
                      <span className="text-xs opacity-60">{meal.recipe.cookTime}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeMeal(dayIndex, mealIndex); }}
                      className="text-theme-secondary opacity-30 hover:opacity-100 p-1"
                    >
                       <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
      {/* Modal for full recipe details */}
      {showRecipeModal && modalRecipe && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowRecipeModal(false)}>
          <div className="bg-theme-primary rounded-2xl shadow-2xl p-0 max-w-lg w-full relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button className="sticky top-0 z-10 w-full py-4 text-3xl font-bold text-white bg-[var(--accent-color)] rounded-t-2xl flex items-center justify-center hover:bg-red-500 transition-all" onClick={() => setShowRecipeModal(false)}>
              CLOSE &times;
            </button>
            <div className="overflow-y-auto flex-1 p-8">
              <h2 className="text-2xl font-serif font-bold mb-2 text-[var(--accent-color)]">{modalRecipe.title}</h2>
              <p className="mb-4 text-theme-secondary opacity-70">{modalRecipe.description}</p>
              <div className="mb-4">
                <h4 className="text-xs font-bold text-[var(--accent-color)] uppercase mb-2">Ingredients</h4>
                <ul className="list-disc list-inside text-theme-secondary opacity-80">
                  {modalRecipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                </ul>
              </div>
              <div className="mb-6">
                <h4 className="text-xs font-bold text-[var(--accent-color)] uppercase mb-2">Instructions</h4>
                <ol className="list-decimal list-inside text-theme-secondary opacity-80 space-y-1">
                  {modalRecipe.instructions.map((step, i) => <li key={i}>{step}</li>)}
                </ol>
              </div>
              <div className="border-t border-theme pt-4">
                <RecipeRatingUI recipeTitle={modalRecipe.title} onRate={onRate} />
              </div>
            </div>
            <div className="sticky bottom-0 z-10 w-full flex gap-2 p-4 bg-theme-secondary rounded-b-2xl">
              <button className="flex-1 py-3 text-lg font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all" onClick={() => handleRecipeMade(modalRecipe)}>
                ✓ Made
              </button>
              <button className="flex-1 py-3 text-lg font-bold text-white bg-[var(--accent-color)] rounded-lg hover:bg-red-500 transition-all" onClick={() => setShowRecipeModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};