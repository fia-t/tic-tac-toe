"use client";
import { useSyncExternalStore } from "react";
import { addGameEventListener, trackEvent } from "@game/lib/firebase";
import { getDifficulty } from "@game/lib/difficulty";

// Монети й колекція скінів гравця. Скін = тема з адмінки (або вбудована "Класика").
// Зберігання - як у виклику дня: localStorage, на порталі - хмарні збереження SDK
// (configureWalletStorage з App.tsx), тож монети не губляться між пристроями.

export type WalletState = {
    coins: number;
    owned: string[];
    equipped: string;
    // Пробні скіни (за rewarded-рекламу): id -> до якого моменту (ms) діє.
    trials: Record<string, number>;
};

export const FREE_SKIN_ID = "classic";
const START_COINS = 100;
export const TRIAL_HOURS = 24;

// Нагороди за партію. Майстра винагороджуємо й за нічию - перемогти його в 3×3 неможливо.
const REWARDS = {
    win: { easy: 5, medium: 10, master: 25 },
    draw: { easy: 3, medium: 3, master: 15 },
    lose: 1,
    online: { win: 10, draw: 3, loss: 1 },
    dailyBase: 30,
    dailyPerStreakDay: 5,
    dailyStreakCap: 7,
};

const startState = (): WalletState => ({ coins: START_COINS, owned: [FREE_SKIN_ID], equipped: FREE_SKIN_ID, trials: {} });
const EMPTY = startState();

const sanitize = (raw: unknown): WalletState => {
    if (!raw || typeof raw !== "object") return startState();
    const r = raw as Partial<WalletState>;
    const owned = Array.isArray(r.owned) ? r.owned.filter((id): id is string => typeof id === "string") : [];
    return {
        coins: typeof r.coins === "number" && r.coins >= 0 ? Math.floor(r.coins) : START_COINS,
        owned: owned.includes(FREE_SKIN_ID) ? owned : [FREE_SKIN_ID, ...owned],
        equipped: typeof r.equipped === "string" ? r.equipped : FREE_SKIN_ID,
        trials: r.trials && typeof r.trials === "object" ? (r.trials as Record<string, number>) : {},
    };
};

export type WalletStorage = { load: () => Promise<unknown>; save: (state: WalletState) => Promise<void> };

const STORAGE_KEY = "ttt-wallet";
const localBackend: WalletStorage = {
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

let backend: WalletStorage = localBackend;
let state: WalletState = startState();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const reload = async () => {
    state = sanitize(await backend.load());
    notify();
};
if (typeof window !== "undefined") void reload();

export const configureWalletStorage = (storage: WalletStorage): Promise<void> => {
    backend = storage;
    return reload();
};
export const reloadWallet = (): Promise<void> => reload();

const commit = (next: WalletState) => {
    state = next;
    notify();
    void backend.save(state);
};

export const getWallet = (): WalletState => state;

export const isSkinUnlocked = (id: string, s: WalletState = state): boolean =>
    s.owned.includes(id) || (s.trials[id] ?? 0) > Date.now();

// Обраний скін, якщо він ще доступний (пробний міг закінчитись) - інакше "Класика".
export const getEquippedSkinId = (s: WalletState = state): string => (isSkinUnlocked(s.equipped, s) ? s.equipped : FREE_SKIN_ID);

// --- нарахування й "+N" біля лічильника ---

export type Earning = { amount: number; at: number };
let lastEarning: Earning | null = null;
const earnListeners = new Set<() => void>();

export const earnCoins = (amount: number): void => {
    if (amount <= 0) return;
    commit({ ...state, coins: state.coins + amount });
    lastEarning = { amount, at: Date.now() };
    earnListeners.forEach((listener) => listener());
};

export const buySkin = (id: string, price: number): boolean => {
    if (state.owned.includes(id)) return true;
    if (state.coins < price) return false;
    commit({ ...state, coins: state.coins - price, owned: [...state.owned, id], equipped: id });
    trackEvent("skin_bought", { skin: id, price });
    return true;
};

export const equipSkin = (id: string): void => {
    if (!isSkinUnlocked(id) || state.equipped === id) return;
    commit({ ...state, equipped: id });
    trackEvent("skin_equipped", { skin: id });
};

export const startSkinTrial = (id: string): void => {
    commit({ ...state, trials: { ...state.trials, [id]: Date.now() + TRIAL_HOURS * 3_600_000 }, equipped: id });
    trackEvent("skin_trial", { skin: id });
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
export const useWallet = (): WalletState => useSyncExternalStore(subscribe, getWallet, () => EMPTY);

export const useLastEarning = (): Earning | null =>
    useSyncExternalStore(
        (listener) => {
            earnListeners.add(listener);
            return () => {
                earnListeners.delete(listener);
            };
        },
        () => lastEarning,
        () => null
    );

// --- нагороди за ігрові події ---

if (typeof window !== "undefined") {
    addGameEventListener((name, params) => {
        if (name === "game_finished") {
            const difficulty = getDifficulty();
            const result = params?.result;
            earnCoins(result === "win" ? REWARDS.win[difficulty] : result === "draw" ? REWARDS.draw[difficulty] : REWARDS.lose);
        } else if (name === "online_game_finished") {
            const result = params?.result;
            earnCoins(result === "win" ? REWARDS.online.win : result === "draw" ? REWARDS.online.draw : REWARDS.online.loss);
        } else if (name === "daily_finished") {
            const streak = typeof params?.streak === "number" ? params.streak : 1;
            earnCoins(REWARDS.dailyBase + REWARDS.dailyPerStreakDay * Math.min(streak, REWARDS.dailyStreakCap));
        }
    });
}

export const dailyReward = (streak: number): number =>
    REWARDS.dailyBase + REWARDS.dailyPerStreakDay * Math.min(Math.max(streak, 1), REWARDS.dailyStreakCap);
