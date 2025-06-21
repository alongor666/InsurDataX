
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// This check prevents re-initialization in a Next.js server-side environment,
// which can cause errors.
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.error("Firebase initialization error:", error);
    // In a real app, you might want to handle this more gracefully
    throw new Error("Could not initialize Firebase. Please check your configuration.");
  }
} else {
  app = getApp();
}

auth = getAuth(app);
db = getFirestore(app);

// Diagnostic log to help confirm config loading
// This will run on both server and client, which is fine for debugging.
if (typeof window !== 'undefined') { // Only log on the client-side for clarity
    console.log("Firebase Init Check (Client-side):", {
        apiKey: firebaseConfig.apiKey ? 'loaded' : 'MISSING',
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
    });
}


export { app, auth, db };
