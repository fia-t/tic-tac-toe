"use client";
import { useSyncExternalStore } from "react";
import type { DailyTemplate } from "@game/lib/daily";

// Кампанія: 20 рівнів у 3 розділах (3×3, 5×5, Ultimate) з наростанням рівня ШІ й
// модифікаторів, головоломкою-пресетом і босами. Рівень = той самий шаблон, що й виклик
// дня (режим, рівень ШІ, модифікатор, ціль, par) - грається тим самим механізмом "run".
//
// par у кампанії - скільки фішок гравця може бути на полі на момент перемоги для 3 зірок
// (для головоломки з пресетом враховує й уже поставлені фішки).

export type CampaignLevel = DailyTemplate & { chapter: number; boss?: boolean };

const L = (level: CampaignLevel) => level;

export const CAMPAIGN_LEVELS: CampaignLevel[] = [
    // Розділ 1 - Пляж (3×3)
    L({ id: "c1", chapter: 0, mode: "traditional", difficulty: "easy", goal: "win", par: 3 }),
    L({ id: "c2", chapter: 0, mode: "traditional", difficulty: "easy", goal: "win", par: 5, modifier: "vanish" }),
    L({ id: "c3", chapter: 0, mode: "traditional", difficulty: "medium", goal: "win", par: 4 }),
    L({ id: "c4", chapter: 0, mode: "traditional", difficulty: "medium", goal: "win", par: 4, preset: { X: [0, 4], O: [1, 8] } }),
    L({ id: "c5", chapter: 0, mode: "traditional", difficulty: "medium", goal: "survive", par: 5, modifier: "misere" }),
    L({ id: "c6", chapter: 0, mode: "traditional", difficulty: "medium", goal: "win", par: 4, modifier: "timer" }),
    L({ id: "c7", chapter: 0, mode: "traditional", difficulty: "master", goal: "survive", par: 5 }),
    L({ id: "c8", chapter: 0, mode: "traditional", difficulty: "master", goal: "survive", par: 8, modifier: "vanish", boss: true }),
    // Розділ 2 - Ліс (5×5, 4 в ряд)
    L({ id: "c9", chapter: 1, mode: "five", difficulty: "easy", goal: "win", par: 6 }),
    L({ id: "c10", chapter: 1, mode: "five", difficulty: "medium", goal: "win", par: 7 }),
    L({ id: "c11", chapter: 1, mode: "five", difficulty: "medium", goal: "win", par: 7, modifier: "stones" }),
    L({ id: "c12", chapter: 1, mode: "five", difficulty: "medium", goal: "win", par: 8, modifier: "gravity" }),
    L({ id: "c13", chapter: 1, mode: "five", difficulty: "medium", goal: "win", par: 7, modifier: "timer" }),
    L({ id: "c14", chapter: 1, mode: "five", difficulty: "medium", goal: "survive", par: 10, modifier: "misere" }),
    L({ id: "c15", chapter: 1, mode: "five", difficulty: "master", goal: "survive", par: 9, modifier: "stones" }),
    L({ id: "c16", chapter: 1, mode: "five", difficulty: "master", goal: "survive", par: 10, modifier: "gravity", boss: true }),
    // Розділ 3 - Гори (Ultimate)
    L({ id: "c17", chapter: 2, mode: "difficult", difficulty: "easy", goal: "win", par: 14 }),
    L({ id: "c18", chapter: 2, mode: "difficult", difficulty: "medium", goal: "win", par: 16 }),
    L({ id: "c19", chapter: 2, mode: "difficult", difficulty: "medium", goal: "win", par: 16, modifier: "timer" }),
    L({ id: "c20", chapter: 2, mode: "difficult", difficulty: "master", goal: "survive", par: 20, boss: true }),
];

export const CHAPTER_COUNT = 3;
// Наступний розділ відкривається, коли в попередньому стільки зірок (з 24) - можна
// пропустити бос-рівень, який не виходить, і не застрягнути.
export const CHAPTER_UNLOCK_STARS = 12;
export const COINS_PER_NEW_STAR = 10;

export type CampaignState = { stars: Record<string, number> };

const sanitize = (raw: unknown): CampaignState => {
    const stars: Record<string, number> = {};
    const source = raw && typeof raw === "object" ? (raw as Partial<CampaignState>).stars : null;
    if (source && typeof source === "object") {
        for (const level of CAMPAIGN_LEVELS) {
            const value = (source as Record<string, unknown>)[level.id];
            if (typeof value === "number" && value >= 0 && value <= 3) stars[level.id] = Math.floor(value);
        }
    }
    return { stars };
};

export type CampaignStorage = { load: () => Promise<unknown>; save: (state: CampaignState) => Promise<void> };

const STORAGE_KEY = "ttt-campaign";
const localBackend: CampaignStorage = {
    load: async () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    },
    save: async (state) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch {
            // Сховище недоступне - прогрес живе до перезавантаження.
        }
    },
};

const EMPTY: CampaignState = { stars: {} };
let backend: CampaignStorage = localBackend;
let state: CampaignState = EMPTY;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const reload = async () => {
    state = sanitize(await backend.load());
    notify();
};
if (typeof window !== "undefined") void reload();

export const configureCampaignStorage = (storage: CampaignStorage): Promise<void> => {
    backend = storage;
    return reload();
};
export const reloadCampaign = (): Promise<void> => reload();

// Записує результат, лише якщо він кращий за попередній. Повертає, скільки нових зірок додалось.
export const recordLevelStars = (levelId: string, stars: number): number => {
    const previous = state.stars[levelId] ?? 0;
    if (stars <= previous) return 0;
    state = { stars: { ...state.stars, [levelId]: stars } };
    notify();
    void backend.save(state);
    return stars - previous;
};

export const chapterStars = (chapter: number, s: CampaignState = state): number =>
    CAMPAIGN_LEVELS.filter((level) => level.chapter === chapter).reduce((sum, level) => sum + (s.stars[level.id] ?? 0), 0);

export const totalStars = (s: CampaignState = state): number =>
    CAMPAIGN_LEVELS.reduce((sum, level) => sum + (s.stars[level.id] ?? 0), 0);

export const isChapterUnlocked = (chapter: number, s: CampaignState = state): boolean =>
    chapter === 0 || chapterStars(chapter - 1, s) >= CHAPTER_UNLOCK_STARS;

export const isLevelUnlocked = (index: number, s: CampaignState = state): boolean => {
    const level = CAMPAIGN_LEVELS[index];
    if (!level || !isChapterUnlocked(level.chapter, s)) return false;
    const previous = CAMPAIGN_LEVELS[index - 1];
    if (!previous || previous.chapter !== level.chapter) return true;
    return (s.stars[previous.id] ?? 0) > 0;
};

// Перший відкритий, ще не пройдений рівень - "поточний" на карті.
export const currentLevelIndex = (s: CampaignState = state): number => {
    const index = CAMPAIGN_LEVELS.findIndex((level, i) => isLevelUnlocked(i, s) && !(s.stars[level.id] > 0));
    return index === -1 ? CAMPAIGN_LEVELS.length - 1 : index;
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
export const getCampaign = (): CampaignState => state;

export const useCampaign = (): CampaignState => useSyncExternalStore(subscribe, () => state, () => EMPTY);
