"use client";
import {
    collection,
    doc,
    addDoc,
    getDocs,
    deleteDoc,
    updateDoc,
    setDoc,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage, isFirebaseConfigured } from "@game/lib/firebase";
import { assetUrl } from "@game/lib/assets";
import { contentText } from "@game/lib/i18n";

export type ThemeImageKind = "background" | "x" | "o";

export type Theme = {
    id: string;
    name: string;
    // Назва англійською (для англійської мови гри); порожньо - показується name.
    nameEn?: string;
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

// Для гаманця: живий івент (перший за порядком) - до кінця якого дня діє, і ті, що вже скінчились.
export const eventSkinsOf = (themes: Theme[], now: Date = new Date()): { live: { id: string; until: number } | null; ended: string[] } => {
    const live = themes.find((theme) => eventStatus(theme, now) === "live");
    const until = (() => {
        if (!live?.eventEnd) return now.getTime() + 365 * 86_400_000;
        const [y, m, d] = live.eventEnd.split("-").map(Number);
        return new Date(y, m - 1, d + 1).getTime();
    })();
    return { live: live ? { id: live.id, until } : null, ended: themes.filter((theme) => eventStatus(theme, now) === "ended").map((theme) => theme.id) };
};

// "2026-10-24" -> "24.10"
export const shortDate = (value: string): string => (DATE_RE.test(value) ? `${value.slice(8, 10)}.${value.slice(5, 7)}` : value);

// Назва скіна мовою гри.
export const themeName = (theme: Pick<Theme, "id" | "name" | "nameEn">): string => contentText(`theme:${theme.id}:name`, theme.name, theme.nameEn);

export const DEFAULT_SKIN_PRICE = 300;
export const skinPrice = (theme: Theme): number =>
    typeof theme.price === "number" && theme.price >= 0 ? Math.floor(theme.price) : DEFAULT_SKIN_PRICE;

// Вбудований скін "Класика" - у стилі логотипа й артів порталу (пісочне поле,
// пластиліновий червоний X і бірюзовий O, SVG у public/images/themes). Безкоштовний,
// обраний за замовчуванням і водночас фолбек, поки в Firestore немає активних тем.
export const CLASSIC_THEME: Theme = {
    id: "classic",
    name: "Класика",
    nameEn: "Classic",
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
const campaignTheme = (id: string, name: string, nameEn: string, art: string, order: number): Theme => ({
    id,
    name,
    nameEn,
    backgroundUrl: assetUrl(`images/campaign/${art}.jpg`),
    xMarkerUrl: assetUrl(`images/themes/${id}-x.svg`),
    oMarkerUrl: assetUrl(`images/themes/${id}-o.svg`),
    active: true,
    order,
    createdAt: null,
    price: 0,
});
export const CAMPAIGN_THEMES: Theme[] = [
    campaignTheme("sea", "Морський бриз", "Sea Breeze", "beach", 1000),
    campaignTheme("forest", "Лісовий", "Forest", "forest", 1001),
    campaignTheme("peak", "Гірський", "Mountain Peak", "mountains", 1002),
];
// Вбудовані скіни магазину за монети: фон і фішки - SVG у public/images/themes (<id>-board/x/o.svg).
const shopTheme = (id: string, name: string, nameEn: string, price: number, order: number): Theme => ({
    id,
    name,
    nameEn,
    backgroundUrl: assetUrl(`images/themes/${id}-board.svg`),
    xMarkerUrl: assetUrl(`images/themes/${id}-x.svg`),
    oMarkerUrl: assetUrl(`images/themes/${id}-o.svg`),
    active: true,
    order,
    createdAt: null,
    price,
});
export const SHOP_THEMES: Theme[] = [
    // Предмети замість X і O (як "Коробка" чи "Пісок і море").
    shopTheme("berries", "Ягоди", "Berries", 200, 890),
    shopTheme("citrus", "Цитрус", "Citrus", 200, 891),
    shopTheme("balls", "М'ячі", "Ball Game", 250, 892),
    shopTheme("forestfind", "Лісові скарби", "Forest Finds", 250, 893),
    shopTheme("bakery", "Пекарня", "Bakery", 300, 894),
    shopTheme("summer", "Літній пікнік", "Summer Picnic", 300, 895),
    shopTheme("veggie", "Город", "Veggie Patch", 350, 896),
    shopTheme("holiday", "Свято", "Holiday", 400, 897),
    shopTheme("fastfood", "Фастфуд", "Fast Food", 300, 898),
    shopTheme("bouquet", "Букет", "Bouquet", 350, 899),
    // Стилізовані X і O.
    shopTheme("chalk", "Крейда", "Chalkboard", 150, 900),
    shopTheme("pixel", "Піксель", "Pixel", 200, 901),
    shopTheme("ice", "Крижаний", "Frost", 250, 902),
    shopTheme("candy", "Цукерки", "Candy", 300, 903),
    shopTheme("garden", "Квітковий", "Blossom", 350, 904),
    shopTheme("neon", "Неон", "Neon", 400, 905),
    shopTheme("lava", "Вулкан", "Volcano", 500, 906),
    shopTheme("space", "Космос", "Space", 600, 907),
    shopTheme("royal", "Королівський", "Royal", 800, 908),
];
export const BUILT_IN_THEMES: Theme[] = [...SHOP_THEMES, ...CAMPAIGN_THEMES];
export const isBuiltInTheme = (id: string): boolean => BUILT_IN_THEMES.some((theme) => theme.id === id);
// Документ у базі з id вбудованого скіна - його налаштування з адмінки (назва, ціна, івент, активність).
// Картинки, які в адмінці не завантажували, лишаються вбудованими (шлях рахується вже в самій грі).
const withBuiltIn = (theme: Theme): Theme => {
    const base = BUILT_IN_THEMES.find((item) => item.id === theme.id);
    if (!base) return theme;
    return {
        ...base,
        ...theme,
        name: theme.name || base.name,
        nameEn: theme.nameEn ?? base.nameEn,
        backgroundUrl: theme.backgroundUrl || base.backgroundUrl,
        xMarkerUrl: theme.xMarkerUrl || base.xMarkerUrl,
        oMarkerUrl: theme.oMarkerUrl || base.oMarkerUrl,
        price: theme.price ?? base.price,
        order: theme.order || base.order,
    };
};
// Активні теми з бази + вбудовані скіни магазину й кампанії, яких у базі немає. Вбудований скін,
// налаштований в адмінці, береться з бази - тож його можна й вимкнути (active: false).
const withCampaignThemes = (dbThemes: Theme[]): Theme[] => [
    ...dbThemes.filter((theme) => theme.active && theme.backgroundUrl && theme.xMarkerUrl && theme.oMarkerUrl).sort((a, b) => a.order - b.order),
    ...BUILT_IN_THEMES.filter((theme) => !dbThemes.some((item) => item.id === theme.id)),
];

const themesCollection = "themes";

const toTheme = (id: string, data: Record<string, unknown>): Theme => ({
    id,
    name: (data.name as string) ?? "",
    nameEn: typeof data.nameEn === "string" && data.nameEn.trim() ? data.nameEn : undefined,
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
    if (!isFirebaseConfigured) return BUILT_IN_THEMES;
    try {
        const db = getFirebaseDb();
        // Усі документи (не лише active) - щоб вимкнений в адмінці вбудований скін не повертався з коду.
        // Сортування "order" - на клієнті (каталог невеликий, читання публічне).
        const snap = await getDocs(collection(db, themesCollection));
        return withCampaignThemes(snap.docs.map((d) => withBuiltIn(toTheme(d.id, d.data()))));
    } catch {
        return BUILT_IN_THEMES;
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
    return snap.docs.map((d) => withBuiltIn(toTheme(d.id, d.data()))).sort((a, b) => a.order - b.order);
};

// Перше налаштування вбудованого скіна в адмінці: документ із його id (картинки порожні -
// у грі лишаються вбудовані, доки в адмінці не завантажать свої). Далі - звичайний updateTheme.
export const customizeBuiltInTheme = async (theme: Theme, patch: Partial<Omit<Theme, "id" | "createdAt">>): Promise<void> => {
    const db = getFirebaseDb();
    await setDoc(
        doc(db, themesCollection, theme.id),
        {
            name: theme.name,
            ...(theme.nameEn ? { nameEn: theme.nameEn } : {}),
            backgroundUrl: "",
            xMarkerUrl: "",
            oMarkerUrl: "",
            active: theme.active,
            order: theme.order,
            ...(theme.price !== undefined ? { price: theme.price } : {}),
            createdAt: serverTimestamp(),
            ...patch,
        },
        { merge: true }
    );
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
    // Кожне завантаження дає новий токен у URL, тож файл за цим URL ніколи не змінюється -
    // браузер може тримати його в кеші рік і не перепитувати сховище.
    await uploadBytes(storageRef, file, { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" });
    return getDownloadURL(storageRef);
};
