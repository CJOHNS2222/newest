import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, indexedDBLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { Capacitor } from '@capacitor/core';
import firebaseConfig from './VITE_firebaseConfig';

// Use different config for mobile vs web if needed
const config = Capacitor.isNativePlatform() ? {
  ...firebaseConfig,
  // Add any mobile-specific overrides here if needed
} : firebaseConfig;

const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Set auth persistence based on platform
if (Capacitor.isNativePlatform()) {
  // Use indexedDB persistence for mobile (better for Capacitor apps)
  setPersistence(auth, indexedDBLocalPersistence);
} else {
  // Use localStorage persistence for web
  setPersistence(auth, browserLocalPersistence);
}

// Only initialize analytics on web
export const analytics = Capacitor.isNativePlatform() ? null : getAnalytics(app);