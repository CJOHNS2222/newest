import React, { useState } from 'react';
import { Star, Clock, ChefHat, Plus, Trash2, X } from 'lucide-react';
import { RecipeRating, StructuredRecipe, SavedRecipe, PantryItem } from '../types';
import { RecipeRatingUI } from './RecipeRating';

interface CommunityProps {
  ratings: RecipeRating[];
  onAddToPlan: (recipe: StructuredRecipe) => void;
  setInventory?: (items: PantryItem[]) => void;
  savedRecipes?: SavedRecipe[];
  onRate?: (rating: RecipeRating) => void;
}

export const Community: React.FC<CommunityProps> = ({ ratings, onAddToPlan, setInventory, savedRecipes = [], onRate = () => {} }) => {
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [modalRecipe, setModalRecipe] = useState<StructuredRecipe | null>(null);
  
  // Basic ingredients that shouldn't be deducted from inventory
  const BASIC_INGREDIENTS = ['water', 'salt', 'pepper', 'oil', 'butter', 'olive oil', 'vegetable oil', 'cooking oil', 'garlic powder', 'onion powder', 'flour', 'sugar', 'vinegar', 'soy sauce', 'honey', 'lemon juice', 'lime juice'];

  // Group ratings by recipe title and calculate average
  const recipeStats = ratings.reduce((acc, curr) => {
    if (!acc[curr.recipeTitle]) {
      acc[curr.recipeTitle] = {
        title: curr.recipeTitle,
        totalRating: 0,
        count: 0,
        comments: []
      };
    }
    acc[curr.recipeTitle].totalRating += curr.rating;
    acc[curr.recipeTitle].count += 1;
    if (curr.comment) acc[curr.recipeTitle].comments.push(curr);
    return acc;
  }, {} as Record<string, { title: string, totalRating: number, count: number, comments: RecipeRating[] }>);

  const sortedRecipes = Object.values(recipeStats).sort((a, b) => (b.totalRating/b.count) - (a.totalRating/a.count));

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-serif font-bold text-theme-secondary">Community Favorites</h2>
        <p className="text-theme-secondary opacity-60 text-sm mt-1">Top rated recipes by our users</p>
      </div>

      <div className="space-y-4">
        {sortedRecipes.map((stat, idx) => {
           const avg = (stat.totalRating / stat.count).toFixed(1);
           const latestComment = stat.comments[0];
           
           return (
             <div key={idx} className="bg-theme-secondary rounded-xl border border-theme shadow-lg overflow-hidden group hover:shadow-xl transition-all cursor-pointer" onClick={() => { setModalRecipe({ title: stat.title, description: "Community favorite", ingredients: [], instructions: [], cookTime: "30-45m" }); setShowRecipeModal(true); }}>
                {/* Simulated Image Header */}
                <div className="h-32 bg-gray-200 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center text-theme-secondary opacity-10 font-serif text-4xl font-bold bg-theme-primary">
                        {stat.title.charAt(0)}
                    </div>
                     <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-4">
                        <h3 className="text-white font-bold font-serif text-lg leading-tight">{stat.title}</h3>
                     </div>
                </div>
                
                <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded text-amber-600 dark:text-amber-400">
                             <Star className="w-4 h-4 fill-current" />
                             <span className="font-bold text-sm">{avg}</span>
                             <span className="text-[10px] opacity-70">({stat.count})</span>
                        </div>
                    </div>

                    {latestComment && (
                        <div className="bg-theme-primary p-3 rounded-lg mb-4 border border-theme">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-4 h-4 rounded-full bg-[var(--accent-color)] text-[8px] text-white flex items-center justify-center">
                                    {latestComment.userName.charAt(0)}
                                </div>
                                <span className="text-xs font-bold text-theme-secondary opacity-80">{latestComment.userName}</span>
                            </div>
                            <p className="text-xs text-theme-secondary italic line-clamp-2">"{latestComment.comment}"</p>
                        </div>
                    )}
                    
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation();
                            const mockRecipe: StructuredRecipe = {
                                title: stat.title,
                                description: "Community favorite",
                                ingredients: [],
                                instructions: [],
                                cookTime: "30-45m"
                            };
                            onAddToPlan(mockRecipe);
                        }}
                        className="w-full py-2 bg-[var(--accent-color)]/10 text-[var(--accent-color)] font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-[var(--accent-color)] hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add to Schedule
                    </button>
                </div>
             </div>
           );
        })}

        {sortedRecipes.length === 0 && (
             <div className="text-center py-12 opacity-30 flex flex-col items-center">
                <ChefHat className="w-12 h-12 mb-2" />
                <p>No ratings yet. Be the first to rate a recipe!</p>
             </div>
        )}
      </div>

      {/* Recipe Modal - Matches RecipeFinder and MealPlanner design */}
      {showRecipeModal && modalRecipe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-secondary rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            {/* Sticky Header with Close Button */}
            <div className="sticky top-0 flex items-center justify-between p-4 bg-[var(--accent-color)] rounded-t-2xl z-10 shadow-md">
              <h2 className="text-white font-bold font-serif flex-1">{modalRecipe.title}</h2>
              <button
                onClick={() => setShowRecipeModal(false)}
                className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Description */}
              {modalRecipe.description && (
                <div>
                  <p className="text-sm text-theme-secondary opacity-80">{modalRecipe.description}</p>
                </div>
              )}

              {/* Cook Time */}
              {modalRecipe.cookTime && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-[var(--accent-color)]" />
                  <span className="text-theme-secondary">{modalRecipe.cookTime}</span>
                </div>
              )}

              {/* Ingredients */}
              {modalRecipe.ingredients && modalRecipe.ingredients.length > 0 && (
                <div>
                  <h3 className="font-bold text-theme-secondary mb-2">Ingredients</h3>
                  <ul className="space-y-1">
                    {modalRecipe.ingredients.map((ing, idx) => (
                      <li key={idx} className="text-sm text-theme-secondary flex items-start gap-2">
                        <span className="text-[var(--accent-color)] mt-1">•</span>
                        <span>{ing}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Instructions */}
              {modalRecipe.instructions && modalRecipe.instructions.length > 0 && (
                <div>
                  <h3 className="font-bold text-theme-secondary mb-2">Instructions</h3>
                  <ol className="space-y-2">
                    {modalRecipe.instructions.map((step, idx) => (
                      <li key={idx} className="text-sm text-theme-secondary flex gap-2">
                        <span className="font-bold text-[var(--accent-color)] flex-shrink-0">{idx + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Rating Section */}
              {ratings && savedRecipes && (
                <div className="mt-4 pt-4 border-t border-theme">
                  <RecipeRatingUI
                    recipe={modalRecipe}
                    ratings={ratings}
                    onRate={(rating: number, comment: string) => {
                      onRate({ recipeTitle: modalRecipe.title, rating, comment, userName: 'You', timestamp: Date.now() });
                    }}
                  />
                </div>
              )}
            </div>

            {/* Sticky Footer with Buttons */}
            <div className="sticky bottom-0 flex gap-2 p-4 bg-theme-secondary rounded-b-2xl border-t border-theme shadow-md">
              <button
                onClick={() => setShowRecipeModal(false)}
                className="flex-1 py-2 bg-green-600/20 text-green-600 dark:text-green-400 font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-green-600 hover:text-white transition-all"
              >
                ✓ Made
              </button>
              <button
                onClick={() => {
                  onAddToPlan(modalRecipe);
                  setShowRecipeModal(false);
                }}
                className="flex-1 py-2 bg-[var(--accent-color)]/10 text-[var(--accent-color)] font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-[var(--accent-color)] hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Schedule
              </button>
              <button
                onClick={() => setShowRecipeModal(false)}
                className="flex-1 py-2 bg-theme-primary text-theme-secondary font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-gray-600 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};