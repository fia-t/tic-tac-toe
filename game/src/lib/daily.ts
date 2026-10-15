"use client";
import { useSyncExternalStore } from "react";
import { Difficulty, setDifficultyOverride } from "@game/lib/difficulty";
import { Modifier, setModifierOverride } from "@game/lib/modifiers";

// Виклик дня: одна партія на день, однакова для всіх гравців (шаблон обирається за
// номером дня), з зірками, серією днів поспіль і результатом для шерингу.
// Поки що шаблони - лише наявні режими × рівні ШІ; модифікатори з прототипу
// (гравітація, зникаючі фішки...) додадуться сюди, коли з'являться в грі.

export type DailyMode = "traditional" | "five" | "difficult";

export type DailyTemplate = {
    id: string;
    mode: DailyMode;
    difficulty: Difficulty;
    // win - 3 зірки за перемогу не довше par ходів, 2 - за повільнішу перемогу, 1 - за нічию.
    // survive - 3 зірки за будь-який результат, крім поразки (напр. проти непереможного Майстра 3×3).
    goal: "win" | "survive";
    par: number;
    modifier?: Modifier;
    // Стартова позиція (головоломки кампанії, лише 3×3): індекси клітинок 0-8.
    preset?: { X: number[]; O: number[] };
};

export const DAILY_TEMPLATES: DailyTemplate[] = [
    { id: "classic-master", mode: "traditional", difficulty: "master", goal: "survive", par: 5 },
    { id: "five-medium", mode: "five", difficulty: "medium", goal: "win", par: 7 },
    { id: "ultimate-easy", mode: "difficult", difficulty: "easy", goal: "win", par: 14 },
    { id: "classic-medium", mode: "traditional", difficulty: "medium", goal: "win", par: 4 },
    { id: "five-easy", mode: "five", difficulty: "easy", goal: "win", par: 5 },
    { id: "ultimate-medium", mode: "difficult", difficulty: "medium", goal: "win", par: 18 },
    { id: "five-master", mode: "five", difficulty: "master", goal: "survive", par: 12 },
    // З #288 (15.10.2026) у ротації й модифікатори. Нові шаблони - лише в кінець масиву.
    { id: "classic-vanish", mode: "traditional", difficulty: "medium", goal: "win", par: 5, modifier: "vanish" },
    { id: "five-gravity", mode: "five", difficulty: "medium", goal: "win", par: 7, modifier: "gravity" },
    { id: "five-stones", mode: "five", difficulty: "medium", goal: "win", par: 7, modifier: "stones" },
    { id: "classic-misere", mode: "traditional", difficulty: "master", goal: "survive", par: 5, modifier: "misere" },
    { id: "five-timer", mode: "five", difficulty: "easy", goal: "win", par: 6, modifier: "timer" },
    { id: "ultimate-timer", mode: "difficult", difficulty: "easy", goal: "win", par: 15, modifier: "timer" },
];

// Скільки шаблонів було в ротації до появи модифікаторів - щоб уже зіграні дні
// (і сьогоднішній #287) не змінили свій виклик заднім числом.
const LEGACY_TEMPLATE_COUNT = 7;
const MODIFIER_ROTATION_FROM_DAY = 288;

export type DailyResult = {
    stars: number;
    moves: number;
    result: "win" | "draw" | "lose";
    // Фінальна дошка у форматі encodeGrid (gameLogic.ts).
    grid: string;
};

export type DailyState = {
    last: string | null;
    streak: number;
    results: Record<string, DailyResult>;
};

// --- дати (локальний день гравця) ---

const dateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayKey = (): string => dateKey(new Date());
const yesterdayKey = (): string => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return dateKey(d);
};

// Номер виклику: 1 = 1 січня 2026. Обидві дати парсяться як UTC-північ, тож різниця
// завжди ціла кількість діб, незалежно від часового поясу.
export const dayNumber = (key = todayKey()): number =>
    Math.round((Date.parse(key) - Date.parse("2026-01-01")) / 86_400_000) + 1;

// Номер дня в році (1 січня = 1) - так виклик підписаний для гравця ("День 288"), щодня новий.
// dayNumber вище лишається внутрішнім номером для ротації викликів і аналітики.
export const dayOfYear = (key = todayKey()): number => {
    const year = key.slice(0, 4);
    return Math.round((Date.parse(key) - Date.parse(`${year}-01-01`)) / 86_400_000) + 1;
};

export const templateForDay = (key = todayKey()): DailyTemplate => {
    const day = dayNumber(key);
    const pool = day < MODIFIER_ROTATION_FROM_DAY ? DAILY_TEMPLATES.slice(0, LEGACY_TEMPLATE_COUNT) : DAILY_TEMPLATES;
    return pool[(((day * 3) % pool.length) + pool.length) % pool.length];
};

export const starsFor = (template: DailyTemplate, result: DailyResult["result"], moves: number): number => {
    if (result === "lose") return 0;
    if (template.goal === "survive") return 3;
    if (result === "draw") return 1;
    return moves <= template.par ? 3 : 2;
};

// --- збереження: localStorage, на порталі - хмарні збереження SDK (configureDailyStorage) ---

export type DailyStorage = {
    load: () => Promise<unknown>;
    save: (state: DailyState) => Promise<void>;
};

const STORAGE_KEY = "ttt-daily";

const localStorageBackend: DailyStorage = {
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
            // Сховище недоступне - результат живе до перезавантаження.
        }
    },
};

const emptyState = (): DailyState => ({ last: null, streak: 0, results: {} });
// Стабільний серверний знімок для useSyncExternalStore (новий обʼєкт щоразу = нескінченний ререндер).
const EMPTY_STATE = emptyState();

const sanitize = (raw: unknown): DailyState => {
    if (!raw || typeof raw !== "object") return emptyState();
    const r = raw as Partial<DailyState>;
    return {
        last: typeof r.last === "string" ? r.last : null,
        streak: typeof r.streak === "number" && r.streak >= 0 ? Math.floor(r.streak) : 0,
        results: r.results && typeof r.results === "object" ? r.results : {},
    };
};

let backend: DailyStorage = localStorageBackend;
let state: DailyState = emptyState();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const reload = async () => {
    state = sanitize(await backend.load());
    notify();
};

if (typeof window !== "undefined") void reload();

// Портал: прогрес виклику в хмарі гравця (і переноситься в акаунт при вході).
export const configureDailyStorage = (storage: DailyStorage): Promise<void> => {
    backend = storage;
    return reload();
};

export const reloadDaily = (): Promise<void> => reload();

// Лишаємо лише останні 30 днів - щоб не впертися в ліміт хмарних збережень.
const pruned = (results: Record<string, DailyResult>): Record<string, DailyResult> => {
    const keys = Object.keys(results).sort().slice(-30);
    return Object.fromEntries(keys.map((k) => [k, results[k]]));
};

export const recordDailyResult = (result: DailyResult): DailyState => {
    const today = todayKey();
    if (state.results[today]) return state;
    const streak = state.last === yesterdayKey() ? state.streak + 1 : 1;
    state = { last: today, streak, results: pruned({ ...state.results, [today]: result }) };
    notify();
    void backend.save(state);
    return state;
};

// Серія "згасає", якщо пропущено день: показуємо 0, хоча збережене число лишається до наступної гри.
export const currentStreak = (s: DailyState = state): number =>
    s.last === todayKey() || s.last === yesterdayKey() ? s.streak : 0;

const getState = () => state;
export const getDailyState = (): DailyState => state;
const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const useDailyState = (): DailyState => useSyncExternalStore(subscribe, getState, () => EMPTY_STATE);

// --- активна партія виклику (одна на сторінку) ---

// Активна партія з заданими умовами - виклик дня або рівень кампанії (один механізм:
// рівень ШІ й модифікатор задаються на партію, звичайний попап замінює власна картка).
// id - новий для кожного старту, щоб TicTacToe скидав дошку навіть між двома рівнями поспіль.
export type DailyRun = {
    kind: "daily" | "campaign";
    id: number;
    template: DailyTemplate;
    day: number;
    level?: number;
    finished: boolean;
};

let runSequence = 0;
export const nextRunId = (): number => ++runSequence;

let run: DailyRun | null = null;
const runListeners = new Set<() => void>();

export const getDailyRun = (): DailyRun | null => run;
export const setDailyRun = (value: DailyRun | null): void => {
    run = value;
    runListeners.forEach((listener) => listener());
};

// Вихід із виклику (рестарт, інший режим, кнопка "Звичайна гра") - рівень ШІ знову гравця.
export const endDailyRun = (): void => {
    setDailyRun(null);
    setDifficultyOverride(null);
    setModifierOverride(undefined);
};

export const useDailyRun = (): DailyRun | null =>
    useSyncExternalStore(
        (listener) => {
            runListeners.add(listener);
            return () => {
                runListeners.delete(listener);
            };
        },
        getDailyRun,
        () => null
    );

// --- текст для шерингу ---

const EMOJI: Record<string, string> = { X: "🟥", O: "🟦", D: "🟨", ".": "⬜" };

export const shareText = (day: number, result: DailyResult, streak: number, link: string, labels: { title: string; day: string; moves: string; streak: string }): string => {
    const stars = "⭐".repeat(result.stars) + "☆".repeat(3 - result.stars);
    const grid = result.grid
        .split("/")
        .map((row) => [...row].map((c) => EMOJI[c] ?? "⬜").join(""))
        .join("\n");
    return `${labels.title} · ${labels.day} ${day}\n${stars} · ${labels.moves}: ${result.moves} · ${labels.streak}: ${streak}\n${grid}\n${link}`;
};
