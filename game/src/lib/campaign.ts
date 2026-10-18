"use client";
import { useSyncExternalStore } from "react";
import type { DailyTemplate } from "@game/lib/daily";
import { CampaignChapterDef, DEFAULT_CHAPTERS, getCampaignChapters } from "@game/lib/campaignContent";

// Кампанія (як у прототипі): розділи по кілька рівнів, наприкінці кожного - бос; за пройдений
// розділ - нагорода (монети, скін) і картки в альбом. Розділи й рівні редагуються в адмінці
// (campaignContent) - поки їх не завантажено, діють стандартні. Рівень = той самий шаблон, що
// й виклик дня (режим, рівень ШІ, модифікатор, ціль, par), - грається тим самим механізмом "run".
//
// par - скільки ходів гравця дозволено для 3 зірок (стартові фішки головоломки не рахуються).

export type CampaignLevel = DailyTemplate & { chapter: number; chapterId: string; boss?: boolean; title: string };

const buildLevels = (chapters: CampaignChapterDef[]): CampaignLevel[] =>
    chapters.flatMap((chapter, ci) =>
        chapter.levels.map((level, li) => ({
            id: level.id || `${chapter.id}-${li + 1}`,
            chapter: ci,
            chapterId: chapter.id,
            mode: level.mode,
            difficulty: level.difficulty,
            goal: level.goal,
            par: level.par,
            modifier: level.modifier ?? undefined,
            preset: level.preset ?? undefined,
            boss: Boolean(level.boss),
            title: level.title,
        }))
    );

// Live-binding: імпортери бачать актуальний список після завантаження з бази.
export let CAMPAIGN_CHAPTERS: CampaignChapterDef[] = DEFAULT_CHAPTERS;
export let CAMPAIGN_LEVELS: CampaignLevel[] = buildLevels(DEFAULT_CHAPTERS);

// Альбом: на кожен розділ три картки - пройти розділ, перемогти боса (2+ зірки), зібрати всі зірки.
export type CardKind = "done" | "boss" | "gold";
export type AlbumCard = { id: string; chapter: number; kind: CardKind };
export const albumCards = (): AlbumCard[] =>
    CAMPAIGN_CHAPTERS.flatMap((chapter, ci) => (["done", "boss", "gold"] as CardKind[]).map((kind) => ({ id: `${kind}:${chapter.id}`, chapter: ci, kind })));

export const COINS_PER_NEW_STAR = 10;

export type CampaignState = { stars: Record<string, number>; cards: string[]; rewards: string[] };

const sanitize = (raw: unknown): CampaignState => {
    const stars: Record<string, number> = {};
    const r = raw && typeof raw === "object" ? (raw as Partial<CampaignState>) : {};
    // Зірки за будь-якими id: рівні можуть підвантажитись із бази пізніше за прогрес.
    if (r.stars && typeof r.stars === "object") {
        for (const [id, value] of Object.entries(r.stars)) {
            if (typeof value === "number" && value >= 0 && value <= 3) stars[id] = Math.floor(value);
        }
    }
    const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
    return { stars, cards: list(r.cards), rewards: list(r.rewards) };
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

const EMPTY: CampaignState = { stars: {}, cards: [], rewards: [] };
let backend: CampaignStorage = localBackend;
let state: CampaignState = EMPTY;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const reload = async () => {
    state = sanitize(await backend.load());
    notify();
};

// Розділи з адмінки (активні); помилка чи порожня база - стандартні.
const loadContent = async () => {
    const chapters = await getCampaignChapters();
    CAMPAIGN_CHAPTERS = chapters;
    CAMPAIGN_LEVELS = buildLevels(chapters);
    // Новий об'єкт стану - щоб useCampaign перемалював карту з новими рівнями.
    state = { ...state };
    notify();
};

if (typeof window !== "undefined") {
    void reload();
    void loadContent();
}

export const configureCampaignStorage = (storage: CampaignStorage): Promise<void> => {
    backend = storage;
    return reload();
};
export const reloadCampaign = (): Promise<void> => reload();

const commit = (next: CampaignState) => {
    state = next;
    notify();
    void backend.save(state);
};

// Записує результат, лише якщо він кращий за попередній. Повертає, скільки нових зірок додалось.
export const recordLevelStars = (levelId: string, stars: number): number => {
    const previous = state.stars[levelId] ?? 0;
    if (stars <= previous) return 0;
    commit({ ...state, stars: { ...state.stars, [levelId]: stars } });
    return stars - previous;
};

export const chapterLevels = (chapter: number): CampaignLevel[] => CAMPAIGN_LEVELS.filter((level) => level.chapter === chapter);

export const chapterStars = (chapter: number, s: CampaignState = state): number =>
    chapterLevels(chapter).reduce((sum, level) => sum + (s.stars[level.id] ?? 0), 0);

export const totalStars = (s: CampaignState = state): number => CAMPAIGN_LEVELS.reduce((sum, level) => sum + (s.stars[level.id] ?? 0), 0);

export const isChapterDone = (chapter: number, s: CampaignState = state): boolean => {
    const levels = chapterLevels(chapter);
    return levels.length > 0 && levels.every((level) => (s.stars[level.id] ?? 0) > 0);
};

// Рівні відкриваються по черзі через усі розділи: наступний - коли попередній пройдено хоча б на 1 зірку.
export const isLevelUnlocked = (index: number, s: CampaignState = state): boolean => {
    if (!CAMPAIGN_LEVELS[index]) return false;
    const previous = CAMPAIGN_LEVELS[index - 1];
    return !previous || (s.stars[previous.id] ?? 0) > 0;
};

export const isChapterUnlocked = (chapter: number, s: CampaignState = state): boolean => {
    const first = CAMPAIGN_LEVELS.findIndex((level) => level.chapter === chapter);
    return first >= 0 && isLevelUnlocked(first, s);
};

// Перший відкритий, ще не пройдений рівень - "поточний" на карті.
export const currentLevelIndex = (s: CampaignState = state): number => {
    const index = CAMPAIGN_LEVELS.findIndex((level, i) => isLevelUnlocked(i, s) && !(s.stars[level.id] > 0));
    return index === -1 ? CAMPAIGN_LEVELS.length - 1 : index;
};

const cardEarned = (card: AlbumCard, s: CampaignState): boolean => {
    const levels = chapterLevels(card.chapter);
    if (!levels.length) return false;
    if (card.kind === "done") return isChapterDone(card.chapter, s);
    if (card.kind === "boss") {
        const boss = levels.find((level) => level.boss) ?? levels[levels.length - 1];
        return (s.stars[boss.id] ?? 0) >= 2;
    }
    return levels.every((level) => (s.stars[level.id] ?? 0) === 3);
};

// Нові картки альбому й нагороди за пройдені розділи (кожна - один раз). Нагороди (монети,
// скін) нараховує той, хто викликав, - тут лише позначка, що їх уже видано.
export const claimCampaignRewards = (): { cards: AlbumCard[]; chapters: CampaignChapterDef[] } => {
    const cards = albumCards().filter((card) => !state.cards.includes(card.id) && cardEarned(card, state));
    const chapters = CAMPAIGN_CHAPTERS.filter((chapter, ci) => !state.rewards.includes(chapter.id) && isChapterDone(ci, state));
    if (cards.length || chapters.length) {
        commit({ ...state, cards: [...state.cards, ...cards.map((c) => c.id)], rewards: [...state.rewards, ...chapters.map((c) => c.id)] });
    }
    return { cards, chapters };
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
export const getCampaign = (): CampaignState => state;

export const useCampaign = (): CampaignState => useSyncExternalStore(subscribe, () => state, () => EMPTY);
