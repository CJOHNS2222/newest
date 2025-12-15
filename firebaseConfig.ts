import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, indexedDBLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { Capacitor } from '@capacitor/core';
import webFirebaseConfig from './VITE_firebaseConfig';

let config;
// Use different config for mobile vs web
if (Capacitor.isNativePlatform()) {
  // For native builds, environment variables are not reliable.
  // We use a hardcoded configuration that matches the google-services.json.
  config = {
    apiKey: "AIzaSyDmtkZUB3HpH_I9P8cITASUEgnrbnTLZ3s",
    authDomain: "gen-lang-client-0893655267.firebaseapp.com",
    projectId: "gen-lang-client-0893655267",
    storageBucket: "gen-lang-client-0893655267.appspot.com",
    messagingSenderId: "651327126572",
    appId: "1:651327126572:android:df9a284cff89eedaff6589"
  };
} else {
  // For web builds, we use the Vite config that loads from environment variables.
  config = webFirebaseConfig;
}

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