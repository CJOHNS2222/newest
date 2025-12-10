import React from 'react';
import { Plus, Heart } from 'lucide-react';
import { StructuredRecipe } from '../types';

interface RecipeModalProps {
  recipe: StructuredRecipe;
  isOpen: boolean;
  onClose: () => void;
  onAddToPlan?: (recipe: StructuredRecipe) => void;
  onSaveRecipe?: (recipe: StructuredRecipe) => void;
  onMarkAsMade?: (recipe: StructuredRecipe) => void;
  showSaveButton?: boolean;
  showMarkAsMade?: boolean;
  showAddToPlan?: boolean;
}

export const RecipeModal: React.FC<RecipeModalProps> = ({
  recipe,
  isOpen,
  onClose,
  onAddToPlan,
  onSaveRecipe,
  onMarkAsMade,
  showSaveButton = true,
  showMarkAsMade = false,
  showAddToPlan = true
}) => {
  if (!isOpen || !recipe) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-theme-primary rounded-2xl shadow-2xl max-w-lg w-full relative flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <button className="absolute top-3 right-3 text-theme-secondary opacity-50 hover:opacity-100 z-20" onClick={onClose}>
          &times;
        </button>
        <div className="sticky top-0 z-10 w-full py-4 text-3xl font-bold text-white bg-[var(--accent-color)] rounded-t-2xl flex items-center justify-center">
          <span className="sr-only">Recipe Details</span>
        </div>
        <div className="overflow-y-auto p-6 flex-1">
          <h2 className="text-2xl font-serif font-bold mb-2 text-[var(--accent-color)]">{recipe.title || 'Untitled'}</h2>
          {recipe.description && <p className="mb-4 text-theme-secondary opacity-70">{recipe.description}</p>}
          <div className="mb-4">
            <h4 className="text-xs font-bold text-[var(--accent-color)] uppercase mb-2">Ingredients</h4>
            <ul className="list-disc list-inside text-theme-secondary opacity-80">
              {Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 ? (
                recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)
              ) : (
                <li>No ingredients available</li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--accent-color)] uppercase mb-2">Instructions</h4>
            <ol className="list-decimal list-inside text-theme-secondary opacity-80 space-y-1">
              {Array.isArray(recipe.instructions) && recipe.instructions.length > 0 ? (
                recipe.instructions.map((step, i) => <li key={i}>{step}</li>)
              ) : (
                <li>No instructions available</li>
              )}
            </ol>
          </div>
        </div>
        <div className="sticky bottom-0 z-20 w-full py-4 bg-theme-primary rounded-b-2xl flex items-center gap-2 p-4">
          <button className="flex-1 py-3 font-bold border border-[var(--accent-color)] rounded-lg flex items-center justify-center gap-2" onClick={onClose}>CLOSE</button>
          {showAddToPlan && onAddToPlan && (
            <button onClick={() => { onAddToPlan(recipe); onClose(); }} className="flex-1 py-3 font-bold bg-[var(--accent-color)] text-white rounded-lg flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Add to Schedule
            </button>
          )}
          {showSaveButton && onSaveRecipe && (
            <button onClick={() => { onSaveRecipe(recipe); onClose(); }} className="flex-1 py-3 font-bold border border-[var(--accent-color)] rounded-lg flex items-center justify-center gap-2">
              <Heart className="w-4 h-4" /> Save
            </button>
          )}
          {showMarkAsMade && onMarkAsMade && (
            <button onClick={() => { onMarkAsMade(recipe); onClose(); }} className="flex-1 py-3 font-bold bg-[var(--accent-color)] text-white rounded-lg">Mark as Made</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeModal;
