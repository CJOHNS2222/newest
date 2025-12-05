import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
   apiKey: "AIzaSyBqJB2SjnyoKvNPx5jZbGD96DnqMLrVsOc",
   authDomain: "gen-lang-client-0893655267.firebaseapp.com",
   projectId: "gen-lang-client-0893655267",
   storageBucket: "gen-lang-client-0893655267.firebasestorage.app",
   messagingSenderId: "651327126572",
   appId: "1:651327126572:web:2ab6f25e9b9bd0caff6589",
   measurementId: "G-EX7Q4N2Z81"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);