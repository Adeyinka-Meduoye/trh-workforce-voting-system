import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Support optional Vite environment variables with fallback to bundled config for seamless Vercel deployment
const activeFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId
};

// Initialize Firebase safely
const app: FirebaseApp = getApps().length === 0 ? initializeApp(activeFirebaseConfig) : getApp();

export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with multi-tab offline persistent local cache to drastically reduce read quota
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    },
    activeFirebaseConfig.firestoreDatabaseId || undefined
  );
} catch {
  // If already initialized or persistent cache unsupported (e.g. private browsing mode)
  dbInstance = getFirestore(app, activeFirebaseConfig.firestoreDatabaseId || undefined);
}

export const db: Firestore = dbInstance;

export default app;
