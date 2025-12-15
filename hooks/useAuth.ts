import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { User } from '../types';
import { logEvent } from 'firebase/analytics';
import { analytics, db } from '../firebaseConfig';

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        return;
      }

      // Create user document if it doesn't exist
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      console.log('User document check:', fbUser.uid, 'exists:', userDocSnap.exists());

      if (!userDocSnap.exists()) {
        console.log('Creating user document for:', fbUser.uid);
        try {
          // Create user document with default subscription
          await setDoc(userDocRef, {
            subscription: {
              tier: 'premium',
              status: 'active',
              current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
              cancel_at_period_end: false
            },
            createdAt: new Date(),
            email: fbUser.email,
            name: fbUser.displayName
          });
          console.log('User document created successfully');
        } catch (error) {
          console.error('Failed to create user document:', error);
        }
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

  // Persist user to localStorage
  useEffect(() => {
    localStorage.setItem('user', JSON.stringify(user));
  }, [user]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    if (analytics) {
      logEvent(analytics, 'login', { method: loggedInUser.provider });
    }
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to log out?")) {
      signOut(getAuth());
      setUser(null);
      localStorage.clear();
      window.location.reload();
    }
  };

  return { user, setUser, handleLogin, handleLogout };
}