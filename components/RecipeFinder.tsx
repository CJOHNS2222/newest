import React, { useState } from 'react';
import { Search, Loader2, Sparkles, ExternalLink, Globe, Plus, Clock, List, ChefHat, ToggleLeft, ToggleRight, Star, Heart, Bookmark } from 'lucide-react';
import { searchRecipes } from '../services/geminiService';
import { RecipeSearchResult, LoadingState, RecipeRating, StructuredRecipe, PantryItem, SavedRecipe } from '../types';
import { fetchRecipeImage } from '../services/imageService';
import { RecipeRatingUI } from './RecipeRating';
import RecipeModal from './RecipeModal';
import { logEvent } from 'firebase/analytics';
import { analytics } from '../firebaseConfig';

interface RecipeFinderProps {
    onAddToPlan: (recipe: StructuredRecipe) => void;
    onSaveRecipe: (recipe: StructuredRecipe) => void;
    onMarkAsMade?: (recipe: StructuredRecipe) => void;
    inventory: PantryItem[];
    ratings: RecipeRating[];
    onRate: (rating: RecipeRating) => void;
    savedRecipes: SavedRecipe[];
    persistedResult?: RecipeSearchResult | null;
    setPersistedResult?: (result: RecipeSearchResult | null) => void;
}

export const RecipeFinder: React.FC<RecipeFinderProps> = ({ onAddToPlan, onSaveRecipe, onMarkAsMade, inventory, ratings, onRate, savedRecipes, persistedResult, setPersistedResult }) => {
        // List of staple items to ignore
        const STAPLES = ['salt', 'pepper', 'oil', 'water', 'flour', 'sugar', 'butter', 'vinegar', 'baking powder', 'baking soda', 'spices', 'seasoning', 'soy sauce', 'cornstarch', 'yeast'];
    const [activeView, setActiveView] = useState<'search' | 'saved'>('search');
  
    const [specificQuery, setSpecificQuery] = useState('');
    const [maxCookTime, setMaxCookTime] = useState<string>('60');
    const [maxIngredients, setMaxIngredients] = useState<string>('10');
    const [recipeType, setRecipeType] = useState<'Snack' | 'Dinner' | 'Dessert' | ''>('');
    const [measurement, setMeasurement] = useState<'Metric' | 'Standard'>('Standard');
    const [strictMode, setStrictMode] = useState(false);
  
    // Use persistedResult if available
    const [result, setResult] = useState<RecipeSearchResult | null>(persistedResult || null);
    const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [modalRecipe, setModalRecipe] = useState<StructuredRecipe | null>(null);
    const [modalIsSavedView, setModalIsSavedView] = useState(false);

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
        setSearchError(null);
        if (setPersistedResult) setPersistedResult(null);
        try {
            console.debug('Recipe search params:', params);
            const data = await searchRecipes({
                ...params,
                maxCookTime: parseInt(maxCookTime),
                maxIngredients: parseInt(maxIngredients),
                measurementSystem: measurement,
                type: recipeType
            });
            // Filter results by type (quick meal, dinner, dessert)
            let filteredRecipes = data.recipes;
            if (recipeType) {
                filteredRecipes = filteredRecipes.filter((r: StructuredRecipe) => {
                    if (!r.type) return true;
                    return r.type.toLowerCase() === recipeType.toLowerCase();
                });
            }
            setResult({ ...data, recipes: filteredRecipes });
            if (setPersistedResult) setPersistedResult({ ...data, recipes: filteredRecipes });
            setLoadingState(LoadingState.SUCCESS);
            // Log search event
            logEvent(analytics, 'search', {
                query: params.query || 'generate_from_pantry',
                resultCount: filteredRecipes?.length || 0,
                recipeType: recipeType || 'any'
            });
        } catch (error: any) {
            console.error('performSearch error:', error);
            setSearchError(error?.message ? String(error.message) : JSON.stringify(error));
            setLoadingState(LoadingState.ERROR);
        }
    };

  const getRatingInfo = (title: string) => {
      const related = ratings.filter(r => !!r?.recipeTitle && r.recipeTitle.toLowerCase() === title.toLowerCase());
      if (related.length === 0) return null;
      
      const total = related.reduce((a, b) => a + (b?.rating || 0), 0);
      return {
          avg: (total / related.length).toFixed(1),
          count: related.length,
          snippet: related[0].comment
      };
  };

        const [imageUrls, setImageUrls] = useState<{ [title: string]: string }>({});

        React.useEffect(() => {
            if (result && result.recipes) {
                result.recipes.forEach(async (recipe) => {
                    if (!imageUrls[recipe.title]) {
                        const url = await fetchRecipeImage(recipe.title);
                        if (url) setImageUrls(prev => ({ ...prev, [recipe.title]: url }));
                    }
                });
            }
        }, [result]);

        const openRecipeModal = (recipe: any, isSavedView = false) => {
            // Normalize recipe shape so modal can safely render instructions/ingredients
            const normalized: any = { ...recipe };
            normalized.title = normalized.title || 'Untitled Recipe';
            if (!Array.isArray(normalized.instructions)) {
                if (typeof normalized.instructions === 'string') {
                    // Split on newlines or numbered steps
                    normalized.instructions = normalized.instructions.split(/\r?\n+/).map(s => s.trim()).filter(Boolean);
                } else if (normalized.instructions && typeof normalized.instructions === 'object') {
                    // If stored as object with numeric keys, convert to array
                    normalized.instructions = Object.values(normalized.instructions).map(String).filter(Boolean);
                } else {
                    normalized.instructions = [];
                }
            }
            if (!Array.isArray(normalized.ingredients)) {
                if (typeof normalized.ingredients === 'string') {
                    normalized.ingredients = normalized.ingredients.split(/\r?\n+/).map(s => s.trim()).filter(Boolean);
                } else if (normalized.ingredients && typeof normalized.ingredients === 'object') {
                    normalized.ingredients = Object.values(normalized.ingredients).map(String).filter(Boolean);
                } else {
                    normalized.ingredients = [];
                }
            }
            setModalRecipe(normalized as StructuredRecipe);
            setModalIsSavedView(Boolean(isSavedView));
            setShowRecipeModal(true);
        };

        const renderRecipeCard = (recipe: StructuredRecipe, isSavedView = false) => {
            const ratingInfo = getRatingInfo(recipe.title);
            const isSaved = savedRecipes.some(r => r.title === recipe.title);
            const titleKey = recipe.title || 'Untitled Recipe';
            const imgUrl = imageUrls[titleKey] || `https://source.unsplash.com/600x400/?${encodeURIComponent((titleKey as string).split(' ').slice(0,2).join(','))},food`;
            // Filter out staple items from ingredient list
            const filteredIngredients = recipe.ingredients.filter(ing => {
                const ingLower = ing.toLowerCase();
                return !STAPLES.some(staple => ingLower.includes(staple));
            });

            return (
                <div key={titleKey} className="bg-theme-secondary rounded-2xl shadow-xl border border-theme overflow-hidden group hover:shadow-2xl transition-all mb-6 cursor-pointer" onClick={() => openRecipeModal(recipe, isSavedView)}>
                    {/* Recipe Image */}
                    <div className="h-40 relative bg-gray-200 overflow-hidden">
                        <div 
                            className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:scale-105 transition-transform duration-500"
                            style={{
                                backgroundImage: `url(${imgUrl})`,
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
                                    <span className="bg-black/40 backdrop-blur px-2 py-1 rounded flex items-center gap-1">
                                        <Star className="w-3 h-3 text-yellow-400" /> {ratingInfo.avg} ({ratingInfo.count})
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <p className="text-theme-secondary opacity-70 text-sm mb-4 leading-relaxed">{recipe.description}</p>
                        <div className="grid gap-4 mb-6">
                            <div className="bg-theme-primary/50 p-4 rounded-lg">
                                <h5 className="text-xs font-bold text-[var(--accent-color)] uppercase mb-2 flex items-center gap-2">
                                    <List className="w-3 h-3" /> Ingredients
                                </h5>
                                <ul className="text-sm text-theme-secondary opacity-80 space-y-1 list-disc list-inside">
                                    {filteredIngredients.map((ing, i) => <li key={i}>{ing}</li>)}
                                </ul>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onAddToPlan(recipe); }}
                                className="flex-1 bg-theme-primary border border-theme hover:border-[var(--accent-color)] text-[var(--accent-color)] font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 hover:bg-[var(--accent-color)] hover:text-white"
                            >
                                <Plus className="w-5 h-5" /> Add to Schedule
                            </button>
                        </div>

                        <div className="mt-4 pt-4 border-t border-theme" onClick={(e) => e.stopPropagation()}>
                             <RecipeRatingUI recipeTitle={recipe.title} recipe={recipe} onRate={onRate} />
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

                    {/* Recipe Type Selector & Inputs Row */}
                                        <div className="grid grid-cols-4 gap-3">
                                                <div>
                                                        <label className="text-[10px] text-[var(--accent-color)] font-bold uppercase mb-1 block">Type</label>
                                                        <select
                                                            value={recipeType}
                                                            onChange={e => setRecipeType(e.target.value as 'Snack' | 'Dinner' | 'Dessert' | '')}
                                                            className="w-full p-2.5 rounded-lg border border-theme bg-theme-primary text-theme-primary focus:border-[var(--accent-color)] outline-none text-sm"
                                                        >
                                                            <option value="">Any</option>
                                                            <option value="Snack">Quick Snack</option>
                                                            <option value="Dinner">Dinner</option>
                                                            <option value="Dessert">Dessert</option>
                                                        </select>
                                                </div>
                                                {/* Dietary restrictions removed */}
                                                <div></div>
                                                <div>
                                                        <label className="text-[10px] text-[var(--accent-color)] font-bold uppercase mb-1 block">Max Time</label>
                                                        <div className="relative">
                                                                <input
                                                                type="number"
                                                                value={maxCookTime}
                                                                onChange={(e) => setMaxCookTime(e.target.value)}
                                                                className="w-16 p-2.5 rounded-lg border border-theme bg-theme-primary text-theme-primary focus:border-[var(--accent-color)] outline-none text-sm"
                                                                />
                                                                <span className="absolute right-2 top-2.5 opacity-50 text-[10px] font-bold mt-1">MIN</span>
                                                        </div>
                                                </div>
                                                <div>
                                                        <label className="text-[10px] text-[var(--accent-color)] font-bold uppercase mb-1 block">Max Items</label>
                                                        <input
                                                                type="number"
                                                                value={maxIngredients}
                                                                onChange={(e) => setMaxIngredients(e.target.value)}
                                                                className="w-16 p-2.5 rounded-lg border border-theme bg-theme-primary text-theme-primary focus:border-[var(--accent-color)] outline-none text-sm"
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
                <div>Search failed. Please try again.</div>
                {searchError && (
                    <div className="text-xs mt-2 text-red-300">Error: {searchError}</div>
                )}
                </div>
            )}

            {result && result.recipes && (
                    <div className="animate-fade-in-up space-y-8 mt-8">
                            {result.recipes.map((recipe, idx) => renderRecipeCard(recipe))}
                    </div>
            )}

            {/* Modal for full recipe details */}
            {showRecipeModal && modalRecipe && (
                <RecipeModal
                    recipe={modalRecipe}
                    isOpen={showRecipeModal}
                    onClose={() => setShowRecipeModal(false)}
                    onAddToPlan={(r) => { onAddToPlan(r); }}
                    onSaveRecipe={(r) => { onSaveRecipe(r); }}
                    onRate={onRate}
                    onMarkAsMade={(r) => { if (onMarkAsMade) onMarkAsMade(r); }}
                    showSaveButton={!modalIsSavedView}
                    showMarkAsMade={true}
                    showAddToPlan={true}
                />
            )}
        </>
      )}
    </div>
  );
};