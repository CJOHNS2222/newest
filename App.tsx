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
        // store unsub so we can cancel immediately if membership changes
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
                // If we recently performed local writes, skip processing the incoming snapshot
                if ((window as any).__writingMealPlan) {
                  console.debug('Skipping mealPlan snapshot because local write in progress');
                  return;
                }

                const daysMap: Record<string, DayPlan> = {};
                snapshot.forEach(d => {
                  const data: any = d.data();
                  // Ignore documents that were last modified by this client to avoid echoing our own writes
                  if (data?.lastModifiedBy && data.lastModifiedBy === (localStorage.getItem('clientId') || '')) {
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
                  // mark remote update to avoid immediate write-back
                  (window as any).__remoteMealPlanUpdateRef.current = true;
                  setMealPlan(result);
                  // clear flag shortly after to allow future writes
                  setTimeout(() => { (window as any).__remoteMealPlanUpdateRef.current = false; }, 800);
                }
              } catch (e) {
                console.error('Error processing mealPlan snapshot:', e);
                // best-effort apply
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
          // Only apply user's saved recipes when not viewing a household's savedRecipes
          if (!household?.id || !isHouseholdMember(household, user)) setSavedRecipes(items);
        },
        (error) => {
          console.error('User savedRecipes listener error:', error);
          // don't spam the user; only show toast on permission issues
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
          const daysMap: Record<string, DayPlan> = {};
          snapshot.forEach(d => {
            const data: any = d.data();
            const iso = d.id;
            daysMap[iso] = { date: iso, dayName: new Date(iso).toLocaleDateString(undefined, { weekday: 'long' }), meals: data.meals || [] };
          });
          // Only apply when not in a household
          if (!household?.id || !isHouseholdMember(household, user)) {
            const keys = next7DateKeys();
            const result: DayPlan[] = keys.map(k => daysMap[k] || { date: k, dayName: new Date(k).toLocaleDateString(undefined, { weekday: 'long' }), meals: [] });
            setMealPlan(result);
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
      // mark inactive so pending import.then won't attach listeners
      active = false;
      if (unsubUserInventory) try { unsubUserInventory(); } catch (e) {}
      if (unsubHouseholdInventory) try { unsubHouseholdInventory(); } catch (e) {}
      if (unsubShopping) try { unsubShopping(); } catch (e) {}
      if (unsubRecipes) try { unsubRecipes(); } catch (e) {}
      if (unsubMealPlan) try { unsubMealPlan(); } catch (e) {}
      if (unsubUserSaved) try { unsubUserSaved(); } catch (e) {}
      if (unsubUserMealPlan) try { unsubUserMealPlan(); } catch (e) {}
      // clear stored household unsub refs
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
    // If we are applying a remote mealPlan update, skip writing back to Firestore to avoid loops
    if ((window as any).__remoteMealPlanUpdateRef?.current) {
      console.debug('Write effect skipped due to remoteMealPlanUpdateRef flag');
      return;
    }
    console.debug('Firestore write effect started', { clientId, householdId: household?.id, inventoryLen: inventory.length, savedRecipesLen: savedRecipes.length, mealPlanLen: mealPlan.length });
    import('firebase/firestore').then(async ({ setDoc, doc: fsDoc }) => {
      // mark that we're performing a local write to mealPlan/savedRecipes so snapshots
      // that reflect our own writes can be ignored to avoid feedback loops
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
        console.debug('Checking household write permission', { householdId: household?.id, isMember: isHouseholdMember(household, user), blockedUntil: (window as any).__householdWriteBlockedUntil });
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
          // Save each day's plan as a document with ID = YYYY-MM-DD and a `date` timestamp field
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
          // Also save user's personal mealPlan documents so non-household users persist their plan
          mealPlan.forEach(item => {
            const docId = item.date;
            const payload: any = { date: Timestamp.fromDate(new Date(item.date)), meals: item.meals || [], lastModifiedBy: clientId, lastModifiedAt: serverTimestamp() };
            householdWrites.push(
              setDoc(fsDoc(db, 'users', user.id, 'mealPlan', docId), payload, { merge: true }).catch(err => ({ err, path: `users/${user.id}/mealPlan/${docId}` }))
            );
          });
          const hResults = await Promise.allSettled(householdWrites);
          console.debug('Household write results', hResults);
          // If we get repeated permission errors, block household writes briefly to avoid tight loops
          let sawPermissionError = false;
          hResults.forEach((res, idx) => {
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
            // block further household writes for 30s
            (window as any).__householdWriteBlockedUntil = Date.now() + 30000;
            console.warn('Blocking household writes for 30s due to permission errors');
          }
        }
        else {
          // Not in household: save mealPlan to user's own collection
          const userMealWrites: Promise<any>[] = [];
          mealPlan.forEach(item => {
            const docId = item.date;
            const payload: any = { date: Timestamp.fromDate(new Date(item.date)), meals: item.meals || [], lastModifiedBy: clientId, lastModifiedAt: serverTimestamp() };
            userMealWrites.push(setDoc(fsDoc(db, 'users', user.id, 'mealPlan', docId), payload, { merge: true }).catch(err => ({ err, path: `users/${user.id}/mealPlan/${docId}` })));
          });
          // Also persist savedRecipes to the user's personal collection when not in a household
          const userSavedWrites: Promise<any>[] = [];
          savedRecipes.forEach(item => {
            userSavedWrites.push(setDoc(fsDoc(db, 'users', user.id, 'savedRecipes', item.id), item).catch(err => ({ err, path: `users/${user.id}/savedRecipes/${item.id}` })));
          });
          const uResults = await Promise.allSettled(userMealWrites);
          console.debug('User mealPlan write results', uResults);
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
        // clear write-in-progress flag after a short delay to let snapshot events arrive
        setTimeout(() => { (window as any).__writingMealPlan = false; }, 400);
      }
    });
  }, [user?.id, household?.id, inventory, savedRecipes, mealPlan]);

  // Immediately unsubscribe from household listeners when the user is no longer a member
  useEffect(() => {
    const member = isHouseholdMember(household, user);
    if (!member) {
      const refs = householdUnsubsRef.current;
      if (refs.inventory) {
        try { refs.inventory(); } catch (e) {}
        refs.inventory = null;
      }
      if (refs.shopping) {
        try { refs.shopping(); } catch (e) {}
        refs.shopping = null;
      }
      if (refs.recipes) {
        try { refs.recipes(); } catch (e) {}
        refs.recipes = null;
      }
      if (refs.mealPlan) {
        try { refs.mealPlan(); } catch (e) {}
        refs.mealPlan = null;
      }
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
  // Note: household subcollections (inventory, shoppingList, savedRecipes, mealPlan)
  // are listened to individually (collection listeners) above. Avoid listening to
  // the aggregate `households/{id}` doc here to prevent conflicts where both the
  // doc field and subcollection listeners try to overwrite `mealPlan`/`savedRecipes`.
  
  // Listen to all ratings from Firestore (for Community tab - shared across all users)
  // Only subscribe after Firebase Auth has resolved to avoid permission errors on startup
  useEffect(() => {
    if (!user?.id) return; // wait for authenticated user
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
      // Show a user-friendly toast on permission errors and fall back to local cache
      if ((error as any)?.code === 'permission-denied' || (error as any)?.message?.toLowerCase?.().includes('permission')) {
        addToast('Unable to read community ratings (permission denied).', 'error');
      }
      const saved = localStorage.getItem('ratings');
      if (saved) setRatings(JSON.parse(saved));
    });
    return () => unsubscribe();
  }, [user?.id]);

  useEffect(() => { localStorage.setItem('mealPlan', JSON.stringify(mealPlan)); }, [mealPlan]);
  useEffect(() => { localStorage.setItem('household', JSON.stringify(household)); }, [household]);

  // Dev helper: create a test household using the current signed-in user
  const [isCreatingHousehold, setIsCreatingHousehold] = useState(false);
  const createTestHousehold = async () => {
    try {
      setIsCreatingHousehold(true);
      const auth = getAuth();
      const fbUser = auth.currentUser;
      if (!fbUser) {
        addToast('Not signed in. Please sign in and try again.', 'error');
        return;
      }
      const id = (crypto && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `hh-${Date.now()}`;
      const householdRef = doc(db, 'households', id);
      const newHousehold = {
        name: 'Test Household',
        createdAt: serverTimestamp(),
        members: [{ id: fbUser.uid, name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Owner'), email: fbUser.email || '', role: 'Owner', status: 'Active' }],
        memberIds: [fbUser.uid]
      };
      await setDoc(householdRef, newHousehold);
      setHousehold({ id, ...newHousehold } as any);
      addToast(`Created household ${id}`, 'info');
    } catch (err) {
      console.error('Create household error', err);
      addToast('Failed to create household. Check console.', 'error');
    } finally {
      setIsCreatingHousehold(false);
    }
  };
  // Dev helper: invite a test email using the deployed HTTP function
  const [isInvitingTest, setIsInvitingTest] = useState(false);
  const inviteTestEmail = async (targetEmail: string) => {
    if (!household?.id) return addToast('No household selected; create one first.', 'error');
    try {
      setIsInvitingTest(true);
      const auth = getAuth();
      const fbUser = auth.currentUser;
      if (!fbUser) return addToast('Not signed in. Please sign in and try again.', 'error');
      const idToken = await fbUser.getIdToken();
      const resp = await fetch('https://us-central1-gen-lang-client-0893655267.cloudfunctions.net/inviteMemberHttp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
        body: JSON.stringify({ email: targetEmail, householdId: household.id })
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        console.error('Invite failed', resp.status, json);
        addToast('Invite failed: ' + (json?.error || resp.status), 'error');
      } else {
        addToast('Invite sent (check households/notifications).', 'info');
        console.log('inviteMemberHttp response', json);
        // Optionally, refresh household doc snapshot will pick up new member
      }
    } catch (err) {
      console.error('Invite error', err);
      addToast('Invite request failed; see console.', 'error');
    } finally {
      setIsInvitingTest(false);
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    const isNewMember = !household?.members.find(m => m.email === loggedInUser.email);
    setHousehold(prev => {
        if (isNewMember) {
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

    // Log login event
    logEvent(analytics, 'login', { method: loggedInUser.provider });
    
    // Log join_group event if this is a new member
    if (isNewMember && household?.id) {
      logEvent(analytics, 'join_group', { groupId: household.id, groupName: household.name });
    }

    // Fetch unread notifications for user
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
    // Notification Modal
    const NotificationModal = () => (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{
          background: '#fff',
          color: '#2A0A10',
          borderRadius: '1rem',
          padding: '2rem',
          minWidth: '300px',
          maxWidth: '90vw',
          boxShadow: '0 2px 16px rgba(0,0,0,0.2)'
        }}>
          <h2 style={{marginBottom: '1rem'}}>Notifications</h2>
          {notifications.map(n => (
            <div key={n.id} style={{marginBottom: '1rem', padding: '1rem', background: '#FECACA', borderRadius: '0.5rem'}}>
              <strong>{n.type === 'household_invite' ? 'Household Invite' : 'Notification'}</strong>
              <div>{n.message}</div>
              <div style={{fontSize: '0.8rem', color: '#6B7280'}}>{n.timestamp?.toDate?.().toLocaleString?.() || ''}</div>
            </div>
          ))}
          <button
            onClick={async () => {
              // Delete notifications from Firestore
              const { deleteDoc, doc: fsDoc } = await import('firebase/firestore');
              for (const n of notifications) {
                await deleteDoc(fsDoc(db, 'notifications', n.id));
              }
              setShowNotificationsModal(false);
              setNotifications([]);
            }}
            style={{marginTop: '1rem', background: '#2A0A10', color: '#fff', padding: '0.5rem 1rem', borderRadius: '0.5rem'}}>
            Close
          </button>
        </div>
      </div>
    );
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
    // update local state immediately for optimistic UI
    setSavedRecipes(prev => [newSaved, ...prev]);
    logEvent(analytics, 'save_recipe', { title: recipe.title });
    // Persist to Firestore: household if member, otherwise user's personal savedRecipes
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

  // Confirmation modal state for marking recipes as made
  const [confirmMark, setConfirmMark] = useState<null | { recipe: StructuredRecipe; impacts: Array<{ idx: number; itemName: string; cur: number; amt: number; newQty: number }>; }>(null);

  // Handler to compute impacts and either ask for confirmation or apply change
  const handleMarkAsMade = (recipe: StructuredRecipe) => {
    if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
      addToast('No ingredients found for this recipe.', 'error');
      return;
    }

    const updated = inventory.map(item => ({ ...item }));
    const parseAmount = (text: string) => {
      if (!text) return 1;
      const frac = text.match(/(\d+)\s*\/\s*(\d+)/);
      if (frac) {
        const n = parseFloat(frac[1]);
        const d = parseFloat(frac[2]) || 1;
        return n / d;
      }
      const num = text.match(/(\d+(?:\.\d+)?)/);
      if (num) return parseFloat(num[0]);
      return 1;
    };

    const impacts: Array<{ idx: number; itemName: string; cur: number; amt: number; newQty: number }> = [];

    recipe.ingredients.forEach(ing => {
      const ingLower = (ing || '').toLowerCase();
      let idx = -1;
      for (let i = 0; i < updated.length; i++) {
        try { if (ingLower.includes(updated[i].item.toLowerCase())) { idx = i; break; } } catch (e) {}
      }
      if (idx === -1) {
        for (let i = 0; i < updated.length; i++) {
          const invName = updated[i].item.toLowerCase();
          const words = invName.split(/\s+/).filter(Boolean);
          for (const w of words) {
            if (w.length > 2 && ingLower.includes(w)) { idx = i; break; }
          }
          if (idx !== -1) break;
        }
      }
      if (idx !== -1) {
        const amt = parseAmount(ing);
        const cur = parseFloat(updated[idx].quantity_estimate || '0') || 0;
        const newQty = Math.max(0, cur - amt);
        impacts.push({ idx, itemName: updated[idx].item, cur, amt, newQty });
      }
    });

    // Determine whether confirmation is needed: any large subtraction or depleting item
    const needsConfirm = impacts.some(i => i.amt >= 5 || i.newQty <= 0 || (i.cur > 0 && ((i.cur - i.newQty) / i.cur) > 0.5));
    if (needsConfirm) {
      setConfirmMark({ recipe, impacts });
      return;
    }

    // Apply immediately with undo support
    const prevSnapshot = inventory.map(i => ({ ...i }));
    const newInventory = updated.map(i => ({ ...i }));
    impacts.forEach(imp => {
      newInventory[imp.idx].quantity_estimate = String(Math.round(imp.newQty));
    });
    setInventory(newInventory);

    addToast('Marked recipe as made — undo', 'info', 8000, 'Undo', () => {
      setInventory(prevSnapshot);
      addToast('Undo complete — pantry restored.', 'info', 3000);
    });
  };

  const handleAddRating = async (rating: RecipeRating) => {
    // Try to enrich rating with recipe details (ingredients/instructions) from savedRecipes or persisted result
    const findRecipeDetails = () => {
      const title = rating.recipeTitle?.toLowerCase?.();
      if (!title) return null;
      const byTitle = (r: any) => (r?.title && String(r.title).toLowerCase() === title);
      const foundSaved = savedRecipes.find(byTitle as any) as any | undefined;
      if (foundSaved) return foundSaved;
      if (persistedRecipeResult && Array.isArray(persistedRecipeResult.recipes)) {
        const foundResp = persistedRecipeResult.recipes.find((r: any) => String(r.title).toLowerCase() === title);
        if (foundResp) return foundResp;
      }
      return null;
    };
    const details = findRecipeDetails();
    const enriched: any = { ...rating };
    if (details) {
      if (Array.isArray(details.ingredients)) enriched.ingredients = details.ingredients;
      if (Array.isArray(details.instructions)) enriched.instructions = details.instructions;
      enriched.recipe = details;
    }

    // Save to local state (with possible enrichment)
    setRatings(prev => [enriched as RecipeRating, ...prev]);

    // Save to Firestore (shared database) with enrichment
    try {
      const payload: any = {
        ...rating,
        userId: user?.id || 'anonymous',
        timestamp: new Date().toISOString(),
      };
      if (enriched.ingredients) payload.ingredients = enriched.ingredients;
      if (enriched.instructions) payload.instructions = enriched.instructions;
      if (enriched.recipe) payload.recipe = enriched.recipe;
      await addDoc(collection(db, 'ratings'), payload);
    } catch (error) {
      console.error('Error saving rating to Firestore:', error);
      // Rating is still saved locally
    }
  };

  // Notification Scheduling
  useEffect(() => {
    if (settings.notifications.enabled) {
      // Cancel previous notifications
      LocalNotifications.cancel({ notifications: [{ id: 1 }, { id: 2 }] });
      // Schedule shopping list notification
      if (settings.notifications.types.shoppingList) {
        const [hour, minute] = settings.notifications.time.split(':');
        const now = new Date();
        const notifTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hour), parseInt(minute));
        if (notifTime < now) notifTime.setDate(notifTime.getDate() + 1); // Next day if time passed
        LocalNotifications.schedule({
          notifications: [
            {
              id: 1,
              title: 'Shopping List Reminder',
              body: 'Check your shopping list today!',
              schedule: { at: notifTime },
            },
          ],
        });
        logEvent(analytics, 'notification_received', { type: 'shopping_list', time: settings.notifications.time });
      }
      // Schedule meal plan notification
      if (settings.notifications.types.mealPlan) {
        const [hour, minute] = settings.notifications.time.split(':');
        const now = new Date();
        const notifTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hour), parseInt(minute));
        if (notifTime < now) notifTime.setDate(notifTime.getDate() + 1);
        LocalNotifications.schedule({
          notifications: [
            {
              id: 2,
              title: 'Meal Plan Reminder',
              body: 'Review your meal plan for today!',
              schedule: { at: notifTime },
            },
          ],
        });
        logEvent(analytics, 'notification_received', { type: 'meal_plan', time: settings.notifications.time });
      }
    } else {
      // Cancel all notifications if disabled
      LocalNotifications.cancel({ notifications: [{ id: 1 }, { id: 2 }] });
    }
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
    <>
      {showNotificationsModal && <NotificationModal />}
      {confirmMark && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center">
          <div className="bg-white dark:bg-theme-primary text-theme-primary dark:text-theme-secondary rounded-xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-lg font-bold mb-2">Confirm Mark as Made</h3>
            <p className="mb-4">This will subtract the following quantities from your pantry. Proceed?</p>
            <div className="mb-4 max-h-48 overflow-y-auto">
              {confirmMark.impacts.map((imp, i) => (
                <div key={i} className="flex justify-between border-b py-2">
                  <div>
                    <div className="font-medium">{imp.itemName}</div>
                    <div className="text-xs opacity-70">Current: {imp.cur} • Subtract: {imp.amt}</div>
                  </div>
                  <div className="text-sm font-bold">After: {imp.newQty}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmMark(null)} className="px-4 py-2 rounded bg-gray-200">Cancel</button>
              <button onClick={() => {
                // apply
                const prevSnapshot = inventory.map(i => ({ ...i }));
                const newInventory = inventory.map(i => ({ ...i }));
                confirmMark.impacts.forEach(imp => {
                  newInventory[imp.idx].quantity_estimate = String(Math.round(imp.newQty));
                });
                setInventory(newInventory);
                setConfirmMark(null);
                addToast('Marked recipe as made — undo', 'info', 8000, 'Undo', () => {
                  setInventory(prevSnapshot);
                  addToast('Undo complete — pantry restored.', 'info', 3000);
                });
              }} className="px-4 py-2 rounded bg-[var(--accent-color)] text-white">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-2 rounded-lg shadow-md text-sm max-w-xs ${t.type === 'error' ? 'bg-red-700 text-white' : 'bg-gray-800 text-white'}`}>
            <div className="flex justify-between items-center gap-2">
              <div className="flex-1">{t.message}</div>
              {t.actionLabel && t.action && (
                <button onClick={() => { try { t.action && t.action(); } finally { setToasts(prev => prev.filter(x => x.id !== t.id)); } }} className="ml-3 underline text-sm font-bold">
                  {t.actionLabel}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
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
              {/* Dev: create test household button when running locally */}
              {/* Dev buttons removed (create test household / invite test email) */}
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
              addToShoppingList={(items) => {
                const newItems = items.map(i => ({ id: Math.random().toString(36).substr(2,9), item: i, category: 'Manual', checked: false }));
                setShoppingList(prev => [...prev, ...newItems]);
                setActiveTab(Tab.SHOPPING);
              }}
              onAddToPlan={handleAddToPlan}
              onSaveRecipe={handleSaveRecipe}
              onMarkAsMade={handleMarkAsMade}
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
                  onMarkAsMade={handleMarkAsMade}
                  inventory={inventory}
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
                onSaveRecipe={handleSaveRecipe}
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
    </>
  );
}

export default App;