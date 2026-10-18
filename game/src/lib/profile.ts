"use client";
import { useSyncExternalStore } from "react";
import { addGameEventListener } from "@game/lib/firebase";
import { getDifficulty } from "@game/lib/difficulty";
import { earnCoins, getWallet } from "@game/lib/wallet";
import { chapterLevels, getCampaign } from "@game/lib/campaign";
import { t } from "@game/lib/i18n";
import { showToast } from "@game/lib/ui";

// Профіль гравця: постійне ім'я, статистика, досвід і рівень (той самий рівень іде на
// портал через reportPlayerLevel), досягнення з нагородою в монетах.
// Зберігання - як у гаманця: localStorage, на порталі - хмарні збереження SDK.

export type ProfileStats = {
    games: number;
    wins: number;
    draws: number;
    losses: number;
    currentStreak: number;
    bestStreak: number;
    masterDraws: number;
    masterWins: number;
    ultimateWins: number;
    onlineWins: number;
    bestDailyStreak: number;
};

export type ProfileState = {
    name: string | null;
    xp: number;
    stats: ProfileStats;
    // id досягнення -> коли отримано (ms).
    achieved: Record<string, number>;
};

const emptyStats = (): ProfileStats => ({
    games: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    currentStreak: 0,
    bestStreak: 0,
    masterDraws: 0,
    masterWins: 0,
    ultimateWins: 0,
    onlineWins: 0,
    bestDailyStreak: 0,
});
const emptyProfile = (): ProfileState => ({ name: null, xp: 0, stats: emptyStats(), achieved: {} });
const EMPTY = emptyProfile();

// --- рівень ---

export const levelForXp = (xp: number): number => Math.floor(Math.sqrt(Math.max(0, xp) / 25)) + 1;
// Межі досвіду поточного рівня: [початок, початок наступного).
export const levelBounds = (level: number): [number, number] => [(level - 1) ** 2 * 25, level ** 2 * 25];

const XP = { win: 20, draw: 8, lose: 3, onlineWin: 25, onlineDraw: 10, onlineLoss: 4, daily: 15, campaignStar: 5 };

// --- досягнення ---

export type Achievement = { id: string; reward: number; progress: (s: ProfileState) => [number, number] };

// Перший розділ кампанії (рівні можуть підвантажитись із бази - тож щоразу заново).
const beachLevels = () => chapterLevels(0);

export const ACHIEVEMENTS: Achievement[] = [
    { id: "first_win", reward: 50, progress: (s) => [s.stats.wins, 1] },
    { id: "streak5", reward: 50, progress: (s) => [s.stats.bestStreak, 5] },
    { id: "master_draw", reward: 50, progress: (s) => [s.stats.masterDraws, 1] },
    { id: "master_win", reward: 100, progress: (s) => [s.stats.masterWins, 1] },
    { id: "ultimate3", reward: 50, progress: (s) => [s.stats.ultimateWins, 3] },
    { id: "online_win", reward: 50, progress: (s) => [s.stats.onlineWins, 1] },
    { id: "daily7", reward: 100, progress: (s) => [s.stats.bestDailyStreak, 7] },
    { id: "skins3", reward: 50, progress: () => [getWallet().owned.length, 3] },
    {
        id: "beach",
        reward: 100,
        progress: () => {
            const stars = getCampaign().stars;
            return [beachLevels().filter((level) => (stars[level.id] ?? 0) > 0).length, beachLevels().length];
        },
    },
];

// --- зберігання ---

const sanitize = (raw: unknown): ProfileState => {
    if (!raw || typeof raw !== "object") return emptyProfile();
    const r = raw as Partial<ProfileState>;
    const stats = emptyStats();
    if (r.stats && typeof r.stats === "object") {
        for (const key of Object.keys(stats) as (keyof ProfileStats)[]) {
            const value = (r.stats as Record<string, unknown>)[key];
            if (typeof value === "number" && value >= 0) stats[key] = Math.floor(value);
        }
    }
    return {
        name: typeof r.name === "string" && r.name.trim() ? r.name.slice(0, 40) : null,
        xp: typeof r.xp === "number" && r.xp >= 0 ? Math.floor(r.xp) : 0,
        stats,
        achieved: r.achieved && typeof r.achieved === "object" ? (r.achieved as Record<string, number>) : {},
    };
};

export type ProfileStorage = { load: () => Promise<unknown>; save: (state: ProfileState) => Promise<void> };

const STORAGE_KEY = "ttt-profile";
const localBackend: ProfileStorage = {
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

let backend: ProfileStorage = localBackend;
let state: ProfileState = emptyProfile();
let reportLevel: ((level: number) => void) | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const reload = async () => {
    state = sanitize(await backend.load());
    notify();
    reportLevel?.(levelForXp(state.xp));
};
if (typeof window !== "undefined") void reload();

export const configureProfileStorage = (storage: ProfileStorage): Promise<void> => {
    backend = storage;
    return reload();
};
export const reloadProfile = (): Promise<void> => reload();

// Портал: рівень гравця в профілі порталу (game.reportPlayerLevel).
export const setLevelReporter = (reporter: (level: number) => void): void => {
    reportLevel = reporter;
    reporter(levelForXp(state.xp));
};

const commit = (next: ProfileState) => {
    const before = levelForXp(state.xp);
    state = next;
    notify();
    void backend.save(state);
    const after = levelForXp(state.xp);
    if (after !== before) reportLevel?.(after);
};

export const getProfile = (): ProfileState => state;

export const setProfileName = (name: string): void => {
    const trimmed = name.trim().slice(0, 40);
    if (!trimmed || trimmed === state.name) return;
    commit({ ...state, name: trimmed });
};

// Нові досягнення: нагорода монетами й сповіщення. Викликається після кожної зміни прогресу.
export const checkAchievements = (): void => {
    const unlocked = ACHIEVEMENTS.filter((a) => !state.achieved[a.id] && a.progress(state)[0] >= a.progress(state)[1]);
    if (!unlocked.length) return;
    const now = Date.now();
    commit({ ...state, achieved: { ...state.achieved, ...Object.fromEntries(unlocked.map((a) => [a.id, now])) } });
    for (const a of unlocked) {
        earnCoins(a.reward);
        showToast(t("achievementUnlocked", { name: t(`ach_${a.id}` as Parameters<typeof t>[0]), n: String(a.reward) }));
    }
};

const recordResult = (result: "win" | "draw" | "lose", extra: (s: ProfileStats) => Partial<ProfileStats>, xp: number) => {
    const s = state.stats;
    const currentStreak = result === "win" ? s.currentStreak + 1 : 0;
    const stats: ProfileStats = {
        ...s,
        games: s.games + 1,
        wins: s.wins + (result === "win" ? 1 : 0),
        draws: s.draws + (result === "draw" ? 1 : 0),
        losses: s.losses + (result === "lose" ? 1 : 0),
        currentStreak,
        bestStreak: Math.max(s.bestStreak, currentStreak),
    };
    commit({ ...state, xp: state.xp + xp, stats: { ...stats, ...extra(stats) } });
};

if (typeof window !== "undefined") {
    addGameEventListener((name, params) => {
        if (name === "game_finished") {
            const result = params?.result === "win" ? "win" : params?.result === "draw" ? "draw" : "lose";
            const master = getDifficulty() === "master";
            const mode = params?.mode;
            recordResult(
                result,
                (s) => ({
                    masterDraws: s.masterDraws + (master && result === "draw" ? 1 : 0),
                    // Майстра 3×3 перемогти неможливо - рахуємо 5×5 і Ultimate.
                    masterWins: s.masterWins + (master && result === "win" && mode !== "easy" ? 1 : 0),
                    ultimateWins: s.ultimateWins + (mode === "hard" && result === "win" ? 1 : 0),
                }),
                result === "win" ? XP.win : result === "draw" ? XP.draw : XP.lose
            );
        } else if (name === "online_game_finished") {
            const result = params?.result === "win" ? "win" : params?.result === "draw" ? "draw" : "lose";
            recordResult(
                result,
                (s) => ({ onlineWins: s.onlineWins + (result === "win" ? 1 : 0) }),
                result === "win" ? XP.onlineWin : result === "draw" ? XP.onlineDraw : XP.onlineLoss
            );
        } else if (name === "daily_finished") {
            const streak = typeof params?.streak === "number" ? params.streak : 1;
            commit({ ...state, xp: state.xp + XP.daily, stats: { ...state.stats, bestDailyStreak: Math.max(state.stats.bestDailyStreak, streak) } });
        } else if (name === "campaign_level_finished") {
            const stars = typeof params?.stars === "number" ? params.stars : 0;
            commit({ ...state, xp: state.xp + stars * XP.campaignStar });
        } else if (name !== "skin_bought") {
            return;
        }
        checkAchievements();
    });
}

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
export const useProfile = (): ProfileState => useSyncExternalStore(subscribe, () => state, () => EMPTY);
