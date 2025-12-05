import React, { useState } from 'react';
import { Search, Loader2, Sparkles, ExternalLink, Globe, Plus, Clock, List, ChefHat, ToggleLeft, ToggleRight, Star, Heart, Bookmark } from 'lucide-react';
import { searchRecipes } from '../services/geminiService';
import { RecipeSearchResult, LoadingState, RecipeRating, StructuredRecipe, PantryItem, SavedRecipe } from '../types';
import { RecipeRatingUI } from './RecipeRating';

interface RecipeFinderProps {
  onAddToPlan: (recipe: StructuredRecipe) => void;
  onSaveRecipe: (recipe: StructuredRecipe) => void;
  inventory: PantryItem[];
  ratings: RecipeRating[];
  onRate: (rating: RecipeRating) => void;
  savedRecipes: SavedRecipe[];
}

export const RecipeFinder: React.FC<RecipeFinderProps> = ({ onAddToPlan, onSaveRecipe, inventory, ratings, onRate, savedRecipes }) => {
  const [activeView, setActiveView] = useState<'search' | 'saved'>('search');
  
  const [specificQuery, setSpecificQuery] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [maxCookTime, setMaxCookTime] = useState<string>('60');
  const [maxIngredients, setMaxIngredients] = useState<string>('10');
  const [measurement, setMeasurement] = useState<'Metric' | 'Standard'>('Standard');
  const [strictMode, setStrictMode] = useState(false);
  
  const [result, setResult] = useState<RecipeSearchResult | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);

  const inventoryString = inventory.map(i => i.item).join(', ');

  const handleSpecificSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specificQuery.trim()) return;
    performSearch({ query: specificQuery, ingredients: '' });
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inventory.length === 0) {
        alert("Please add items to your pantry list first!");
        return;
    }
    performSearch({ 
        ingredients: inventoryString,
        strictMode: strictMode
    });
  };

  const performSearch = async (params: any) => {
    setLoadingState(LoadingState.LOADING);
    setResult(null);
    try {
      const data = await searchRecipes({
        ...params,
        restrictions,
        maxCookTime: parseInt(maxCookTime),
        maxIngredients: parseInt(maxIngredients),
        measurementSystem: measurement
      });
      setResult(data);
      setLoadingState(LoadingState.SUCCESS);
    } catch (error) {
      setLoadingState(LoadingState.ERROR);
    }
  };

  const getRatingInfo = (title: string) => {
      const related = ratings.filter(r => r.recipeTitle.toLowerCase() === title.toLowerCase());
      if (related.length === 0) return null;
      
      const total = related.reduce((a, b) => a + b.rating, 0);
      return {
          avg: (total / related.length).toFixed(1),
          count: related.length,
          snippet: related[0].comment
      };
  };

  const renderRecipeCard = (recipe: StructuredRecipe, isSavedView = false) => {
     const ratingInfo = getRatingInfo(recipe.title);
     const isSaved = savedRecipes.some(r => r.title === recipe.title);

     return (
        <div key={recipe.title} className="bg-theme-secondary rounded-2xl shadow-xl border border-theme overflow-hidden group hover:shadow-2xl transition-all mb-6">
            {/* Image Placeholder */}
            <div className="h-40 relative bg-gray-200 overflow-hidden">
                <div 
                    className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:scale-105 transition-transform duration-500"
                    style={{
                        backgroundImage: `url(https://source.unsplash.com/600x400/?${encodeURIComponent(recipe.title.split(' ').slice(0,2).join(','))},food)`,
                        backgroundColor: '#2A0A10' 
                    }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>
                
                <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h4 className="text-xl font-serif font-bold leading-tight mb-1 shadow-black drop-shadow-md">{recipe.title}</h4>
                    <div className="flex items-center gap-3 text-xs font-medium opacity-90">
                        <span className="bg-black/40 backdrop-blur px-2 py-1 rounded flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[var(--accent-color)]" /> {recipe.cookTime}
                        </span>
                        {ratingInfo && (
                            <span className="bg-[var(--accent-color)]/90 px-2 py-1 rounded flex items-center gap-1">
                                <Star className="w-3 h-3 fill-white" /> {ratingInfo.avg}
                            </span>
                        )}
                    </div>
                </div>

                {!isSavedView && (
                    <button 
                        onClick={() => onSaveRecipe(recipe)}
                        className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all ${isSaved ? 'bg-[var(--accent-color)] text-white' : 'bg-black/30 text-white hover:bg-[var(--accent-color)]'}`}
                    >
                        <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                    </button>
                )}
            </div>

            <div className="p-6">
                {ratingInfo && (
                    <div className="mb-4 p-3 bg-theme-primary rounded-lg border border-theme flex items-start gap-2">
                        <div className="min-w-[4px] h-full bg-[var(--accent-color)] rounded-full"></div>
                        <div>
                             <div className="text-xs font-bold text-[var(--accent-color)] uppercase mb-0.5">Community Verdict</div>
                             <p className="text-xs italic text-theme-secondary opacity-80">"{ratingInfo.snippet}"</p>
                        </div>
                    </div>
                )}

                <p className="text-theme-secondary opacity-70 text-sm mb-4 leading-relaxed">{recipe.description}</p>
                
                <div className="grid gap-4 mb-6">
                    <div className="bg-theme-primary/50 p-4 rounded-lg">
                        <h5 className="text-xs font-bold text-[var(--accent-color)] uppercase mb-2 flex items-center gap-2">
                            <List className="w-3 h-3" /> Ingredients
                        </h5>
                        <ul className="text-sm text-theme-secondary opacity-80 space-y-1 list-disc list-inside">
                            {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                        </ul>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button 
                        onClick={() => onAddToPlan(recipe)}
                        className="flex-1 bg-theme-primary border border-theme hover:border-[var(--accent-color)] text-[var(--accent-color)] font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 hover:bg-[var(--accent-color)] hover:text-white"
                    >
                        <Plus className="w-5 h-5" /> Add to Schedule
                    </button>
                </div>
                
                <div className="mt-4 pt-4 border-t border-theme">
                        <RecipeRatingUI recipeTitle={recipe.title} onRate={onRate} />
                </div>
            </div>
        </div>
     );
  };

  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto animate-fade-in">
      <div className="flex justify-center gap-4 mb-2">
          <button 
            onClick={() => setActiveView('search')}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${activeView === 'search' ? 'bg-[var(--accent-color)] text-white' : 'text-theme-secondary opacity-50'}`}
          >
              Search & Generate
          </button>
          <button 
            onClick={() => setActiveView('saved')}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'saved' ? 'bg-[var(--accent-color)] text-white' : 'text-theme-secondary opacity-50'}`}
          >
              <Bookmark className="w-4 h-4" /> Saved ({savedRecipes.length})
          </button>
      </div>

      {activeView === 'saved' ? (
          <div className="space-y-4">
              {savedRecipes.length === 0 ? (
                  <div className="text-center py-12 opacity-30">
                      <Bookmark className="w-12 h-12 mx-auto mb-2" />
                      <p>No saved recipes yet.</p>
                  </div>
              ) : (
                  savedRecipes.map(r => renderRecipeCard(r, true))
              )}
          </div>
      ) : (
        <>
            <div className="bg-theme-secondary p-5 rounded-2xl border border-theme shadow-lg">
                <form onSubmit={handleSpecificSearch} className="flex gap-2">
                    <input
                    value={specificQuery}
                    onChange={(e) => setSpecificQuery(e.target.value)}
                    placeholder="Search e.g. Pasta..."
                    className="flex-1 bg-theme-primary border border-theme rounded-xl px-4 py-3 text-theme-primary focus:border-[var(--accent-color)] outline-none"
                    />
                    <button
                        type="submit"
                        disabled={loadingState === LoadingState.LOADING || !specificQuery.trim()}
                        className="bg-[var(--accent-color)] text-white px-4 rounded-xl font-bold"
                    >
                        <Search className="w-5 h-5" />
                    </button>
                </form>
            </div>

            <div className="flex items-center gap-4">
                <div className="h-px bg-theme opacity-30 flex-1"></div>
                <span className="text-xs font-bold text-theme-secondary opacity-50 uppercase tracking-widest">OR</span>
                <div className="h-px bg-theme opacity-30 flex-1"></div>
            </div>

            <div className="bg-theme-secondary p-6 rounded-2xl border border-theme shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-color)] rounded-full blur-3xl opacity-10"></div>
                <h3 className="text-xs font-bold text-[var(--accent-color)] uppercase mb-4 flex items-center gap-2 relative z-10">
                    <Sparkles className="w-4 h-4" /> Generate Ideas from Pantry
                </h3>

                <form onSubmit={handleGenerate} className="space-y-4 relative z-10">
                    {/* Toggles Row */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Inventory Toggle */}
                        <div 
                            onClick={() => setStrictMode(!strictMode)}
                            className="flex flex-col justify-between bg-theme-primary p-3 rounded-xl border border-theme cursor-pointer hover:border-[var(--accent-color)]/30 transition-all group"
                        >
                            <div>
                                <span className="text-xs font-bold text-theme-primary block">Use Inventory Only</span>
                                <span className="text-[10px] text-theme-secondary opacity-60 leading-tight block mt-0.5">
                                    {strictMode ? "Strict match" : "Allow extra items"}
                                </span>
                            </div>
                            <div className="self-end mt-1">
                                {strictMode ? (
                                    <ToggleRight className="w-7 h-7 text-[var(--accent-color)]" />
                                ) : (
                                    <ToggleLeft className="w-7 h-7 text-theme-secondary opacity-30" />
                                )}
                            </div>
                        </div>

                        {/* Measurement Toggle */}
                        <div className="flex flex-col justify-between bg-theme-primary p-3 rounded-xl border border-theme">
                             <span className="text-[10px] text-[var(--accent-color)] font-bold uppercase mb-1">Measurement</span>
                             <div className="flex bg-theme-secondary rounded-lg p-1 border border-theme h-8">
                                <button
                                    type="button"
                                    onClick={() => setMeasurement('Standard')}
                                    className={`flex-1 text-[10px] font-bold rounded transition-all ${measurement === 'Standard' ? 'bg-[var(--accent-color)] text-white shadow-sm' : 'text-theme-secondary opacity-50'}`}
                                >
                                    Standard
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMeasurement('Metric')}
                                    className={`flex-1 text-[10px] font-bold rounded transition-all ${measurement === 'Metric' ? 'bg-[var(--accent-color)] text-white shadow-sm' : 'text-theme-secondary opacity-50'}`}
                                >
                                    Metric
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Inputs Row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-[var(--accent-color)] font-bold uppercase mb-1 block">Max Time</label>
                            <div className="relative">
                                <input
                                type="number"
                                value={maxCookTime}
                                onChange={(e) => setMaxCookTime(e.target.value)}
                                className="w-full p-2.5 rounded-lg border border-theme bg-theme-primary text-theme-primary focus:border-[var(--accent-color)] outline-none text-sm"
                                />
                                <span className="absolute right-3 top-2.5 opacity-50 text-[10px] font-bold mt-1">MIN</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-[var(--accent-color)] font-bold uppercase mb-1 block">Max Items</label>
                            <input
                                type="number"
                                value={maxIngredients}
                                onChange={(e) => setMaxIngredients(e.target.value)}
                                className="w-full p-2.5 rounded-lg border border-theme bg-theme-primary text-theme-primary focus:border-[var(--accent-color)] outline-none text-sm"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loadingState === LoadingState.LOADING}
                        className="w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-3 bg-gradient-to-r from-[var(--accent-color)] to-[var(--text-secondary)] text-white shadow-lg mt-2"
                    >
                        {loadingState === LoadingState.LOADING ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChefHat className="w-5 h-5" />}
                        Suggest Recipes
                    </button>
                </form>
            </div>

            {loadingState === LoadingState.ERROR && (
                <div className="p-4 bg-red-900/20 border border-red-500 text-red-400 rounded-xl text-center font-medium">
                Search failed. Please try again.
                </div>
            )}

            {result && result.recipes && (
                <div className="animate-fade-in-up space-y-8 mt-8">
                    {result.recipes.map((recipe, idx) => renderRecipeCard(recipe))}
                </div>
            )}
        </>
      )}
    </div>
  );
};