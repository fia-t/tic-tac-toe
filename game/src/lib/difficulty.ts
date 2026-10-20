"use client";
import { useSyncExternalStore } from "react";
import { isEmbed } from "@game/lib/embed";

// Рівень ШІ для офлайн-режимів (3×3, 5×5, Ultimate). medium - поведінка, що була в
// грі до появи рівнів, тож це і дефолт. Вибір - зручність одного гравця, тому
// localStorage (не хмарні збереження порталу).
export type Difficulty = "easy" | "medium" | "master";

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "master"];

const STORAGE_KEY = "ttt-difficulty";

const readStored = (): Difficulty => {
    try {
        const value = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        return DIFFICULTIES.includes(value as Difficulty) ? (value as Difficulty) : "medium";
    } catch {
        return "medium";
    }
};

let current: Difficulty = readStored();

// Чи гравець уже колись обирав рівень (новачку без вибору ставимо "Легкий").
export const hasStoredDifficulty = (): boolean => {
    try {
        return typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
        return false;
    }
};
// Тимчасовий рівень на одну партію (виклик дня) - не перезаписує вибір гравця.
let override: Difficulty | null = null;
const listeners = new Set<() => void>();

export const getDifficulty = (): Difficulty => override ?? current;

export const setDifficultyOverride = (value: Difficulty | null): void => {
    if (value === override) return;
    override = value;
    listeners.forEach((listener) => listener());
};

export const setDifficulty = (value: Difficulty): void => {
    if (value === current) return;
    current = value;
    // Гра в новині не пам'ятає вибір: кожен відвідувач починає з легкого бота.
    if (isEmbed()) {
        listeners.forEach((listener) => listener());
        return;
    }
    try {
        localStorage.setItem(STORAGE_KEY, value);
    } catch {
        // Сховище недоступне - вибір діє до перезавантаження.
    }
    listeners.forEach((listener) => listener());
};

export const useDifficulty = (): Difficulty =>
    useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        getDifficulty,
        () => "medium" as Difficulty
    );

// Легкий ШІ "помиляється" - робить випадковий хід приблизно в третині випадків.
export const EASY_BLUNDER_RATE = 0.35;
export const shouldBlunder = (difficulty: Difficulty): boolean =>
    difficulty === "easy" && Math.random() < EASY_BLUNDER_RATE;
