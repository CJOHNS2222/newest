import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, collection, addDoc, getDocs, setDoc, serverTimestamp, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db, analytics } from './firebaseConfig'; // Adjust path if needed
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
import { logEvent } from 'firebase/analytics';

async function saveDayPlan(householdId: string, day: DayPlan) {
  const id = day.date; // 'YYYY-MM-DD'
  const ref = doc(db, 'households', householdId, 'mealPlan', id);
  await setDoc(ref, {
    date: Timestamp.fromDate(new Date(day.date)),
    meals: day.meals || [],
    lastModifiedBy: localStorage.getItem('clientId') || null,
    lastModifiedAt: serverTimestamp()
  }, { merge: true });
}

function next7DateKeys(start = new Date()) {
  const keys: string[] = [];
  const d = new Date(start);
  d.setHours(0,0,0,0);
  for (let i = 0; i < 7; i++) {
    const k = d.toISOString().slice(0,10); // 'YYYY-MM-DD'
    keys.push(k);
    d.setDate(d.getDate() + 1);
  }
  return keys;
}

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
  
  
// (mealPlan real-time listener is registered inside an effect below)

  // Keep `user` in sync with Firebase Auth to ensure rules use the correct uid
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) {
        setUser(null);
        return;
      }
      setUser(prev => ({
        id: fbUser.uid,
        name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'User'),
        email: fbUser.email || '',
        avatar: fbUser.photoURL || undefined,
        provider: fbUser.providerData?.[0]?.providerId?.includes('google') ? 'google' : 'email',
        hasSeenTutorial: prev?.hasSeenTutorial ?? false
      }));
    });
    return () => unsubscribe();
  }, []);
  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  const [showTutorial, setShowTutorial] = useState(false);
  const [showHousehold, setShowHousehold] = useState(false);

  // Data States
  const [inventory, setInventory] = useState<PantryItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [ratings, setRatings] = useState<RecipeRating[]>([]);
  const [mealPlan, setMealPlan] = useState<DayPlan[]>([]);
  // refs to household subcollection unsubscribe functions so we can cancel them immediately
  const householdUnsubsRef = useRef<{ inventory?: (() => void) | null; shopping?: (() => void) | null; recipes?: (() => void) | null; mealPlan?: (() => void) | null }>({});

  // Per-session client id used to mark writes so we can ignore our own snapshots
  const clientId = React.useMemo(() => {
    let id = localStorage.getItem('clientId');
    if (!id) {
      id = `client-${Math.random().toString(36).substr(2,9)}`;
      localStorage.setItem('clientId', id);
    }
    return id;
  }, []);

  const [household, setHousehold] = useState<Household | null>(() => {
    const saved = localStorage.getItem('household');
    return saved ? JSON.parse(saved) : null;
  });

  // Helper to determine if current user is a member of the household
  const isHouseholdMember = (h?: Household, u?: User | null) => {
    if (!h || !u) return false;
    if (Array.isArray(h.memberIds) && h.memberIds.includes(u.id)) return true;
    if (Array.isArray(h.members)) {
      return h.members.some(m => (m.id && m.id === u.id) || (m.email && m.email === u.email));
    }
    return false;
  };

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

  // UI toasts and Firestore error reporting
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type?: 'error' | 'info'; actionLabel?: string; action?: () => void }>>([]);
  const addToast = (message: string, type: 'error' | 'info' = 'error', ttl = 4000, actionLabel?: string, action?: () => void) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(prev => [{ id, message, type, actionLabel, action }, ...prev]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), ttl);
  };

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
      // Build 7-day window using ISO date keys (YYYY-MM-DD)
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = new Date();
      const initialPlan: DayPlan[] = [];

      for (let i = 0; i < 7; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          const iso = d.toISOString().slice(0,10); // YYYY-MM-DD
          initialPlan.push({
              date: iso,
              dayName: days[d.getDay()],
              meals: []
          });
      }
      setMealPlan(initialPlan);
    }
  }, []);

  // Helper: return array of next 7 ISO date keys starting at today
  const next7DateKeys = (startDate = new Date()) => {
    const keys: string[] = [];
    const d = new Date(startDate);
    d.setHours(0,0,0,0);
    for (let i = 0; i < 7; i++) {
      keys.push(d.toISOString().slice(0,10));
      d.setDate(d.getDate() + 1);
    }
    return keys;
  };

  // Firestore real-time sync for user inventory (always) and household data (if in household)
  // Autoselect user's household from Firestore (so mealPlan and household data load for members)
  useEffect(() => {
    if (!user?.id) return;
    // keep a ref copy of mealPlan to compare against incoming remote updates
    const mealPlanRef = { current: mealPlan } as { current: DayPlan[] };
    // flag to indicate we're applying a remote update (skip writes while true)
    const remoteMealPlanUpdateRef = { current: false } as { current: boolean };
    // keep these refs in outer scope by attaching to window for access in callbacks
    (window as any).__mealPlanRef = mealPlanRef;
    (window as any).__remoteMealPlanUpdateRef = remoteMealPlanUpdateRef;
    (async () => {
      try {
        const q = query(collection(db, 'households'), where('memberIds', 'array-contains', user.id));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0];
          const data = d.data();
          setHousehold(prev => ({ id: d.id, ...(data as any) } as Household));
        }else {
          setHousehold(null); // This line clears the household data if the user isn't in one.
        }
      } catch (err) {
        console.error('Error fetching households for user', err);
      }
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    let unsubUserInventory: any = null, unsubHouseholdInventory: any = null, unsubShopping: any = null, unsubRecipes: any = null, unsubMealPlan: any = null, unsubUserSaved: any = null, unsubUserMealPlan: any = null;
    const clientId = (window as any).clientId;

    import('firebase/firestore').then(({ collection, onSnapshot }) => {
      if (!active) return; // effect was cleaned up before import resolved
      
      // Always listen to user's own inventory
      unsubUserInventory = onSnapshot(
        collection(db, 'users', user.id, 'inventory'),
        snapshot => {
          const items: PantryItem[] = [];
          snapshot.forEach(doc => items.push(doc.data() as PantryItem));
          setInventory(items);
        },
        (error) => {
          console.error('User inventory listener error:', error);
          addToast('Unable to read your inventory (permission issue).', 'error');
        }
      );

      // If in a household, listen to household data
      if (household?.id && isHouseholdMember(household, user)) {
        let _unsubHouseholdInventory: any = null;
        _unsubHouseholdInventory = onSnapshot(
          collection(db, 'households', household.id, 'inventory'),
          snapshot => {
            // Optionally, merge or display household inventory if needed
          },
          (error) => {
            console.error('Household inventory listener error:', error);
            addToast('Unable to read household inventory (permission issue).', 'error');
            try { _unsubHouseholdInventory && _unsubHouseholdInventory(); } catch(e) {}
            if (householdUnsubsRef.current) householdUnsubsRef.current.inventory = null;
          }
        );
        unsubHouseholdInventory = _unsubHouseholdInventory;
        householdUnsubsRef.current.inventory = unsubHouseholdInventory;

        let _unsubShopping: any = null;
        _unsubShopping = onSnapshot(
          collection(db, 'households', household.id, 'shoppingList'),
          snapshot => {
            const items: ShoppingItem[] = [];
            snapshot.forEach(doc => items.push(doc.data() as ShoppingItem));
            setShoppingList(items);
          },
          (error) => {
            console.error('Household shopping listener error:', error);
            addToast('Unable to read household shopping list (permission issue).', 'error');
            try { _unsubShopping && _unsubShopping(); } catch(e) {}
            if (householdUnsubsRef.current) householdUnsubsRef.current.shopping = null;
          }
        );
        unsubShopping = _unsubShopping;
        householdUnsubsRef.current.shopping = unsubShopping;

        let _unsubRecipes: any = null;
        _unsubRecipes = onSnapshot(
          collection(db, 'households', household.id, 'savedRecipes'),
          snapshot => {
            const items: SavedRecipe[] = [];
            snapshot.forEach(doc => items.push(doc.data() as SavedRecipe));
            setSavedRecipes(items);
          },
          (error) => {
            console.error('Household savedRecipes listener error:', error);
            addToast('Unable to read household saved recipes (permission issue).', 'error');
            try { _unsubRecipes && _unsubRecipes(); } catch(e) {}
            if (householdUnsubsRef.current) householdUnsubsRef.current.recipes = null;
          }
        );
        unsubRecipes = _unsubRecipes;
        householdUnsubsRef.current.recipes = unsubRecipes;

        // Listen only to the next 7 days of the household mealPlan (range query)
        import('firebase/firestore').then(({ collection: _collection, onSnapshot: _onSnapshot, query: _query, where: _where, orderBy: _orderBy, Timestamp: _Timestamp }) => {
          const start = new Date(); start.setHours(0,0,0,0);
          const end = new Date(start); end.setDate(end.getDate() + 7);
          const q = _query(
            _collection(db, 'households', household.id, 'mealPlan'),
            _where('date', '>=', _Timestamp.fromDate(start)),
            _where('date', '<', _Timestamp.fromDate(end)),
            _orderBy('date')
          );
          let _unsubMealPlan: any = null;
          _unsubMealPlan = _onSnapshot(
            q,
            snapshot => {
              try {
                if ((window as any).__writingMealPlan) {
                  console.debug('Skipping mealPlan snapshot because local write in progress');
                  return;
                }

                const daysMap: Record<string, DayPlan> = {};
                snapshot.forEach(d => {
                  const data: any = d.data();
                  if (data?.lastModifiedBy && data.lastModifiedBy === clientId) {
                    return; // skip
                  }
                  const iso = data?.date?.toDate ? data.date.toDate().toISOString().slice(0,10) : d.id;
                  daysMap[iso] = { date: iso, dayName: new Date(iso).toLocaleDateString(undefined, { weekday: 'long' }), meals: data.meals || [] };
                });

                const keys = next7DateKeys();
                const result: DayPlan[] = keys.map(k => daysMap[k] || { date: k, dayName: new Date(k).toLocaleDateString(undefined, { weekday: 'long' }), meals: [] });

                const prev = (window as any).__mealPlanRef?.current || [];
                const prevJson = JSON.stringify(prev || []);
                const newJson = JSON.stringify(result || []);
                if (prevJson !== newJson) {
                  (window as any).__remoteMealPlanUpdateRef.current = true;
                  setMealPlan(result);
                  setTimeout(() => { (window as any).__remoteMealPlanUpdateRef.current = false; }, 800);
                }
              } catch (e) {
                console.error('Error processing mealPlan snapshot:', e);
                try { setMealPlan([]); } catch (_) {}
              }
            },
            (error) => {
              console.error('Household mealPlan listener error:', error);
              addToast('Unable to read household meal plan (permission issue).', 'error');
              try { _unsubMealPlan && _unsubMealPlan(); } catch(e) {}
              if (householdUnsubsRef.current) householdUnsubsRef.current.mealPlan = null;
            }
          );
          unsubMealPlan = _unsubMealPlan;
          householdUnsubsRef.current.mealPlan = unsubMealPlan;
        });
      }

      // Always listen to user's saved recipes (used when not in a household)
      let _unsubUserSaved: any = null;
      _unsubUserSaved = onSnapshot(
        collection(db, 'users', user.id, 'savedRecipes'),
        snapshot => {
          const items: SavedRecipe[] = [];
          snapshot.forEach(doc => items.push(doc.data() as SavedRecipe));
          if (!household?.id || !isHouseholdMember(household, user)) setSavedRecipes(items);
        },
        (error) => {
          console.error('User savedRecipes listener error:', error);
          if ((error as any)?.code === 'permission-denied') addToast('Unable to read your saved recipes (permission denied).', 'error');
          try { _unsubUserSaved && _unsubUserSaved(); } catch(e) {}
        }
      );
      unsubUserSaved = _unsubUserSaved;

      // Listen to user's personal mealPlan (fallback when not in household)
      let _unsubUserMealPlan: any = null;
      _unsubUserMealPlan = onSnapshot(
        collection(db, 'users', user.id, 'mealPlan'),
        snapshot => {
          if (household?.id && isHouseholdMember(household, user)) return;

          try {
            if ((window as any).__writingMealPlan) {
              console.debug('Skipping user mealPlan snapshot, local write in progress');
              return;
            }

            const daysMap: Record<string, DayPlan> = {};
            snapshot.forEach(d => {
              const data: any = d.data();
              if (data?.lastModifiedBy && data.lastModifiedBy === clientId) {
                return;
              }
              const iso = d.id;
              daysMap[iso] = { date: iso, dayName: new Date(iso).toLocaleDateString(undefined, { weekday: 'long' }), meals: data.meals || [] };
            });

            const keys = next7DateKeys();
            const result: DayPlan[] = keys.map(k => daysMap[k] || { date: k, dayName: new Date(k).toLocaleDateString(undefined, { weekday: 'long' }), meals: [] });

            const prev = (window as any).__mealPlanRef?.current || [];
            const prevJson = JSON.stringify(prev || []);
            const newJson = JSON.stringify(result || []);

            if (prevJson !== newJson) {
                (window as any).__remoteMealPlanUpdateRef.current = true;
                setMealPlan(result);
                setTimeout(() => { (window as any).__remoteMealPlanUpdateRef.current = false; }, 800);
            }
          } catch (e) {
              console.error('Error processing user mealPlan snapshot:', e);
          }
        },
        (error) => {
          console.error('User mealPlan listener error:', error);
          if ((error as any)?.code === 'permission-denied') addToast('Unable to read your meal plan (permission denied).', 'error');
          try { _unsubUserMealPlan && _unsubUserMealPlan(); } catch(e) {}
        }
      );
      unsubUserMealPlan = _unsubUserMealPlan;
    });

    return () => {
      active = false;
      if (unsubUserInventory) try { unsubUserInventory(); } catch (e) {}
      if (unsubHouseholdInventory) try { unsubHouseholdInventory(); } catch (e) {}
      if (unsubShopping) try { unsubShopping(); } catch (e) {}
      if (unsubRecipes) try { unsubRecipes(); } catch (e) {}
      if (unsubMealPlan) try { unsubMealPlan(); } catch (e) {}
      if (unsubUserSaved) try { unsubUserSaved(); } catch (e) {}
      if (unsubUserMealPlan) try { unsubUserMealPlan(); } catch (e) {}
      
      try { householdUnsubsRef.current.inventory && householdUnsubsRef.current.inventory(); } catch(e) {}
      try { householdUnsubsRef.current.shopping && householdUnsubsRef.current.shopping(); } catch(e) {}
      try { householdUnsubsRef.current.recipes && householdUnsubsRef.current.recipes(); } catch(e) {}
      try { householdUnsubsRef.current.mealPlan && householdUnsubsRef.current.mealPlan(); } catch(e) {}
      householdUnsubsRef.current.inventory = null;
      householdUnsubsRef.current.shopping = null;
      householdUnsubsRef.current.recipes = null;
      householdUnsubsRef.current.mealPlan = null;
    };
  }, [user?.id, household?.id]);

  // Write changes to Firestore user and household collections individually (no batch)
  useEffect(() => {
    if (!user?.id) return;
    if ((window as any).__remoteMealPlanUpdateRef?.current) {
      console.debug('Write effect skipped due to remoteMealPlanUpdateRef flag');
      return;
    }
    
    import('firebase/firestore').then(async ({ setDoc, doc: fsDoc }) => {
      (window as any).__writingMealPlan = true;
      try {
        // Always write inventory to user's collection
        const userWrites = inventory.map(item => (
          setDoc(fsDoc(db, 'users', user.id, 'inventory', item.item), item).catch(err => ({ err, path: `users/${user.id}/inventory/${item.item}` }))
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
              setDoc(fsDoc(db, 'households', household.id, 'inventory', item.item), item).catch(err => ({ err, path: `households/${household.id}/inventory/${item.item}` }))
            );
          });
          savedRecipes.forEach(item => {
            householdWrites.push(
              setDoc(fsDoc(db, 'households', household.id, 'savedRecipes', item.id), item).catch(err => ({ err, path: `households/${household.id}/savedRecipes/${item.id}` }))
            );
          });
          mealPlan.forEach(item => {
            const docId = item.date; // expected 'YYYY-MM-DD'
            const payload: any = {
              date: Timestamp.fromDate(new Date(item.date)),
              meals: item.meals || [],
              lastModifiedBy: clientId,
              lastModifiedAt: serverTimestamp()
            };
            householdWrites.push(
              setDoc(fsDoc(db, 'households', household.id, 'mealPlan', docId), payload, { merge: true }).catch(err => ({ err, path: `households/${household.id}/mealPlan/${docId}` }))
            );
          });

          const hResults = await Promise.allSettled(householdWrites);
          let sawPermissionError = false;
          hResults.forEach((res) => {
            const maybeErr = (res.status === 'fulfilled' ? (res.value as any)?.err : (res as any).reason) || null;
            if (maybeErr) {
              console.error('Household write failed:', res);
              addToast('Failed to save some household data (permission or network issue).', 'error');
              if ((maybeErr as any)?.code === 'permission-denied' || String((maybeErr as any)?.message || '').toLowerCase().includes('permission')) {
                sawPermissionError = true;
              }
            }
          });
          if (sawPermissionError) {
            (window as any).__householdWriteBlockedUntil = Date.now() + 30000;
            console.warn('Blocking household writes for 30s due to permission errors');
          }
        }
        else {
          // Not in household: save mealPlan and savedRecipes to user's own collection
          const userMealWrites: Promise<any>[] = [];
          mealPlan.forEach(item => {
            const docId = item.date;
            const payload: any = { date: Timestamp.fromDate(new Date(item.date)), meals: item.meals || [], lastModifiedBy: clientId, lastModifiedAt: serverTimestamp() };
            userMealWrites.push(setDoc(fsDoc(db, 'users', user.id, 'mealPlan', docId), payload, { merge: true }).catch(err => ({ err, path: `users/${user.id}/mealPlan/${docId}` })));
          });
          
          const userSavedWrites: Promise<any>[] = [];
          savedRecipes.forEach(item => {
            userSavedWrites.push(setDoc(fsDoc(db, 'users', user.id, 'savedRecipes', item.id), item).catch(err => ({ err, path: `users/${user.id}/savedRecipes/${item.id}` })));
          });

          const uResults = await Promise.allSettled(userMealWrites);
          uResults.forEach((res) => {
            if (res.status === 'rejected' || (res.status === 'fulfilled' && (res.value as any)?.err)) {
              console.error('User mealPlan write failed:', res);
              addToast('Failed to save your meal plan (permission or network issue).', 'error');
            }
          });

          const sResults = await Promise.allSettled(userSavedWrites);
          sResults.forEach((res, idx) => {
            if (res.status === 'rejected' || (res.status === 'fulfilled' && (res.value as any)?.err)) {
              console.error('User savedRecipes write failed:', res);
              addToast(`Failed to save recipe: ${savedRecipes[idx]?.title || savedRecipes[idx]?.id}`, 'error');
            }
          });
        }
      } catch (err) {
        console.error('Error during Firestore writes:', err);
        addToast('Error saving data to Firestore.', 'error');
      }
      finally {
        setTimeout(() => { (window as any).__writingMealPlan = false; }, 400);
      }
    });
  }, [user?.id, household?.id, inventory, savedRecipes, mealPlan]);

  // Immediately unsubscribe from household listeners when the user is no longer a member
  useEffect(() => {
    const member = isHouseholdMember(household, user);
    if (!member) {
      const refs = householdUnsubsRef.current;
      if (refs.inventory) { try { refs.inventory(); } catch (e) {} refs.inventory = null; }
      if (refs.shopping) { try { refs.shopping(); } catch (e) {} refs.shopping = null; }
      if (refs.recipes) { try { refs.recipes(); } catch (e) {} refs.recipes = null; }
      if (refs.mealPlan) { try { refs.mealPlan(); } catch (e) {} refs.mealPlan = null; }
      console.debug('Unsubscribed household listeners because user is not a member');
    }
  }, [household?.id, user?.id]);

  // Keep a global-ref updated so snapshot callbacks can compare against latest local state
  useEffect(() => {
    (window as any).__mealPlanRef = (window as any).__mealPlanRef || { current: mealPlan };
    (window as any).__mealPlanRef.current = mealPlan;
    (window as any).__remoteMealPlanUpdateRef = (window as any).__remoteMealPlanUpdateRef || { current: false };
  }, [mealPlan]);

  // Debounced individual writes for shopping list
  useEffect(() => {
    if (!household?.id || !isHouseholdMember(household, user)) return;
    const timeout = setTimeout(async () => {
      try {
        const { setDoc, doc: fsDoc } = await import('firebase/firestore');
        const writes = shoppingList.map(item =>
          setDoc(fsDoc(db, 'households', household.id, 'shoppingList', item.id), item).catch(err => ({ err, id: item.id }))
        );
        const results = await Promise.allSettled(writes);
        results.forEach((r, i) => {
          if (r.status === 'rejected' || (r.status === 'fulfilled' && (r.value as any)?.err)) {
            console.error('Shopping list write failed for item', shoppingList[i], r);
            addToast(`Failed to save shopping item: ${shoppingList[i].item}`, 'error');
          }
        });
      } catch (err) {
        console.error('Error writing shopping list:', err);
        addToast('Error saving shopping list to Firestore.', 'error');
      }
    }, 500); // 500ms debounce
    return () => clearTimeout(timeout);
  }, [household?.id, shoppingList]);

  // Persistence
  useEffect(() => { localStorage.setItem('user', JSON.stringify(user)); }, [user]);
  useEffect(() => { localStorage.setItem('mealPlan', JSON.stringify(mealPlan)); }, [mealPlan]);
  useEffect(() => { localStorage.setItem('household', JSON.stringify(household)); }, [household]);
  
  // Listen to all ratings from Firestore (for Community tab - shared across all users)
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
      if ((error as any)?.code === 'permission-denied' || (error as any)?.message?.toLowerCase?.().includes('permission')) {
        addToast('Unable to read community ratings (permission denied).', 'error');
      }
      const saved = localStorage.getItem('ratings');
      if (saved) setRatings(JSON.parse(saved));
    });
    return () => unsubscribe();
  }, [user?.id]);


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

    logEvent(analytics, 'login', { method: loggedInUser.provider });
    
    if (isNewMember && household?.id) {
      logEvent(analytics, 'join_group', { groupId: household.id, groupName: household.name });
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

    if (!user?.id) {
      addToast('Please sign in to save recipes.', 'error');
      return;
    }
    import('firebase/firestore').then(async ({ setDoc, doc: fsDoc }) => {
      try {
        if (household?.id && isHouseholdMember(household, user)) {
          await setDoc(fsDoc(db, 'households', household.id, 'savedRecipes', newSaved.id), newSaved, { merge: true });
        } else {
          await setDoc(fsDoc(db, 'users', user.id, 'savedRecipes', newSaved.id), newSaved, { merge: true });
        }
        addToast('Recipe saved to favorites!', 'info');
      } catch (err) {
        console.error('Failed to persist saved recipe:', err);
        addToast('Failed to save recipe to server.', 'error');
      }
    }).catch(err => {
      console.error('Firestore import failed for saveRecipe:', err);
      addToast('Failed to save recipe (internal error).', 'error');
    });
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
          />
        )}
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
              addToShoppingList={(items) => {
                const newItems = items.map(i => ({ id: Math.random().toString(36).substr(2,9), item: i, category: 'Manual', checked: false }));
                setShoppingList(prev => [...prev, ...newItems]);
                setActiveTab(Tab.SHOPPING);
              }}
              onAddToPlan={handleAddToPlan}
              onSaveRecipe={handleSaveRecipe}
              onMarkAsMade={()=>{}}
            />
          )}
          {activeTab === Tab.SHOPPING && (
              <ShoppingList 
                items={shoppingList} 
                setItems={setShoppingList} 
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
              />
          )}
          {activeTab === Tab.RECIPES && (
              <RecipeFinder 
                  onAddToPlan={handleAddToPlan} 
                  onSaveRecipe={handleSaveRecipe}
                  onMarkAsMade={()=>{}}
                  inventory={inventory}
                  ratings={ratings}
                  onRate={()=>{}}
                  savedRecipes={savedRecipes}
                  onShareRecipe={(recipe) => {
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
                onSaveRecipe={handleSaveRecipe}
              />
          )}
          {activeTab === Tab.SETTINGS && (
            <Settings settings={settings} setSettings={setSettings} user={user || undefined} onLogout={handleLogout} />
          )}
        </main>
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
    </>
  );
}

export default App;