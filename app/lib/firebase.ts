"use client";
import { FirebaseApp, FirebaseOptions, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { Analytics, getAnalytics, isSupported, logEvent } from "firebase/analytics";

// Публічна (не секретна) конфігурація Firebase Web SDK - значення підставляються
// збіркою Next.js з .env.local (мають префікс NEXT_PUBLIC_, інакше недоступні в браузері).
const firebaseConfig: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;
let analyticsCheckStarted = false;

// Лінива ініціалізація - щоб build/SSR не падав, якщо .env.local ще не заповнений
// (наприклад, при першому локальному запуску до налаштування Firebase-проєкту).
const getFirebaseApp = (): FirebaseApp => {
    if (!isFirebaseConfigured) {
        throw new Error(
            "Firebase не налаштовано: заповніть NEXT_PUBLIC_FIREBASE_* змінні у .env.local (див. .env.local.example)."
        );
    }
    if (!app) app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    return app;
};

export const getFirebaseAuth = (): Auth => {
    if (!auth) auth = getAuth(getFirebaseApp());
    return auth;
};

// Firestore тепер підтримує кілька баз в одному проєкті - якщо створена не
// стандартна "(default)", а іменована (напр. "tic-tac-toe"), потрібно явно
// підключитись саме до неї другим аргументом getFirestore.
const firestoreDatabaseId = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID;

export const getFirebaseDb = (): Firestore => {
    if (!db) {
        db = firestoreDatabaseId
            ? getFirestore(getFirebaseApp(), firestoreDatabaseId)
            : getFirestore(getFirebaseApp());
    }
    return db;
};

// Analytics працює лише в браузері й лише якщо задано measurementId (потребує
// Google Analytics, увімкненого у Firebase-проєкті) та середовище його підтримує
// (isSupported повертає false, напр. у деяких приватних режимах браузера) -
// тому виклик "тихий": відсутність аналітики ніколи не повинна ламати гру.
const ensureAnalytics = async (): Promise<Analytics | null> => {
    if (typeof window === "undefined" || !isFirebaseConfigured || !firebaseConfig.measurementId) return null;
    if (analytics) return analytics;
    if (analyticsCheckStarted) return null;
    analyticsCheckStarted = true;

    try {
        const supported = await isSupported();
        if (!supported) return null;
        analytics = getAnalytics(getFirebaseApp());
        return analytics;
    } catch {
        return null;
    }
};

export const trackEvent = (name: string, params?: Record<string, unknown>): void => {
    void ensureAnalytics().then((instance) => {
        if (instance) logEvent(instance, name, params);
    });
};
