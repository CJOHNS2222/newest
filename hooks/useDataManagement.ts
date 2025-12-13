import { useState, useEffect, useRef, useMemo } from 'react';
import { doc, onSnapshot, collection, addDoc, getDocs, setDoc, serverTimestamp, query, where, orderBy, Timestamp, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User, PantryItem, DayPlan, Household, ShoppingItem, SavedRecipe, RecipeRating, RecipeSearchResult } from '../types';
import { next7DateKeys, isHouseholdMember } from '../utils/appUtils';

export function useDataManagement(user: User | null, addToast: (message: string, type?: 'error' | 'info') => void) {
  // Data States
  const [inventory, setInventory] = useState<PantryItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [ratings, setRatings] = useState<RecipeRating[]>([]);
  const [mealPlan, setMealPlan] = useState<DayPlan[] | null>(null);
  const [household, setHousehold] = useState<Household | null>(() => {
    const saved = localStorage.getItem('household');
    return saved ? JSON.parse(saved) : null;
  });

  // refs to household subcollection unsubscribe functions
  const householdUnsubsRef = useRef<{ inventory?: (() => void) | null; shopping?: (() => void) | null; recipes?: (() => void) | null; mealPlan?: (() => void) | null }>({});

  // Per-session client id used to mark writes
  const clientId = useMemo(() => {
    let id = localStorage.getItem('clientId');
    if (!id) {
      id = `client-${Math.random().toString(36).substr(2,9)}`;
      localStorage.setItem('clientId', id);
    }
    return id;
  }, []);

  // Firestore synchronization effects
  useEffect(() => {
    if (!user?.id) return;

    const unsubs: (()=>void)[] = [];

    // Listener for user's own inventory
    unsubs.push(onSnapshot(collection(db, 'users', user.id, 'inventory'), snap => {
      setInventory(snap.docs.map(d => d.data() as PantryItem));
    }, err => console.error("Inventory listener failed:", err)));

    // Determine if we are in a valid household
    const inHousehold = isHouseholdMember(household, user) && household?.id;

    if (inHousehold) {
      // Household listeners
      unsubs.push(onSnapshot(collection(db, 'households', household.id, 'shoppingList'), snap => {
        setShoppingList(snap.docs.map(d => ({ id: d.id, ...d.data() } as ShoppingItem)));
      }, err => console.error("Household shoppingList listener failed:", err)));

      unsubs.push(onSnapshot(collection(db, 'households', household.id, 'savedRecipes'), snap => {
        setSavedRecipes(snap.docs.map(d => d.data() as SavedRecipe));
      }, err => console.error("Household savedRecipes listener failed:", err)));

      unsubs.push(onSnapshot(collection(db, 'households', household.id, 'mealPlan'), snap => {
        // Create a 7-day template starting from today
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = new Date();
        const fullWeekPlan: DayPlan[] = [];

        for (let i = 0; i < 7; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          const iso = d.toISOString().slice(0, 10);
          fullWeekPlan.push({
            date: iso,
            dayName: days[d.getDay()],
            meals: []
          });
        }

        // Merge Firestore data into the template
        snap.docs.forEach(doc => {
          const data = doc.data();
          const dateStr = data.date.toDate().toISOString().slice(0, 10);
          const existingDay = fullWeekPlan.find(day => day.date === dateStr);
          if (existingDay) {
            existingDay.meals = data.meals || [];
          }
        });

        // Only update if different from current
        if (JSON.stringify(fullWeekPlan) !== JSON.stringify(mealPlan)) {
          (window as any).__remoteMealPlanUpdateRef = { current: true };
          setMealPlan(fullWeekPlan);
          setTimeout(() => { (window as any).__remoteMealPlanUpdateRef = { current: false }; }, 100);
        }
      }, err => console.error("Household mealPlan listener failed:", err)));
    } else {
      // Individual user listeners
      unsubs.push(onSnapshot(collection(db, 'users', user.id, 'shoppingList'), snap => {
        setShoppingList(snap.docs.map(d => ({ id: d.id, ...d.data() } as ShoppingItem)));
      }, err => console.error("User shoppingList listener failed:", err)));

      unsubs.push(onSnapshot(collection(db, 'users', user.id, 'savedRecipes'), snap => {
        setSavedRecipes(snap.docs.map(d => d.data() as SavedRecipe));
      }, err => console.error("User savedRecipes listener failed:", err)));

      unsubs.push(onSnapshot(collection(db, 'users', user.id, 'mealPlan'), snap => {
        // Create a 7-day template starting from today
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = new Date();
        const fullWeekPlan: DayPlan[] = [];

        for (let i = 0; i < 7; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          const iso = d.toISOString().slice(0, 10);
          fullWeekPlan.push({
            date: iso,
            dayName: days[d.getDay()],
            meals: []
          });
        }

        // Merge Firestore data into the template
        snap.docs.forEach(doc => {
          const data = doc.data();
          const dateStr = data.date.toDate().toISOString().slice(0, 10);
          const existingDay = fullWeekPlan.find(day => day.date === dateStr);
          if (existingDay) {
            existingDay.meals = data.meals || [];
          }
        });

        // Only update if different from current
        if (JSON.stringify(fullWeekPlan) !== JSON.stringify(mealPlan)) {
          (window as any).__remoteMealPlanUpdateRef = { current: true };
          setMealPlan(fullWeekPlan);
          setTimeout(() => { (window as any).__remoteMealPlanUpdateRef = { current: false }; }, 100);
        }
      }, err => console.error("User mealPlan listener failed:", err)));
    }

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user?.id, household?.id]);

  // Write changes to Firestore
  useEffect(() => {
    if (!user?.id) return;
    if ((window as any).__remoteMealPlanUpdateRef?.current) {
      return;
    }

    (async () => {
      (window as any).__writingMealPlan = true;
      try {
        // Always write inventory to user's collection
        const userWrites = inventory.map(item => (
          setDoc(doc(db, 'users', user.id, 'inventory', item.item), item).catch(err => ({ err, path: `users/${user.id}/inventory/${item.item}` }))
        ));
        const results: any[] = await Promise.allSettled(userWrites);
        results.forEach((res, idx) => {
          if (res.status === 'rejected' || (res.status === 'fulfilled' && (res.value as any)?.err)) {
            console.error('User inventory write failed:', res);
            addToast(`Failed to save inventory item: ${inventory[idx].item}`, 'error');
          }
        });

        // If in a household, also write to household collections
        const now = Date.now();
        const blockedUntil = (window as any).__householdWriteBlockedUntil || 0;
        if (household?.id && isHouseholdMember(household, user) && now >= blockedUntil) {
          const householdWrites: Promise<any>[] = [];
          inventory.forEach(item => {
            householdWrites.push(
              setDoc(doc(db, 'households', household.id, 'inventory', item.item), item).catch(err => ({ err, path: `households/${household.id}/inventory/${item.item}` }))
            );
          });
          savedRecipes.forEach(item => {
            householdWrites.push(
              setDoc(doc(db, 'households', household.id, 'savedRecipes', item.id), item).catch(err => ({ err, path: `households/${household.id}/savedRecipes/${item.id}` }))
            );
          });
          if (mealPlan) {
            mealPlan.forEach(item => {
              // Only save days that have meals
              if (item.meals && item.meals.length > 0) {
                const docId = item.date; // expected 'YYYY-MM-DD'
                const payload: any = {
                  date: Timestamp.fromDate(new Date(item.date)),
                  meals: item.meals || [],
                  lastModifiedBy: clientId,
                  lastModifiedAt: serverTimestamp()
                };
                householdWrites.push(
                  setDoc(doc(db, 'households', household.id, 'mealPlan', docId), payload).catch(err => ({ err, path: `households/${household.id}/mealPlan/${docId}` }))
                );
              }
            });
          }
          const householdResults = await Promise.allSettled(householdWrites);
          householdResults.forEach((res, idx) => {
            if (res.status === 'rejected' || (res.status === 'fulfilled' && (res.value as any)?.err)) {
              console.error('Household write failed:', res);
              addToast('Failed to save some household data', 'error');
            }
          });
        } else {
          // Individual user collections (when not in household)
          const userWrites: Promise<any>[] = [];
          savedRecipes.forEach(item => {
            userWrites.push(
              setDoc(doc(db, 'users', user.id, 'savedRecipes', item.id), item).catch(err => ({ err, path: `users/${user.id}/savedRecipes/${item.id}` }))
            );
          });
          if (mealPlan) {
            mealPlan.forEach(item => {
              // Only save days that have meals
              if (item.meals && item.meals.length > 0) {
                const docId = item.date; // expected 'YYYY-MM-DD'
                const payload: any = {
                  date: Timestamp.fromDate(new Date(item.date)),
                  meals: item.meals || [],
                  lastModifiedBy: clientId,
                  lastModifiedAt: serverTimestamp()
                };
                userWrites.push(
                  setDoc(doc(db, 'users', user.id, 'mealPlan', docId), payload).catch(err => ({ err, path: `users/${user.id}/mealPlan/${docId}` }))
                );
              }
            });
          }
          const userResults = await Promise.allSettled(userWrites);
          userResults.forEach((res, idx) => {
            if (res.status === 'rejected' || (res.status === 'fulfilled' && (res.value as any)?.err)) {
              console.error('User write failed:', res);
              addToast('Failed to save some user data', 'error');
            }
          });
        }
      } finally {
        (window as any).__writingMealPlan = false;
      }
    })();
  }, [user?.id, household?.id, inventory, savedRecipes, mealPlan]);

  // Shopping list sync
  useEffect(() => {
    // Debounced shopping list sync logic here...
  }, [shoppingList]);

  // Meal plan sync
  useEffect(() => {
    // Meal plan sync logic here...
  }, [mealPlan]);

  // Ratings listener
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = onSnapshot(collection(db, 'ratings'), (snapshot) => {
      const allRatings: RecipeRating[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        allRatings.push({
          id: doc.id,
          recipeTitle: data.recipeTitle,
          rating: data.rating,
          comment: data.comment,
          userName: data.userName,
          date: data.date,
          userAvatar: data.userAvatar,
          ingredients: data.ingredients || data.recipe?.ingredients || [],
          instructions: data.instructions || data.recipe?.instructions || [],
          recipe: data.recipe || undefined
        } as RecipeRating);
      });
      setRatings(allRatings);
    }, (error) => {
      console.error('Error loading ratings from Firestore:', error);
      if ((error as any)?.code === 'permission-denied') {
        addToast('Unable to read community ratings (permission denied).', 'error');
      }
      const saved = localStorage.getItem('ratings');
      if (saved) setRatings(JSON.parse(saved));
    });
    return () => unsubscribe();
  }, [user?.id]);

  // Persistence
  useEffect(() => { localStorage.setItem('mealPlan', JSON.stringify(mealPlan)); }, [mealPlan]);
  useEffect(() => { localStorage.setItem('household', JSON.stringify(household)); }, [household]);

  // Handlers
  const handleAddToPlan = (recipe: any) => {
    if (!mealPlan) return;
    const today = new Date().toISOString().slice(0, 10);
    let updatedPlan = [...mealPlan];

    // Check if today exists in the plan
    const todayIndex = updatedPlan.findIndex(day => day.date === today);
    if (todayIndex === -1) {
      // Add today to the plan
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayDate = new Date();
      updatedPlan.push({
        date: today,
        dayName: days[todayDate.getDay()],
        meals: []
      });
      // Sort by date
      updatedPlan.sort((a, b) => a.date.localeCompare(b.date));
    }

    // Now add the recipe to today as a meal object
    updatedPlan = updatedPlan.map(day => {
      if (day.date === today) {
        const newMeal = {
          id: `meal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          recipe: recipe
        };
        return { ...day, meals: [...day.meals, newMeal] };
      }
      return day;
    });

    setMealPlan(updatedPlan);
    addToast(`Added ${recipe.title} to today's meal plan!`);
  };

  const handleSaveRecipe = async (recipe: any) => {
    if (!user?.id) return;
    try {
      const inHousehold = isHouseholdMember(household, user) && household?.id;
      const collectionPath = inHousehold ? `households/${household.id}/savedRecipes` : `users/${user.id}/savedRecipes`;
      
      await addDoc(collection(db, collectionPath), {
        ...recipe,
        savedAt: serverTimestamp(),
        savedBy: user.name,
        userId: user.id
      });
      
      addToast(`Saved ${recipe.title} to your recipes!`);
    } catch (error) {
      console.error('Error saving recipe:', error);
      addToast('Failed to save recipe. Please try again.', 'error');
    }
  };

  const handleDeleteRecipe = async (recipe: SavedRecipe) => {
    if (!user?.id) return;
    try {
      const inHousehold = isHouseholdMember(household, user) && household?.id;
      const collectionPath = inHousehold ? `households/${household.id}/savedRecipes` : `users/${user.id}/savedRecipes`;
      
      await deleteDoc(doc(db, collectionPath, recipe.id));
      
      addToast(`Removed ${recipe.title} from your saved recipes.`);
    } catch (error) {
      console.error('Error deleting recipe:', error);
      addToast('Failed to delete recipe. Please try again.', 'error');
    }
  };

  const handleRateRecipe = async (ratingData: any) => {
    if (!user?.id) return;
    try {
      await addDoc(collection(db, 'ratings'), {
        ...ratingData,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        date: serverTimestamp()
      });
      addToast('Thank you for your rating!');
    } catch (error) {
      console.error('Error submitting rating:', error);
      addToast('Failed to submit rating. Please try again.', 'error');
    }
  };

  return {
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
  };
}