"use client";
import {
    collection,
    doc,
    addDoc,
    getDocs,
    deleteDoc,
    updateDoc,
    query,
    where,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage, isFirebaseConfigured } from "@/app/lib/firebase";

export type ThemeImageKind = "background" | "x" | "o";

export type Theme = {
    id: string;
    name: string;
    backgroundUrl: string;
    xMarkerUrl: string;
    oMarkerUrl: string;
    active: boolean;
    order: number;
    createdAt: Timestamp | null;
};

// Тема "за замовчуванням" - той самий вигляд, що й до появи адмінки. Слугує
// фолбеком, поки в Firestore немає жодної активної теми (свіжий деплой) або
// Firebase взагалі не налаштовано.
export const DEFAULT_THEME: Theme = {
    id: "default",
    name: "Класична",
    backgroundUrl: "/images/sand.png",
    xMarkerUrl: "/images/x-marker-2.png",
    oMarkerUrl: "/images/o-marker-2.png",
    active: true,
    order: 0,
    createdAt: null,
};

const themesCollection = "themes";

const toTheme = (id: string, data: Record<string, unknown>): Theme => ({
    id,
    name: (data.name as string) ?? "",
    backgroundUrl: (data.backgroundUrl as string) ?? "",
    xMarkerUrl: (data.xMarkerUrl as string) ?? "",
    oMarkerUrl: (data.oMarkerUrl as string) ?? "",
    active: Boolean(data.active),
    order: (data.order as number) ?? 0,
    createdAt: (data.createdAt as Timestamp) ?? null,
});

// Публічний список активних тем - читає будь-хто, навіть до анонімного входу
// (потрібно гравцю ще до старту гри). Тиха відмова на будь-яку помилку -
// відсутність тем ніколи не повинна ламати гру, лише вмикати DEFAULT_THEME.
export const getActiveThemes = async (): Promise<Theme[]> => {
    if (!isFirebaseConfigured) return [];
    try {
        const db = getFirebaseDb();
        // Сортування "order" - на клієнті, а не через Firestore orderBy, щоб не
        // вимагати композитний індекс (equality + orderBy на різних полях).
        const q = query(collection(db, themesCollection), where("active", "==", true));
        const snap = await getDocs(q);
        return snap.docs
            .map((d) => toTheme(d.id, d.data()))
            .filter((theme) => theme.backgroundUrl && theme.xMarkerUrl && theme.oMarkerUrl)
            .sort((a, b) => a.order - b.order);
    } catch {
        return [];
    }
};

export const pickRandomTheme = (themes: Theme[]): Theme => {
    if (themes.length === 0) return DEFAULT_THEME;
    return themes[Math.floor(Math.random() * themes.length)];
};

// --- Адмінські операції (запис дозволений лише isAdmin() у Security Rules) ---

export const getAllThemes = async (): Promise<Theme[]> => {
    const db = getFirebaseDb();
    const snap = await getDocs(collection(db, themesCollection));
    return snap.docs.map((d) => toTheme(d.id, d.data())).sort((a, b) => a.order - b.order);
};

export const createTheme = async (name: string): Promise<string> => {
    const db = getFirebaseDb();
    const docRef = await addDoc(collection(db, themesCollection), {
        name,
        backgroundUrl: "",
        xMarkerUrl: "",
        oMarkerUrl: "",
        active: false,
        order: Date.now(),
        createdAt: serverTimestamp(),
    });
    return docRef.id;
};

export const updateTheme = async (themeId: string, patch: Partial<Omit<Theme, "id" | "createdAt">>): Promise<void> => {
    const db = getFirebaseDb();
    await updateDoc(doc(db, themesCollection, themeId), patch);
};

export const deleteTheme = async (themeId: string): Promise<void> => {
    const db = getFirebaseDb();
    await deleteDoc(doc(db, themesCollection, themeId));
    // Найкраще зусилля - видаляємо й файли з тим самим префіксом; якщо котрогось
    // не існувало (тему ще не доукомплектували зображеннями), просто ігноруємо.
    const storage = getFirebaseStorage();
    await Promise.all(
        (["background", "x", "o"] as ThemeImageKind[]).map(async (kind) => {
            try {
                await deleteObject(ref(storage, `themes/${themeId}/${kind}`));
            } catch {
                // файлу могло не бути - це нормально
            }
        })
    );
};

export const uploadThemeImage = async (themeId: string, file: File, kind: ThemeImageKind): Promise<string> => {
    const storage = getFirebaseStorage();
    const storageRef = ref(storage, `themes/${themeId}/${kind}`);
    await uploadBytes(storageRef, file, { contentType: file.type });
    return getDownloadURL(storageRef);
};
