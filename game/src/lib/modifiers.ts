"use client";
import { useSyncExternalStore } from "react";

// Модифікатори правил офлайн-партій. Один модифікатор на партію; доступність залежить
// від режиму (зникаючі фішки мають сенс на 3×3, гравітація й каміння - на 5×5).
export type Modifier = "vanish" | "gravity" | "stones" | "timer" | "misere";
export type GameModeKey = "traditional" | "five" | "difficult";

export const MODIFIERS_BY_MODE: Record<GameModeKey, Modifier[]> = {
    traditional: ["vanish", "misere", "timer"],
    five: ["gravity", "stones", "misere", "timer"],
    difficult: ["timer"],
};

export const TIMER_SECONDS = 5;
export const STONES_COUNT = 3;

const STORAGE_KEY = "ttt-modifier";
const ALL: Modifier[] = ["vanish", "gravity", "stones", "timer", "misere"];

const readStored = (): Modifier | null => {
    try {
        const value = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        return ALL.includes(value as Modifier) ? (value as Modifier) : null;
    } catch {
        return null;
    }
};

let current: Modifier | null = readStored();
// Виклик дня задає свій модифікатор (або явно "без модифікатора") на одну партію.
// undefined - заміни немає, діє вибір гравця.
let override: Modifier | null | undefined = undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export const getModifierChoice = (): Modifier | null => (override !== undefined ? override : current);

export const effectiveModifier = (mode: GameModeKey, choice: Modifier | null = getModifierChoice()): Modifier | null =>
    choice && MODIFIERS_BY_MODE[mode].includes(choice) ? choice : null;

export const setModifier = (value: Modifier | null): void => {
    if (value === current) return;
    current = value;
    try {
        if (value) localStorage.setItem(STORAGE_KEY, value);
        else localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Сховище недоступне - вибір діє до перезавантаження.
    }
    notify();
};

export const setModifierOverride = (value: Modifier | null | undefined): void => {
    if (value === override) return;
    override = value;
    notify();
};

export const useModifierChoice = (): Modifier | null =>
    useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        getModifierChoice,
        () => null
    );

// Модифікатор тижня - підсвічується в перемикачі (ротація щопонеділка від 05.01.2026).
export const weeklyModifier = (date = new Date()): Modifier => {
    const order: Modifier[] = ["vanish", "gravity", "timer", "stones", "misere"];
    const days = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(2026, 0, 5)) / 86_400_000);
    return order[(((Math.floor(days / 7)) % order.length) + order.length) % order.length];
};
