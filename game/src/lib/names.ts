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
import { getFirebaseDb, isFirebaseConfigured } from "@game/lib/firebase";
import { LOCALES, getLocale, loadLocalePack, localeNames, type Locale } from "@game/lib/i18n";
import type { ProfileState } from "@game/lib/profile";

export type NameEntry = {
    id: string;
    // Українською - як в адмінці; іншими мовами - translations (розділ "Імена").
    name: string;
    translations: Partial<Record<Locale, string>>;
    active: boolean;
    order: number;
    createdAt: Timestamp | null;
};

// Дефолтний пул "цікавих" імен - фолбек, поки в Firestore ще немає жодного
// активного імені (свіжий деплой) або Firebase взагалі не налаштовано, і водночас
// стартовий набір, яким автоматично засівається порожня колекція "names" в адмінці.
export const DEFAULT_NAMES: string[] = [
    "Рожевий Бегемот",
    "Кмітливий Їжак",
    "Космічний Хом'як",
    "Веселий Тигр",
    "Соромливий Жираф",
    "Бурштиновий Лис",
    "Мандрівний Пінгвін",
    "Хоробрий Кролик",
    "Мудра Сова",
    "Танцюючий Носоріг",
    "Зоряний Єнот",
    "Пухнастий Дракон",
    "Спритний Дельфін",
    "Загадковий Опосум",
    "Сонячний Лінивець",
    "Грізний Хом'ячок",
    "Смішний Фламінго",
    "Тихий Вовк",
    "Яскравий Папуга",
    "Полуничний Кіт",
];

const namesCollection = "names";

const toTranslations = (raw: unknown): Partial<Record<Locale, string>> =>
    raw && typeof raw === "object"
        ? Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter(([, value]) => typeof value === "string" && value.trim()))
        : {};

const toName = (id: string, data: Record<string, unknown>): NameEntry => ({
    id,
    name: (data.name as string) ?? "",
    translations: toTranslations(data.translations),
    active: Boolean(data.active),
    order: (data.order as number) ?? 0,
    createdAt: (data.createdAt as Timestamp) ?? null,
});

// Публічний список активних імен - читає будь-хто, ще до анонімного входу
// (потрібно ще до старту гри, для екрана з рахунком). Тиха відмова на будь-яку
// помилку - відсутність імен ніколи не повинна ламати гру, лише вмикати DEFAULT_NAMES.
// Останній завантажений пул - щоб показувати ім'я гравця поточною мовою без нового запиту.
let loadedNames: NameEntry[] = [];

export const getActiveNames = async (): Promise<NameEntry[]> => {
    if (!isFirebaseConfigured) return [];
    try {
        const db = getFirebaseDb();
        const q = query(collection(db, namesCollection), where("active", "==", true));
        const snap = await getDocs(q);
        loadedNames = snap.docs
            .map((d) => toName(d.id, d.data()))
            .filter((entry) => entry.name.trim().length > 0)
            .sort((a, b) => a.order - b.order);
        return loadedNames;
    } catch {
        return [];
    }
};

// Стартовий набір англійською - у тому ж порядку, що DEFAULT_NAMES (переклад для фолбеку й засіву).
export const DEFAULT_NAMES_EN: string[] = [
    "Pink Hippo",
    "Clever Hedgehog",
    "Cosmic Hamster",
    "Cheerful Tiger",
    "Shy Giraffe",
    "Amber Fox",
    "Wandering Penguin",
    "Brave Rabbit",
    "Wise Owl",
    "Dancing Rhino",
    "Starry Raccoon",
    "Fluffy Dragon",
    "Nimble Dolphin",
    "Mysterious Possum",
    "Sunny Sloth",
    "Fierce Gerbil",
    "Funny Flamingo",
    "Quiet Wolf",
    "Bright Parrot",
    "Strawberry Cat",
];

// Стартовий набір як записи (id "default:<номер>") - коли в базі імен немає.
const defaultEntries = (): NameEntry[] =>
    DEFAULT_NAMES.map((name, index) => ({ id: `default:${index}`, name, translations: { en: DEFAULT_NAMES_EN[index] }, active: true, order: index, createdAt: null }));

const toPool = (names: NameEntry[]): NameEntry[] => (names.length > 0 ? names : defaultEntries());

// Ім'я поточною мовою: українською - як у базі; іншими - переклад з адмінки, для стартового
// набору - з файлу мови (locales/*.ts); далі англійське, далі українське.
export const nameIn = (entry: NameEntry): string => {
    const locale = getLocale();
    if (locale === "uk") return entry.name;
    const index = entry.id.startsWith("default:") ? Number(entry.id.slice(8)) : -1;
    const fromPack = index >= 0 && locale !== "en" ? localeNames()?.[index] : undefined;
    return entry.translations[locale] || fromPack || entry.translations.en || entry.name;
};

export const pickRandomEntry = (names: NameEntry[]): NameEntry => {
    const pool = toPool(names);
    return pool[Math.floor(Math.random() * pool.length)];
};

const findEntry = (id: string): NameEntry | undefined => [...loadedNames, ...defaultEntries()].find((entry) => entry.id === id);

// Запис пулу, якому відповідає вже збережене ім'я (будь-якою мовою) - щоб і старі імена
// гравців перекладались.
export const findNameKey = (name: string): string | null => {
    const pack = localeNames() ?? [];
    const entry = [...loadedNames, ...defaultEntries()].find(
        (item) => item.name === name || Object.values(item.translations).includes(name) || (item.id.startsWith("default:") && pack[Number(item.id.slice(8))] === name)
    );
    return entry?.id ?? null;
};

// Ім'я гравця для показу: випадкове з пулу - поточною мовою, своє (змінене в профілі) - як є.
export const playerName = (profile: Pick<ProfileState, "name" | "nameKey">): string | null => {
    if (profile.nameKey) {
        const entry = findEntry(profile.nameKey);
        if (entry) return nameIn(entry);
    }
    return profile.name;
};

// Обирає два РІЗНІ імена (для гри з другом - X і O не повинні зватись однаково).
// Якщо в пулі лишилось лише одне унікальне ім'я, друге - той самий рядок
// (немає з чого більше обирати).
export const pickTwoDistinctNames = (names: NameEntry[]): [string, string] => {
    const pool = toPool(names).map(nameIn);
    const first = pool[Math.floor(Math.random() * pool.length)];
    const rest = pool.filter((n) => n !== first);
    const second = rest.length > 0 ? rest[Math.floor(Math.random() * rest.length)] : first;
    return [first, second];
};

// --- Адмінські операції (запис дозволений лише isAdmin() у Security Rules) ---

export const getAllNames = async (): Promise<NameEntry[]> => {
    const db = getFirebaseDb();
    const snap = await getDocs(collection(db, namesCollection));
    return snap.docs.map((d) => toName(d.id, d.data())).sort((a, b) => a.order - b.order);
};

export const createName = async (name: string, order = Date.now(), translations: Partial<Record<Locale, string>> = {}): Promise<string> => {
    const db = getFirebaseDb();
    const docRef = await addDoc(collection(db, namesCollection), {
        name,
        translations,
        active: true,
        order,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
};

// Найкраще зусилля: заповнює порожню колекцію стартовим набором з 20 імен.
// Викликається з адмінки Names при першому завантаженні порожнього списку.
export const seedDefaultNames = async (): Promise<void> => {
    // Переклади стартового набору - з файлів мов (той самий порядок імен).
    const others = LOCALES.filter((locale) => locale !== "uk" && locale !== "en");
    const packs = await Promise.all(others.map((locale) => loadLocalePack(locale)));
    await Promise.all(
        DEFAULT_NAMES.map((name, index) =>
            createName(name, index, {
                en: DEFAULT_NAMES_EN[index],
                ...Object.fromEntries(others.map((locale, i) => [locale, packs[i].names[index]]).filter(([, value]) => value)),
            })
        )
    );
};

export const updateName = async (nameId: string, patch: Partial<Omit<NameEntry, "id" | "createdAt">>): Promise<void> => {
    const db = getFirebaseDb();
    await updateDoc(doc(db, namesCollection, nameId), patch);
};

export const deleteName = async (nameId: string): Promise<void> => {
    const db = getFirebaseDb();
    await deleteDoc(doc(db, namesCollection, nameId));
};
