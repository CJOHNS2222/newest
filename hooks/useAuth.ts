import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { User } from '../types';
import { logEvent } from 'firebase/analytics';
import { analytics } from '../firebaseConfig';

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

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

  // Persist user to localStorage
  useEffect(() => {
    localStorage.setItem('user', JSON.stringify(user));
  }, [user]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    logEvent(analytics, 'login', { method: loggedInUser.provider });
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