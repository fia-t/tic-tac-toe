"use client";
import { FirebaseOptions, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";

// Публічна (не секретна) конфігурація Firebase Web SDK - значення підставляються
// збіркою Next.js з .env.local (мають префікс NEXT_PUBLIC_, інакше недоступні в браузері).
const firebaseConfig: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let auth: Auth | null = null;
let db: Firestore | null = null;

// Лінива ініціалізація - щоб build/SSR не падав, якщо .env.local ще не заповнений
// (наприклад, при першому локальному запуску до налаштування Firebase-проєкту).
const getFirebase = () => {
    if (!isFirebaseConfigured) {
        throw new Error(
            "Firebase не налаштовано: заповніть NEXT_PUBLIC_FIREBASE_* змінні у .env.local (див. .env.local.example)."
        );
    }
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    if (!auth) auth = getAuth(app);
    if (!db) db = getFirestore(app);
    return { auth, db };
};

export const getFirebaseAuth = (): Auth => getFirebase().auth as Auth;
export const getFirebaseDb = (): Firestore => getFirebase().db as Firestore;
