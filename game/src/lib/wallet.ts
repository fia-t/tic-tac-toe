"use client";
import { useSyncExternalStore } from "react";
import { addGameEventListener, trackEvent } from "@game/lib/firebase";
import { isEmbed } from "@game/lib/embed";
import { getDifficulty } from "@game/lib/difficulty";

// Монети й колекція скінів гравця. Скін = тема з адмінки (або вбудована "Класика").
// Зберігання - як у виклику дня: localStorage, на порталі - хмарні збереження SDK
// (configureWalletStorage з App.tsx), тож монети не губляться між пристроями.

export type WalletState = {
    coins: number;
    owned: string[];
    equipped: string;
    // Пробні скіни (за rewarded-рекламу): id -> до якого моменту (ms) діє. Івентовий скін теж
    // лежить тут - безкоштовно до кінця івенту.
    trials: Record<string, number>;
    // Івентові скіни, які гра вже обрала гравцеві ("on") і вже повернула на "Класику" після
    // кінця ("off") - щоб робити це лише раз і не перебивати власний вибір гравця.
    events: Record<string, "on" | "off">;
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

// Монети за перегляд rewarded-реклами (кнопка "+" біля монет у шапці).
export const AD_REWARD_COINS = 20;

const startState = (): WalletState => ({ coins: START_COINS, owned: [FREE_SKIN_ID], equipped: FREE_SKIN_ID, trials: {}, events: {} });
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
        events: r.events && typeof r.events === "object" ? (r.events as Record<string, "on" | "off">) : {},
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
    applyEventSkins();
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

// Скін-нагорода (напр. за пройдений розділ кампанії) - назавжди й безкоштовно.
export const grantSkin = (id: string): void => {
    if (!id || state.owned.includes(id)) return;
    commit({ ...state, owned: [...state.owned, id] });
    trackEvent("skin_granted", { skin: id });
};

export const equipSkin = (id: string): void => {
    if (!isSkinUnlocked(id) || state.equipped === id) return;
    commit({ ...state, equipped: id });
    trackEvent("skin_equipped", { skin: id });
};

// --- івентові скіни ---
// Поки іде івент, його скін обраний у всіх (у всіх іграх - усе бере getEquippedSkinId) і доступний
// безкоштовно до кінця івенту. Після кінця, якщо він досі обраний, - назад "Класика".
export type EventSkins = { live: { id: string; until: number } | null; ended: string[] };
let eventSkins: EventSkins | null = null;

const applyEventSkins = () => {
    if (!eventSkins) return;
    let next = state;
    for (const id of eventSkins.ended) {
        if (next.events[id] === "off") continue;
        next = { ...next, events: { ...next.events, [id]: "off" }, equipped: next.equipped === id ? FREE_SKIN_ID : next.equipped };
    }
    const live = eventSkins.live;
    if (live && !next.events[live.id]) {
        const trials = next.owned.includes(live.id) ? next.trials : { ...next.trials, [live.id]: Math.max(next.trials[live.id] ?? 0, live.until) };
        next = { ...next, trials, equipped: live.id, events: { ...next.events, [live.id]: "on" } };
        trackEvent("event_skin_applied", { skin: live.id });
    }
    if (next !== state) commit(next);
};

// Викликається, щойно завантажено каталог тем (і повторно застосовується після завантаження гаманця).
export const setEventSkins = (value: EventSkins): void => {
    eventSkins = value;
    applyEventSkins();
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
        // Гра в новині (iframe) - без монет.
        if (isEmbed()) return;
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
