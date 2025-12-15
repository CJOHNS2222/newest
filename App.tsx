import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, analytics } from './firebaseConfig';
import { Login } from './components/Login';
import { HouseholdManager } from './components/Household';
import { AppHeader } from './components/layout/AppHeader';
import { AppNavigation } from './components/layout/AppNavigation';
import { MainContent } from './components/layout/MainContent';
import { User, PantryItem, DayPlan, StructuredRecipe, Household, ShoppingItem, SavedRecipe, RecipeRating, RecipeSearchResult } from './types';
import { Tab } from './types/app';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useSettings } from './hooks/useSettings';
import { useToasts } from './hooks/useToasts';
import { useDataManagement } from './hooks/useDataManagement';
import { isHouseholdMember } from './utils/appUtils';
import { logEvent } from 'firebase/analytics';

type Theme = 'dark' | 'light';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.PANTRY);
  const [persistedRecipeResult, setPersistedRecipeResult] = useState<RecipeSearchResult | null>(null);

  // UI States
  const [showTutorial, setShowTutorial] = useState(false);
  const [showHousehold, setShowHousehold] = useState(false);

  // Custom hooks
  const { user, setUser, handleLogout } = useAuth();
  const { settings, setSettings } = useSettings();
  const { theme } = useTheme(settings.theme);
  const { toasts, addToast } = useToasts();
  const {
    inventory,
    setInventory,
    shoppingList,
    setShoppingList,
    savedRecipes,
    setSavedRecipes,
    ratings,
    mealPlan,
    setMealPlan,
    household,
    setHousehold,
    handleAddToPlan,
    handleSaveRecipe,
    handleDeleteRecipe,
    handleRateRecipe,
  } = useDataManagement(user, addToast);




  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    const isNewMember = !household?.members.find(m => m.email === loggedInUser.email);
    setHousehold(prev => {
        if (isNewMember && prev) {
             return {
                 ...prev,
                 members: [...prev.members, {
                     id: loggedInUser.id,
                     name: loggedInUser.name,
                     email: loggedInUser.email,
                     role: 'Admin',
                     status: 'Active'
                 }]
             };
        }
        return prev;
    });
    if (!loggedInUser.hasSeenTutorial) setShowTutorial(true);

    if (analytics) {
      logEvent(analytics, 'login', { method: loggedInUser.provider });
    }
    
    if (isNewMember && household?.id) {
      if (analytics) {
        logEvent(analytics, 'join_group', { groupId: household.id, groupName: household.name });
      }
    }

    if (loggedInUser?.email) {
      import('firebase/firestore').then(({ query, where, getDocs, collection }) => {
        const notificationsQuery = query(
          collection(db, "notifications"),
          where("email", "==", loggedInUser.email),
          where("read", "==", false)
        );
        getDocs(notificationsQuery).then(snapshot => {
          const unread: any[] = [];
          snapshot.forEach(doc => unread.push({ id: doc.id, ...doc.data() }));
          if (unread.length > 0) {
            setNotifications(unread);
            setShowNotificationsModal(true);
          }
        });
      });
    }
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <>
      <div className="min-h-screen flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative border-x border-theme transition-colors duration-300" style={{ background: 'var(--theme-background, var(--theme-primary))' }}>
        {showHousehold && (
          <HouseholdManager 
              user={user} 
              household={household} 
              setHousehold={setHousehold} 
              onClose={() => setShowHousehold(false)}
              setActiveTab={setActiveTab}
          />
        )}
        <AppHeader user={user} settings={settings} setSettings={setSettings} onShowHousehold={() => setShowHousehold(true)} />
        <MainContent 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          inventory={inventory}
          setInventory={setInventory}
          shoppingList={shoppingList}
          setShoppingList={setShoppingList}
          mealPlan={mealPlan}
          setMealPlan={setMealPlan}
          savedRecipes={savedRecipes}
          ratings={ratings}
          settings={settings}
          setSettings={setSettings}
          persistedRecipeResult={persistedRecipeResult}
          setPersistedRecipeResult={setPersistedRecipeResult}
          onAddToPlan={handleAddToPlan}
          onSaveRecipe={handleSaveRecipe}
          onDeleteRecipe={handleDeleteRecipe}
          onRateRecipe={handleRateRecipe}
          onMoveToPantry={(items) => {
            setInventory(prev => {
              const updated = [...prev];
              items.forEach(i => {
                const idx = updated.findIndex(p => p.item.toLowerCase() === i.item.toLowerCase());
                let addQty = typeof i.quantity === 'number' ? i.quantity : 1;
                if (addQty < 1) addQty = 1;
                if (idx !== -1) {
                  const prevQty = parseInt(updated[idx].quantity_estimate) || 1;
                  updated[idx].quantity_estimate = (prevQty + Math.abs(addQty)).toString();
                } else {
                  updated.push({ item: i.item, category: i.category, quantity_estimate: Math.abs(addQty).toString() });
                }
              });
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
          onAddToShoppingList={(items) => {
            const newItems = items.map(i => ({ id: Math.random().toString(36).substr(2,9), item: i, category: 'Manual', checked: false }));
            setShoppingList(prev => [...prev, ...newItems]);
            setActiveTab(Tab.SHOPPING);
          }}
          onLogout={handleLogout}
        />
        <AppNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </>
  );
}

export default App;



