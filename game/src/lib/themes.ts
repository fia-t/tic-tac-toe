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
import { getFirebaseDb, getFirebaseStorage, isFirebaseConfigured } from "@game/lib/firebase";
import { assetUrl } from "@game/lib/assets";

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
    // Ціна в магазині скінів (монети). Не задано в адмінці - DEFAULT_SKIN_PRICE; 0 - безкоштовно.
    price?: number;
    // Евентовий (сезонний) скін - у магазині показується першим, купується лише в дати івенту.
    event?: boolean;
    // Дати івенту "YYYY-MM-DD" (включно, за часом гравця). До старту - "Скоро", після кінця
    // скін зникає з магазину (у кого він уже є - лишається). Порожньо - без обмеження з того боку.
    eventStart?: string;
    eventEnd?: string;
};

export type EventStatus = "none" | "soon" | "live" | "ended";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const localDay = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const eventStatus = (theme: Theme, now: Date = new Date()): EventStatus => {
    if (!theme.event) return "none";
    const today = localDay(now);
    if (theme.eventStart && today < theme.eventStart) return "soon";
    if (theme.eventEnd && today > theme.eventEnd) return "ended";
    return "live";
};

// Скільки днів івенту лишилось, включно з сьогоднішнім (1 - останній день); null - без дати кінця.
export const eventDaysLeft = (theme: Theme, now: Date = new Date()): number | null => {
    if (!theme.eventEnd || !DATE_RE.test(theme.eventEnd)) return null;
    const [y, m, d] = theme.eventEnd.split("-").map(Number);
    const end = Date.UTC(y, m - 1, d);
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((end - today) / 86_400_000) + 1;
};

// "2026-10-24" -> "24.10"
export const shortDate = (value: string): string => (DATE_RE.test(value) ? `${value.slice(8, 10)}.${value.slice(5, 7)}` : value);

export const DEFAULT_SKIN_PRICE = 300;
export const skinPrice = (theme: Theme): number =>
    typeof theme.price === "number" && theme.price >= 0 ? Math.floor(theme.price) : DEFAULT_SKIN_PRICE;

// Вбудований скін "Класика" - у стилі логотипа й артів порталу (пісочне поле,
// пластиліновий червоний X і бірюзовий O, SVG у public/images/themes). Безкоштовний,
// обраний за замовчуванням і водночас фолбек, поки в Firestore немає активних тем.
export const CLASSIC_THEME: Theme = {
    id: "classic",
    name: "Класика",
    backgroundUrl: assetUrl("images/themes/classic-board.svg"),
    xMarkerUrl: assetUrl("images/themes/classic-x.svg"),
    oMarkerUrl: assetUrl("images/themes/classic-o.svg"),
    active: true,
    order: -1,
    createdAt: null,
    price: 0,
};

export const DEFAULT_THEME: Theme = CLASSIC_THEME;

// Вбудовані скіни-нагороди кампанії: фон поля - арт розділу, фішки - SVG у public/images/themes.
// Не купуються - відкриваються за проходження розділу (rewardSkinId у розділі кампанії).
const campaignTheme = (id: string, name: string, art: string, order: number): Theme => ({
    id,
    name,
    backgroundUrl: assetUrl(`images/campaign/${art}.jpg`),
    xMarkerUrl: assetUrl(`images/themes/${id}-x.svg`),
    oMarkerUrl: assetUrl(`images/themes/${id}-o.svg`),
    active: true,
    order,
    createdAt: null,
    price: 0,
});
export const CAMPAIGN_THEMES: Theme[] = [
    campaignTheme("sea", "Морський бриз", "beach", 1000),
    campaignTheme("forest", "Лісовий", "forest", 1001),
    campaignTheme("peak", "Гірський", "mountains", 1002),
];
// Теми з бази + вбудовані скіни кампанії (тема з бази з тим самим id має пріоритет).
const withCampaignThemes = (themes: Theme[]): Theme[] => [...themes, ...CAMPAIGN_THEMES.filter((theme) => !themes.some((item) => item.id === theme.id))];

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
    price: typeof data.price === "number" ? data.price : undefined,
    event: data.event === true,
    eventStart: typeof data.eventStart === "string" && DATE_RE.test(data.eventStart) ? data.eventStart : undefined,
    eventEnd: typeof data.eventEnd === "string" && DATE_RE.test(data.eventEnd) ? data.eventEnd : undefined,
});

// Публічний список активних тем - читає будь-хто, навіть до анонімного входу
// (потрібно гравцю ще до старту гри). Тиха відмова на будь-яку помилку -
// відсутність тем ніколи не повинна ламати гру, лише вмикати DEFAULT_THEME.
export const getActiveThemes = async (): Promise<Theme[]> => {
    if (!isFirebaseConfigured) return CAMPAIGN_THEMES;
    try {
        const db = getFirebaseDb();
        // Сортування "order" - на клієнті, а не через Firestore orderBy, щоб не
        // вимагати композитний індекс (equality + orderBy на різних полях).
        const q = query(collection(db, themesCollection), where("active", "==", true));
        const snap = await getDocs(q);
        return withCampaignThemes(
            snap.docs
                .map((d) => toTheme(d.id, d.data()))
                .filter((theme) => theme.backgroundUrl && theme.xMarkerUrl && theme.oMarkerUrl)
                .sort((a, b) => a.order - b.order)
        );
    } catch {
        return CAMPAIGN_THEMES;
    }
};

// excludeId дозволяє не повторювати щойно зіграну тему при рестарті - якщо
// відфільтроване виключення лишає порожній список (усього 1 активна тема),
// повертаємось до повного списку, бо повторення тоді неминуче.
export const pickRandomTheme = (themes: Theme[], excludeId?: string): Theme => {
    if (themes.length === 0) return DEFAULT_THEME;
    const candidates = excludeId ? themes.filter((theme) => theme.id !== excludeId) : themes;
    const pool = candidates.length > 0 ? candidates : themes;
    return pool[Math.floor(Math.random() * pool.length)];
};

const preloadImage = (src: string): Promise<void> =>
    new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = src;
    });

// Підвантажує фон і фішки X/O наперед для всіх переданих тем, щоб під час гри
// (перше розміщення фішки, рестарт з новою випадковою темою) картинка вже була
// в кеші браузера - інакше замість фішки на мить показується назва файлу,
// поки img вантажиться "з нуля" в момент першого рендеру.
export const preloadThemeImages = async (themes: Theme[]): Promise<void> => {
    const urls = new Set<string>();
    themes.forEach((theme) => {
        urls.add(theme.backgroundUrl);
        urls.add(theme.xMarkerUrl);
        urls.add(theme.oMarkerUrl);
    });
    await Promise.all(Array.from(urls).map(preloadImage));
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
    // Спершу видаляємо попередній файл за тим самим шляхом. Firebase Storage
    // при звичайному перезаписі того ж шляху зберігає старий download-токен
    // (firebaseStorageDownloadTokens), тож getDownloadURL() повертає ІДЕНТИЧНИЙ
    // URL, що й був до заміни картинки. Оскільки URL не змінюється, браузер і
    // Firestore (де він же зберігається в backgroundUrl/xMarkerUrl/oMarkerUrl)
    // не бачать різниці - і при наступному завантаженні сторінки показується
    // стара картинка з кешу браузера, попри те, що на сервері файл вже інший.
    // Видалення старого об'єкта перед завантаженням нового змушує Firebase
    // згенерувати новий токен -> новий URL -> кеш більше не застосовується.
    try {
        await deleteObject(storageRef);
    } catch {
        // об'єкта могло не бути (перше завантаження цього kind) - це нормально
    }
    await uploadBytes(storageRef, file, { contentType: file.type });
    return getDownloadURL(storageRef);
};
