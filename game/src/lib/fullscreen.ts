"use client";
import { useEffect, useState } from "react";

// Повний екран. На порталі QS Play гра живе в iframe, і розгортає її сам портал (SDK
// requestFullscreen/exitFullscreen) - App.tsx передає це сюди через setFullscreenProvider.
// Без SDK (сайт, інші агрегатори) - звичайний Fullscreen API браузера.

export type FullscreenProvider = {
    request: () => Promise<void>;
    exit: () => Promise<void>;
    // Повертає відписку; callback - чи гра зараз на весь екран.
    subscribe: (callback: (isFullscreen: boolean) => void) => () => void;
};

const browserProvider: FullscreenProvider = {
    request: async () => {
        await document.documentElement.requestFullscreen?.();
    },
    exit: async () => {
        if (document.fullscreenElement) await document.exitFullscreen?.();
    },
    subscribe: (callback) => {
        const handler = () => callback(Boolean(document.fullscreenElement));
        document.addEventListener("fullscreenchange", handler);
        return () => document.removeEventListener("fullscreenchange", handler);
    },
};

// Вікно гри займає весь екран пристрою - отже, гра розгорнута, навіть якщо портал про це не
// повідомив (напр. гра з другом відкрилась уже на весь екран, і подія прийшла до підписки).
// На телефоні вікно браузера й так на весь екран - там цій ознаці не віримо.
const fillsScreen = (): boolean => {
    if (typeof window === "undefined" || !window.screen) return false;
    if (window.matchMedia?.("(pointer: coarse)").matches) return false;
    return window.innerWidth >= window.screen.width - 1 && window.innerHeight >= window.screen.height - 1;
};

let provider: FullscreenProvider | null = null;
// Що останнім повідомив портал/браузер.
let reported = false;
let current = false;
const listeners = new Set<(value: boolean) => void>();
let unsubscribe: (() => void) | null = null;
let resizeBound = false;

const active = (): FullscreenProvider => provider ?? browserProvider;

const publish = () => {
    const next = reported || fillsScreen();
    if (next === current) return;
    current = next;
    listeners.forEach((listener) => listener(next));
};

const watch = () => {
    unsubscribe?.();
    unsubscribe = active().subscribe((value) => {
        reported = value;
        publish();
    });
    // Розмір вікна - запасна ознака: вихід/вхід у повний екран завжди змінює розмір iframe.
    if (!resizeBound) {
        resizeBound = true;
        window.addEventListener("resize", () => {
            // Портал міг пропустити подію виходу - якщо вікно вже не на весь екран, гра не розгорнута.
            const coarse = window.matchMedia?.("(pointer: coarse)").matches;
            if (reported && !coarse && !fillsScreen() && !document.fullscreenElement) reported = false;
            publish();
        });
    }
    publish();
};

export const setFullscreenProvider = (next: FullscreenProvider): void => {
    provider = next;
    if (typeof window !== "undefined") watch();
};

// Чи можна розгорнути гру: портал уміє завжди, браузер - не всюди (напр. iPhone Safari).
export const isFullscreenSupported = (): boolean =>
    provider !== null || (typeof document !== "undefined" && Boolean(document.fullscreenEnabled));

export const toggleFullscreen = async (): Promise<void> => {
    try {
        if (current) {
            await active().exit();
            reported = false;
        } else {
            await active().request();
        }
    } catch (error) {
        console.warn("[fullscreen] failed", error);
    }
    // Якщо портал не надіслав подію - стан звіряємо з розміром вікна після анімації розгортання.
    setTimeout(publish, 400);
};

export const useFullscreen = (): boolean => {
    const [value, setValue] = useState(current);
    useEffect(() => {
        if (!unsubscribe) watch();
        listeners.add(setValue);
        setValue(current);
        return () => {
            listeners.delete(setValue);
        };
    }, []);
    return value;
};
