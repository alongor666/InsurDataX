
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Log the config for easier debugging by the user
if (typeof window !== 'undefined') { // Only log in the browser
  console.log("Firebase Config Loaded by SDK:");
  console.log("API Key:", firebaseConfig.apiKey ? "Loaded" : "MISSING or UNDEFINED");
  console.log("Auth Domain:", firebaseConfig.authDomain ? firebaseConfig.authDomain : "MISSING or UNDEFINED");
  console.log("Project ID:", firebaseConfig.projectId ? firebaseConfig.projectId : "MISSING or UNDEFINED");
}


let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth: Auth = getAuth(app);

export { app, auth };

