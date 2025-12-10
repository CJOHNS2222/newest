import React, { useState } from 'react';
import { Star, Clock, ChefHat, Plus, X } from 'lucide-react';
import { RecipeRating, StructuredRecipe } from '../types';
import RecipeModal from './RecipeModal';

interface CommunityProps {
  ratings: RecipeRating[];
  onAddToPlan: (recipe: StructuredRecipe) => void;
  onSaveRecipe?: (recipe: StructuredRecipe) => void;
}

export const Community: React.FC<CommunityProps> = ({ ratings, onAddToPlan, onSaveRecipe }) => {
    // List of staple items to ignore in ingredient display
    const STAPLES = ['salt', 'pepper', 'oil', 'water', 'flour', 'sugar', 'butter', 'vinegar', 'baking powder', 'baking soda', 'spices', 'seasoning', 'soy sauce', 'cornstarch', 'yeast'];
  const [showModal, setShowModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<{ title: string, comments: RecipeRating[] } | null>(null);
  
  // Group ratings by recipe title and calculate average
  const recipeStats = ratings.reduce((acc, curr) => {
    const key = curr.recipeTitle || 'Untitled';
    if (!acc[key]) {
      acc[key] = {
        title: key,
        totalRating: 0,
        count: 0,
        comments: []
      };
    }
    acc[key].totalRating += (typeof curr.rating === 'number' ? curr.rating : 0);
    acc[key].count += 1;
    if (curr.comment) acc[key].comments.push(curr);
    return acc;
  }, {} as Record<string, { title: string, totalRating: number, count: number, comments: RecipeRating[] }>);

  const sortedRecipes = Object.values(recipeStats).sort((a, b) => (b.totalRating / Math.max(1, b.count)) - (a.totalRating / Math.max(1, a.count)));
  const [showAll, setShowAll] = useState(false);
  const findRecipeForStat = (stat: { comments: RecipeRating[] }) => {
    const ratingWithRecipe = stat.comments.find(c => c.recipe && c.recipe.ingredients && c.recipe.instructions);
    return ratingWithRecipe ? ratingWithRecipe.recipe : null;
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-serif font-bold text-theme-secondary">Community Favorites</h2>
        <p className="text-theme-secondary opacity-60 text-sm mt-1">Top rated recipes by our users</p>
      </div>

      <div className="space-y-4">
        {(showAll ? sortedRecipes : sortedRecipes.slice(0,5)).map((stat, idx) => {
           const avg = (stat.totalRating / stat.count).toFixed(1);
           const latestComment = stat.comments && stat.comments[0] ? stat.comments[0] : null;
           const fullRecipe = findRecipeForStat(stat);
           
           return (
             <div 
               key={idx} 
               className="bg-theme-secondary rounded-xl border border-theme shadow-lg overflow-hidden group hover:shadow-xl transition-all cursor-pointer"
               onClick={() => { setSelectedRecipe(stat); setShowModal(true); }}
             >
                {/* Simulated Image Header */}
                <div className="h-32 bg-gray-200 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center text-theme-secondary opacity-10 font-serif text-4xl font-bold bg-theme-primary">
                        {(stat.title && String(stat.title).charAt ? String(stat.title).charAt(0) : '?')}
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
                                  {(latestComment && latestComment.userName) ? String(latestComment.userName).charAt(0) : '?'}
                                </div>
                                <span className="text-xs font-bold text-theme-secondary opacity-80">{latestComment.userName}</span>
                            </div>
                            <p className="text-xs text-theme-secondary italic line-clamp-2">"{latestComment.comment}"</p>
                        </div>
                    )}
                    
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (fullRecipe) {
                                onAddToPlan(fullRecipe);
                            } else {
                                // Fallback for older data that might not have the full recipe
                                const mockRecipe: StructuredRecipe = {
                                    title: stat.title,
                                    description: "Community favorite",
                                    ingredients: ["Full recipe not available in this rating. Please save it first."],
                                    instructions: ["Full recipe not available in this rating. Please save it first."],
                                    cookTime: "N/A"
                                };
                                onAddToPlan(mockRecipe);
                            }
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
          {sortedRecipes.length > 5 && (
            <div className="flex justify-center mt-4">
              <button onClick={() => setShowAll(prev => !prev)} className="px-4 py-2 rounded bg-[var(--accent-color)] text-white">
                {showAll ? 'Show Less' : `Show More (${sortedRecipes.length - 5})`}
              </button>
            </div>
          )}
      </div>

      {showModal && selectedRecipe && (() => {
        const recipeFromComment = findRecipeForStat(selectedRecipe);
        const structured: StructuredRecipe = recipeFromComment
          ? recipeFromComment
          : {
              title: selectedRecipe.title,
              description: 'Community favorite',
              ingredients: ['Full recipe not available in this rating. Please save it first.'],
              instructions: ['Full recipe not available in this rating. Please save it first.'],
              cookTime: 'N/A'
            };
        return (
          <RecipeModal
            recipe={structured}
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onAddToPlan={(r) => { onAddToPlan && onAddToPlan(r); }}
            onSaveRecipe={(r) => { onSaveRecipe && onSaveRecipe(r); }}
            showSaveButton={true}
            showMarkAsMade={false}
            showAddToPlan={true}
          />
        );
      })()}
    </div>
  );
};