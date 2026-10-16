"use client";
import { useSyncExternalStore } from "react";

// Яке вікно (панель) відкрите - спільне для кнопок у верхньому ряду, карток головного
// екрана й нижньої навігації: усі вони відкривають ті самі вікна, а не власні копії.
export type Panel = "daily" | "campaign" | "shop" | "awards" | "profile" | "leaderboard" | "match" | "settings";

let open: Panel | null = null;
const listeners = new Set<() => void>();

export const openPanel = (panel: Panel): void => {
    open = panel;
    listeners.forEach((listener) => listener());
};

export const closePanel = (): void => {
    if (open === null) return;
    open = null;
    listeners.forEach((listener) => listener());
};

export const useOpenPanel = (): Panel | null =>
    useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        () => open,
        () => null
    );

// --- короткі сповіщення (досягнення) ---

export type Toast = { id: number; text: string };
let toasts: Toast[] = [];
let toastSeq = 0;
const toastListeners = new Set<() => void>();
const notifyToasts = () => toastListeners.forEach((listener) => listener());

export const showToast = (text: string): void => {
    const toast = { id: ++toastSeq, text };
    toasts = [...toasts, toast];
    notifyToasts();
    setTimeout(() => {
        toasts = toasts.filter((item) => item.id !== toast.id);
        notifyToasts();
    }, 3200);
};

const EMPTY: Toast[] = [];
export const useToasts = (): Toast[] =>
    useSyncExternalStore(
        (listener) => {
            toastListeners.add(listener);
            return () => {
                toastListeners.delete(listener);
            };
        },
        () => toasts,
        () => EMPTY
    );

// --- поточний екран (меню чи поле) - для обліку часу гри на порталі (gameplayStart/Stop) ---

export type Screen = "home" | "game";
let screen: Screen = "home";
export const getScreen = (): Screen => screen;
export const setScreenState = (value: Screen): void => {
    screen = value;
};

// --- прокрутка лише всередині гри ---
// element.scrollIntoView() у грі, вбудованій в iframe (портал), прокручує ще й сторінку порталу -
// при старті вона з'їжджала вниз і ховала свою шапку. Тому крутимо тільки власне вікно гри.
export const scrollGameTo = (element: HTMLElement | null, options: { block?: "start" | "center"; smooth?: boolean } = {}): void => {
    if (typeof window === "undefined") return;
    const behavior: ScrollBehavior = options.smooth ? "smooth" : "auto";
    if (!element) {
        window.scrollTo({ top: 0, behavior });
        return;
    }
    const rect = element.getBoundingClientRect();
    const top = options.block === "center" ? window.scrollY + rect.top - (window.innerHeight - rect.height) / 2 : window.scrollY + rect.top;
    window.scrollTo({ top: Math.max(0, top), behavior });
};
