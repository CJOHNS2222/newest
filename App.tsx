import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig'; // Adjust path if needed
import { PantryScanner } from './components/PantryScanner';
import { RecipeFinder } from './components/RecipeFinder';
import { MealPlanner } from './components/MealPlanner';
import { Login } from './components/Login';
import { Tutorial } from './components/Tutorial';
import { HouseholdManager } from './components/Household';
import { ShoppingList } from './components/ShoppingList';
import { Community } from './components/Community';
import { Settings } from './components/Settings';
import { ChefHat, ShoppingBasket, CalendarDays, UtensilsCrossed, Users, Sun, Moon } from 'lucide-react';
import { User, PantryItem, DayPlan, StructuredRecipe, Household, ShoppingItem, SavedRecipe, RecipeRating, RecipeSearchResult } from './types';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getAnalytics, logEvent } from 'firebase/analytics';
import { getOrCreateHousehold, joinHousehold } from './services/householdService';

enum Tab {
  PANTRY = 'PANTRY',
  SHOPPING = 'SHOPPING',
  MEALS = 'MEALS',
  RECIPES = 'RECIPES',
  COMMUNITY = 'COMMUNITY',
  SETTINGS = 'SETTINGS'
}

type Theme = 'dark' | 'light';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.PANTRY);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'dark');
  // Persist generated recipes across tab changes
  const [persistedRecipeResult, setPersistedRecipeResult] = useState<RecipeSearchResult | null>(null);
  
  // User State
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [showTutorial, setShowTutorial] = useState(false);
  const [showHousehold, setShowHousehold] = useState(false);

  // Data States
  const [inventory, setInventory] = useState<PantryItem[]>(() => {
    const saved = localStorage.getItem('inventory');
    return saved ? JSON.parse(saved) : [];
  });

  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>(() => {
    const saved = localStorage.getItem('shoppingList');
    return saved ? JSON.parse(saved) : [];
  });

  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>(() => {
    const saved = localStorage.getItem('savedRecipes');
    return saved ? JSON.parse(saved) : [];
  });

  const [ratings, setRatings] = useState<RecipeRating[]>(() => {
    const saved = localStorage.getItem('ratings');
    return saved ? JSON.parse(saved) : [];
  });

  const [mealPlan, setMealPlan] = useState<DayPlan[]>([]);

  const [household, setHousehold] = useState<Household>(() => {
    const saved = localStorage.getItem('household');
    return saved ? JSON.parse(saved) : { id: '', name: '', members: [] };
  });

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('settings');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      notifications: {
        enabled: true,
        time: '09:00',
        types: { shoppingList: true, mealPlan: true },
      },
      theme: { mode: theme, accentColor: '#4CAF50' },
    };
  });

  const analytics = getAnalytics();

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme.mode);
    localStorage.setItem('theme', settings.theme.mode);
    document.documentElement.style.setProperty('--accent-color', settings.theme.accentColor);
    if (settings.theme.backgroundColor) {
      document.documentElement.style.setProperty('--theme-background', settings.theme.backgroundColor);
    }
  }, [settings.theme]);

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [settings]);

  // Init Meal Plan
  useEffect(() => {
    if (mealPlan.length === 0) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = new Date();
      const initialPlan: DayPlan[] = [];

      for (let i = 0; i < 7; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          initialPlan.push({
              date: d.toLocaleDateString(),
              dayName: days[d.getDay()],
              meals: []
          });
      }
      setMealPlan(initialPlan);
    }
  }, []);

  // Persistence
  useEffect(() => { localStorage.setItem('user', JSON.stringify(user)); }, [user]);
  
  // Firebase sync for household data
  useEffect(() => {
    if (!user || !household?.id) return;
    const unsubscribe = onSnapshot(doc(db, "households", household.id), (docSnap) => {
      const data = docSnap.data();
      if (data) {
        if (data.inventory) setInventory(data.inventory);
        if (data.shoppingList) setShoppingList(data.shoppingList);
        if (data.savedRecipes) setSavedRecipes(data.savedRecipes);
        if (data.ratings) setRatings(data.ratings);
        if (data.mealPlan) setMealPlan(data.mealPlan);
      }
    });
    return () => unsubscribe();
  }, [user, household?.id]);

  // Local storage persistence
  useEffect(() => { localStorage.setItem('inventory', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('shoppingList', JSON.stringify(shoppingList)); }, [shoppingList]);
  useEffect(() => { localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes)); }, [savedRecipes]);
  useEffect(() => { localStorage.setItem('ratings', JSON.stringify(ratings)); }, [ratings]);
  useEffect(() => { localStorage.setItem('mealPlan', JSON.stringify(mealPlan)); }, [mealPlan]);
  useEffect(() => { localStorage.setItem('household', JSON.stringify(household)); }, [household]);

  // Firebase sync for changes to inventory, recipes, shopping list, meal plan, and ratings
  useEffect(() => {
    if (!household?.id) return;
    
    const updateFirebase = async () => {
      try {
        await updateDoc(doc(db, 'households', household.id), {
          inventory,
          shoppingList,
          savedRecipes,
          ratings,
          mealPlan,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.warn('Failed to sync to Firebase:', error);
        // Data is still saved in localStorage
      }
    };

    // Debounce updates to avoid too many Firebase writes
    const timer = setTimeout(updateFirebase, 1000);
    return () => clearTimeout(timer);
  }, [inventory, shoppingList, savedRecipes, ratings, mealPlan, household?.id]);

  const handleLogin = async (loggedInUser: User) => {
    setUser(loggedInUser);
    
    // Get or create household for the user
    const userHousehold = await getOrCreateHousehold(loggedInUser);
    if (userHousehold) {
      setHousehold(userHousehold);
    } else {
      // Fallback to default household
      setHousehold({
        id: `default_${loggedInUser.id}`,
        name: `${loggedInUser.name}'s Family`,
        members: [{
          id: loggedInUser.id,
          name: loggedInUser.name,
          email: loggedInUser.email,
          role: 'Admin',
          status: 'Active'
        }]
      });
    }

    if (!loggedInUser.hasSeenTutorial) setShowTutorial(true);

    // Log login event
    logEvent(analytics, 'login', { method: loggedInUser.provider });
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to log out?")) {
        localStorage.clear();
        setUser(null);
        window.location.reload();
    }
  };

  const handleAddToPlan = (recipe: StructuredRecipe) => {
    const newPlan = [...mealPlan];
    newPlan[0].meals.push({
        id: Math.random().toString(36).substr(2, 9),
        recipe: recipe
    });
    setMealPlan(newPlan);
    alert(`Added ${recipe.title} to ${newPlan[0].dayName}.`);
    setActiveTab(Tab.MEALS);
  };

  const handleSaveRecipe = (recipe: StructuredRecipe) => {
    if (savedRecipes.some(r => r.title === recipe.title)) {
      alert("Recipe already saved!");
      return;
    }
    const newSaved: SavedRecipe = {
      ...recipe,
      id: Math.random().toString(36).substr(2, 9),
      dateSaved: new Date().toLocaleDateString(),
      imagePlaceholder: `hsl(${Math.random() * 360}, 70%, 40%)`
    };
    setSavedRecipes(prev => [newSaved, ...prev]);
    logEvent(analytics, 'save_recipe', { title: recipe.title });
    alert("Recipe saved to favorites!");
  };

  const handleAddRating = (rating: RecipeRating) => {
    setRatings(prev => [rating, ...prev]);
  };

  // Notification Scheduling
  useEffect(() => {
    const scheduleNotifications = async () => {
      if (settings.notifications.enabled) {
        try {
          // Request notification permissions
          await LocalNotifications.requestPermissions();
          
          // Cancel previous notifications
          await LocalNotifications.cancel({ notifications: [{ id: 1 }, { id: 2 }] });
          
          // Schedule shopping list notification
          if (settings.notifications.types.shoppingList) {
            const [hour, minute] = settings.notifications.time.split(':');
            const now = new Date();
            const notifTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hour), parseInt(minute));
            if (notifTime < now) notifTime.setDate(notifTime.getDate() + 1); // Next day if time passed
            await LocalNotifications.schedule({
              notifications: [
                {
                  id: 1,
                  title: 'Shopping List Reminder',
                  body: 'Check your shopping list today!',
                  schedule: { at: notifTime },
                },
              ],
            });
          }
          // Schedule meal plan notification
          if (settings.notifications.types.mealPlan) {
            const [hour, minute] = settings.notifications.time.split(':');
            const now = new Date();
            const notifTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hour), parseInt(minute));
            if (notifTime < now) notifTime.setDate(notifTime.getDate() + 1);
            await LocalNotifications.schedule({
              notifications: [
                {
                  id: 2,
                  title: 'Meal Plan Reminder',
                  body: 'Review your meal plan for today!',
                  schedule: { at: notifTime },
                },
              ],
            });
          }
        } catch (error) {
          console.error('Error scheduling notifications:', error);
        }
      } else {
        try {
          // Cancel all notifications if disabled
          await LocalNotifications.cancel({ notifications: [{ id: 1 }, { id: 2 }] });
        } catch (error) {
          console.error('Error canceling notifications:', error);
        }
      }
    };
    
    scheduleNotifications();
  }, [settings.notifications]);

  // Log tab change
  useEffect(() => {
    logEvent(analytics, 'tab_change', { tab: activeTab });
  }, [activeTab]);

  // Log settings change
  useEffect(() => {
    logEvent(analytics, 'settings_change', { settings });
  }, [settings]);

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative border-x border-theme transition-colors duration-300" style={{ background: 'var(--theme-background, var(--theme-primary))' }}>
      
      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
      {showHousehold && (
        <HouseholdManager 
            user={user} 
            household={household} 
            setHousehold={setHousehold} 
            onClose={() => setShowHousehold(false)} 
        />
      )}

      {/* Header */}
      <header className="bg-theme-secondary p-4 pt-6 sticky top-0 z-20 shadow-md border-b border-theme transition-colors duration-300">
        <div className="flex justify-between items-center">
             <button 
                onClick={() => setShowHousehold(true)}
                className="flex items-center space-x-2 px-2 py-1 rounded-full hover:bg-black/5 transition-colors"
            >
                {user.avatar ? (
                    <img src={user.avatar} className="w-8 h-8 rounded-full border border-theme" alt="profile" />
                ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{backgroundColor: 'var(--accent-color)'}}>
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                )}
            </button>
            
            <div className="flex flex-col items-center">
                 <h1 className="text-xl font-serif font-bold text-theme-primary" style={{color: 'var(--accent-color)'}}>
                    Smart Pantry Chef
                </h1>
                <span className="text-[10px] uppercase tracking-widest text-theme-secondary opacity-60">AI Kitchen Assistant</span>
            </div>

            <button 
                onClick={() => setSettings(prev => ({
                  ...prev,
                  theme: {
                    ...prev.theme,
                    mode: prev.theme.mode === 'dark' ? 'light' : 'dark'
                  }
                }))}
                className="p-2 text-theme-secondary opacity-70 hover:opacity-100"
            >
                {settings.theme.mode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 scrollbar-hide bg-theme-primary relative">
        {activeTab === Tab.PANTRY && (
            <PantryScanner 
                inventory={inventory} 
                setInventory={setInventory} 
                addToShoppingList={(items) => {
                    const newItems = items.map(i => ({ id: Math.random().toString(36).substr(2,9), item: i, category: 'Manual', checked: false }));
                    setShoppingList(prev => [...prev, ...newItems]);
                    setActiveTab(Tab.SHOPPING);
                }}
            />
        )}
        {activeTab === Tab.MEALS && (
          <MealPlanner
            mealPlan={mealPlan}
            setMealPlan={setMealPlan}
            inventory={inventory}
            setInventory={setInventory}
            ratings={ratings}
            onRate={handleAddRating}
            addToShoppingList={(items) => {
              const newItems = items.map(i => ({ id: Math.random().toString(36).substr(2,9), item: i, category: 'Manual', checked: false }));
              setShoppingList(prev => [...prev, ...newItems]);
              setActiveTab(Tab.SHOPPING);
            }}
          />
        )}
        
        {activeTab === Tab.SHOPPING && (
            <ShoppingList 
              items={shoppingList} 
              setItems={setShoppingList} 
              onMoveToPantry={(items) => {
                // Merge shopping list items into inventory
                setInventory(prev => {
                  const updated = [...prev];
                  items.forEach(i => {
                    const idx = updated.findIndex(p => p.item.toLowerCase() === i.item.toLowerCase());
                    let addQty = typeof i.quantity === 'number' ? i.quantity : 1;
                    if (addQty < 1) addQty = 1; // Always add at least 1
                    if (idx !== -1) {
                      // Always add, never subtract
                      const prevQty = parseInt(updated[idx].quantity_estimate) || 1;
                      updated[idx].quantity_estimate = (prevQty + Math.abs(addQty)).toString();
                    } else {
                      updated.push({ item: i.item, category: i.category, quantity_estimate: Math.abs(addQty).toString() });
                    }
                  });
                  // Merge duplicates in inventory
                  const merged: { [key: string]: PantryItem } = {};
                  updated.forEach(p => {
                    const key = p.item.toLowerCase();
                    if (merged[key]) {
                      merged[key].quantity_estimate = (parseInt(merged[key].quantity_estimate) + parseInt(p.quantity_estimate)).toString();
                    } else {
                      merged[key] = { ...p };
                    }
                  });
                  return Object.values(merged);
                });
              }}
            />
        )}

        {activeTab === Tab.RECIPES && (
            <RecipeFinder 
                onAddToPlan={handleAddToPlan} 
                onSaveRecipe={handleSaveRecipe}
                inventory={inventory}
                setInventory={setInventory}
                ratings={ratings}
                onRate={handleAddRating}
                savedRecipes={savedRecipes}
                onShareRecipe={(recipe) => {
                  // TODO: Implement recipe sharing logic (e.g., send to another household)
                  alert(`Recipe shared: ${recipe.title}`);
                }}
                persistedResult={persistedRecipeResult}
                setPersistedResult={setPersistedRecipeResult}
            />
        )}

        {activeTab === Tab.COMMUNITY && (
            <Community 
                ratings={ratings} 
                onAddToPlan={handleAddToPlan}
            />
        )}

        {activeTab === Tab.SETTINGS && (
          <Settings settings={settings} setSettings={setSettings} user={user || undefined} onLogout={handleLogout} />
        )}
      </main>

      {/* Navigation */}
      <nav className="bg-theme-secondary border-t border-theme fixed bottom-0 w-full max-w-md pb-safe z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] transition-colors duration-300">
        <div className="flex justify-around items-end pb-2 pt-1">
          {[
              { id: Tab.PANTRY, icon: ChefHat, label: 'Pantry' },
              { id: Tab.SHOPPING, icon: ShoppingBasket, label: 'Shop' },
              { id: Tab.MEALS, icon: CalendarDays, label: 'Plan' },
              { id: Tab.RECIPES, icon: UtensilsCrossed, label: 'Chef' },
              { id: Tab.COMMUNITY, icon: Users, label: 'Social' },
              { id: Tab.SETTINGS, icon: Sun, label: 'Settings' },
          ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 py-2 transition-all duration-300 ${
                  activeTab === tab.id ? '-translate-y-1' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <div className={`p-1.5 rounded-full mb-0.5 transition-all ${
                    activeTab === tab.id ? 'bg-theme-primary shadow-lg border border-theme' : ''
                }`}>
                   <tab.icon className="w-5 h-5" style={{color: activeTab === tab.id ? 'var(--accent-color)' : 'var(--text-secondary)'}} />
                </div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-theme-secondary">
                    {tab.label}
                </span>
              </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default App;