// lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth }        from "firebase/auth";
import { getAnalytics }   from "firebase/analytics";

const firebaseConfig = {
  apiKey:    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:     process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

// Only initialize Analytics in the browser:
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}
console.log("▶︎ Firebase projectId:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

export { app, analytics };
export const auth = getAuth(app);
