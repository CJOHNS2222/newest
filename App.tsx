import React, { useState, useEffect } from 'react';
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
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

async function saveDayPlan(householdId: string, day: DayPlan) {
  const id = day.date; // 'YYYY-MM-DD'
  const ref = doc(db, 'households', householdId, 'mealPlan', id);
  await setDoc(ref, {
    date: Timestamp.fromDate(new Date(day.date)),
    meals: day.meals || []
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
// Firestore real-time sync for meal plan
const start = new Date(); start.setHours(0,0,0,0);
const end = new Date(start); end.setDate(end.getDate() + 7);
const q = query(
  collection(db, 'households', householdId, 'mealPlan'),
  where('date', '>=', Timestamp.fromDate(start)),
  where('date', '<', Timestamp.fromDate(end))
);

const unsubscribe = onSnapshot(q, snapshot => {
  const days: Record<string, DayPlan> = {};
  snapshot.forEach(doc => {
    const data = doc.data();
    const iso = data.date.toDate().toISOString().slice(0,10);
    days[iso] = { date: iso, meals: data.meals || [] };
  });

  // Build array of 7 DayPlan in order, filling missing days with empty meals
  const keys = next7DateKeys();
  const result: DayPlan[] = keys.map(k => days[k] || { date: k, meals: [] });
  setMealPlan(result);
});

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

  const [household, setHousehold] = useState<Household>(() => {
    const saved = localStorage.getItem('household');
    return saved ? JSON.parse(saved) : { id: 'h1', name: 'My Family', members: [] };
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

  // UI toasts and Firestore error reporting
  const [toasts, setToasts] = useState<{ id: number; message: string; type?: 'error' | 'info' }[]>([]);
  const addToast = (message: string, type: 'error' | 'info' = 'error', ttl = 5000) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(prev => [{ id, message, type }, ...prev]);
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
  useEffect(() => {
    if (!user?.id) return;
    let unsubUserInventory = null, unsubHouseholdInventory = null, unsubShopping = null, unsubRecipes = null, unsubMealPlan = null;
    import('firebase/firestore').then(({ collection, onSnapshot }) => {
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
      if (household?.id) {
        unsubHouseholdInventory = onSnapshot(
          collection(db, 'households', household.id, 'inventory'),
          snapshot => {
            // Optionally, merge or display household inventory if needed
          },
          (error) => {
            console.error('Household inventory listener error:', error);
            addToast('Unable to read household inventory (permission issue).', 'error');
          }
        );
        unsubShopping = onSnapshot(
          collection(db, 'households', household.id, 'shoppingList'),
          snapshot => {
            const items: ShoppingItem[] = [];
            snapshot.forEach(doc => items.push(doc.data() as ShoppingItem));
            setShoppingList(items);
          },
          (error) => {
            console.error('Household shopping listener error:', error);
            addToast('Unable to read household shopping list (permission issue).', 'error');
          }
        );
        unsubRecipes = onSnapshot(
          collection(db, 'households', household.id, 'savedRecipes'),
          snapshot => {
            const items: SavedRecipe[] = [];
            snapshot.forEach(doc => items.push(doc.data() as SavedRecipe));
            setSavedRecipes(items);
          },
          (error) => {
            console.error('Household savedRecipes listener error:', error);
            addToast('Unable to read household saved recipes (permission issue).', 'error');
          }
        );
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
          unsubMealPlan = _onSnapshot(
            q,
            snapshot => {
              const daysMap: Record<string, DayPlan> = {};
              snapshot.forEach(d => {
                const data: any = d.data();
                const iso = data?.date?.toDate ? data.date.toDate().toISOString().slice(0,10) : d.id;
                daysMap[iso] = { date: iso, dayName: new Date(iso).toLocaleDateString(undefined, { weekday: 'long' }), meals: data.meals || [] };
              });
              const keys = next7DateKeys(start);
              const result: DayPlan[] = keys.map(k => daysMap[k] || { date: k, dayName: new Date(k).toLocaleDateString(undefined, { weekday: 'long' }), meals: [] });
              setMealPlan(result);
            },
            (error) => {
              console.error('Household mealPlan listener error:', error);
              addToast('Unable to read household meal plan (permission issue).', 'error');
            }
          );
        });
      }
    });
    return () => {
      if (unsubUserInventory) unsubUserInventory();
      if (unsubHouseholdInventory) unsubHouseholdInventory();
      if (unsubShopping) unsubShopping();
      if (unsubRecipes) unsubRecipes();
      if (unsubMealPlan) unsubMealPlan();
    };
  }, [user?.id, household?.id]);

  // Write changes to Firestore user and household collections individually (no batch)
  useEffect(() => {
    if (!user?.id) return;
    import('firebase/firestore').then(async ({ setDoc, doc: fsDoc }) => {
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
        if (household?.id) {
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
              meals: item.meals || []
            };
            householdWrites.push(
              setDoc(fsDoc(db, 'households', household.id, 'mealPlan', docId), payload, { merge: true }).catch(err => ({ err, path: `households/${household.id}/mealPlan/${docId}` }))
            );
          });
          const hResults = await Promise.allSettled(householdWrites);
          hResults.forEach((res, idx) => {
            if (res.status === 'rejected' || (res.status === 'fulfilled' && (res.value as any)?.err)) {
              console.error('Household write failed:', res);
              addToast('Failed to save some household data (permission or network issue).', 'error');
            }
          });
        }
      } catch (err) {
        console.error('Error during Firestore writes:', err);
        addToast('Error saving data to Firestore.', 'error');
      }
    });
  }, [user?.id, household?.id, inventory, savedRecipes, mealPlan]);

  // Debounced individual writes for shopping list
  useEffect(() => {
    if (!household?.id) return;
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
  useEffect(() => {
    if (!user || !household?.id) return;
    const unsubscribe = onSnapshot(
      doc(db, "households", household.id),
      (docSnap) => {
        const data = docSnap.data();
        if (data && data.inventory) {
          setInventory(data.inventory);
        }
      },
      (error) => {
        console.error('Household doc snapshot error:', error);
        addToast('Unable to load household document (permission issue).', 'error');
      }
    );
    return () => unsubscribe();
  }, [user, household?.id]);
  useEffect(() => {
    if (!user || !household?.id) return;
    const unsubscribe = onSnapshot(
      doc(db, "households", household.id),
      (docSnap) => {
        const data = docSnap.data();
        if (data) {
          if (data.inventory) setInventory(data.inventory);
          if (data.shoppingList) setShoppingList(data.shoppingList);
          if (data.savedRecipes) setSavedRecipes(data.savedRecipes);
          if (data.mealPlan) setMealPlan(data.mealPlan);
        }
      },
      (error) => {
        console.error('Household doc snapshot error (detailed):', error);
        addToast('Unable to load household data (permission issue).', 'error');
      }
    );
    return () => unsubscribe();
  }, [user, household?.id]);
  
  // Listen to all ratings from Firestore (for Community tab - shared across all users)
  useEffect(() => {
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
          userAvatar: data.userAvatar
        } as RecipeRating);
      });
      // Update with all ratings from Firestore (whether empty or populated)
      setRatings(allRatings);
    }, (error) => {
      console.error('Error loading ratings from Firestore:', error);
      // Fall back to localStorage if Firestore fails
      const saved = localStorage.getItem('ratings');
      if (saved) setRatings(JSON.parse(saved));
    });
    return () => unsubscribe();
  }, []);

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
    setSavedRecipes(prev => [newSaved, ...prev]);
    logEvent(analytics, 'save_recipe', { title: recipe.title });
    alert("Recipe saved to favorites!");
  };

  const handleAddRating = async (rating: RecipeRating) => {
    // Save to local state
    setRatings(prev => [rating, ...prev]);
    
    // Save to Firestore (shared database)
    try {
      await addDoc(collection(db, 'ratings'), {
        ...rating,
        userId: user?.id || 'anonymous',
        timestamp: new Date().toISOString()
      });
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
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-2 rounded-lg shadow-md text-sm max-w-xs ${t.type === 'error' ? 'bg-red-700 text-white' : 'bg-gray-800 text-white'}`}>
            {t.message}
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
              {window.location.hostname === 'localhost' && (
                <button
                  onClick={createTestHousehold}
                  disabled={isCreatingHousehold}
                  className="ml-2 px-3 py-1 rounded bg-amber-600 text-white text-sm"
                >
                  {isCreatingHousehold ? 'Creating...' : 'Create Test Household'}
                </button>
              )}
              {window.location.hostname === 'localhost' && (
                <button
                  onClick={() => inviteTestEmail('chrisj221986@gmail.com')}
                  disabled={isInvitingTest}
                  className="ml-2 px-3 py-1 rounded bg-amber-500 text-white text-sm"
                >
                  {isInvitingTest ? 'Inviting...' : 'Invite Test Email'}
                </button>
              )}
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
    </>
  );
}

export default App;