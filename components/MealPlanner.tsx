import React, { useState, useEffect } from 'react';
import { CalendarClock, Plus, Move, AlertCircle, ShoppingBasket, Trash2 } from 'lucide-react';
import { DayPlan, MealPlanItem, PantryItem, StructuredRecipe } from '../types';

interface MealPlannerProps {
  mealPlan: DayPlan[];
  setMealPlan: React.Dispatch<React.SetStateAction<DayPlan[]>>;
  inventory: PantryItem[];
  addToShoppingList: (items: string[]) => void;
}

export const MealPlanner: React.FC<MealPlannerProps> = ({ mealPlan, setMealPlan, inventory, addToShoppingList }) => {
  const [draggedMeal, setDraggedMeal] = useState<{ dayIndex: number, mealIndex: number } | null>(null);
  const [missingItemsCount, setMissingItemsCount] = useState(0);

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
                    >
                        <div>
                            <span className="text-[var(--accent-color)] font-bold text-sm block">{meal.recipe.title}</span>
                            <span className="text-xs opacity-60">{meal.recipe.cookTime}</span>
                        </div>
                        <button 
                            onClick={() => removeMeal(dayIndex, mealIndex)}
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
    </div>
  );
};