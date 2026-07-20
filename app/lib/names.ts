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
import { getFirebaseDb, isFirebaseConfigured } from "@/app/lib/firebase";

export type NameEntry = {
    id: string;
    name: string;
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

const toName = (id: string, data: Record<string, unknown>): NameEntry => ({
    id,
    name: (data.name as string) ?? "",
    active: Boolean(data.active),
    order: (data.order as number) ?? 0,
    createdAt: (data.createdAt as Timestamp) ?? null,
});

// Публічний список активних імен - читає будь-хто, ще до анонімного входу
// (потрібно ще до старту гри, для екрана з рахунком). Тиха відмова на будь-яку
// помилку - відсутність імен ніколи не повинна ламати гру, лише вмикати DEFAULT_NAMES.
export const getActiveNames = async (): Promise<NameEntry[]> => {
    if (!isFirebaseConfigured) return [];
    try {
        const db = getFirebaseDb();
        const q = query(collection(db, namesCollection), where("active", "==", true));
        const snap = await getDocs(q);
        return snap.docs
            .map((d) => toName(d.id, d.data()))
            .filter((entry) => entry.name.trim().length > 0)
            .sort((a, b) => a.order - b.order);
    } catch {
        return [];
    }
};

// Перетворює список записів (або їх відсутність) на пул рядків-імен,
// завжди непорожній - фолбек на DEFAULT_NAMES.
const toPool = (names: NameEntry[]): string[] =>
    names.length > 0 ? names.map((n) => n.name) : DEFAULT_NAMES;

export const pickRandomName = (names: NameEntry[]): string => {
    const pool = toPool(names);
    return pool[Math.floor(Math.random() * pool.length)];
};

// Обирає два РІЗНІ імена (для гри з другом - X і O не повинні зватись однаково).
// Якщо в пулі лишилось лише одне унікальне ім'я, друге - той самий рядок
// (немає з чого більше обирати).
export const pickTwoDistinctNames = (names: NameEntry[]): [string, string] => {
    const pool = toPool(names);
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

export const createName = async (name: string, order = Date.now()): Promise<string> => {
    const db = getFirebaseDb();
    const docRef = await addDoc(collection(db, namesCollection), {
        name,
        active: true,
        order,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
};

// Найкраще зусилля: заповнює порожню колекцію стартовим набором з 20 імен.
// Викликається з адмінки Names при першому завантаженні порожнього списку.
export const seedDefaultNames = async (): Promise<void> => {
    await Promise.all(DEFAULT_NAMES.map((name, index) => createName(name, index)));
};

export const updateName = async (nameId: string, patch: Partial<Omit<NameEntry, "id" | "createdAt">>): Promise<void> => {
    const db = getFirebaseDb();
    await updateDoc(doc(db, namesCollection, nameId), patch);
};

export const deleteName = async (nameId: string): Promise<void> => {
    const db = getFirebaseDb();
    await deleteDoc(doc(db, namesCollection, nameId));
};
