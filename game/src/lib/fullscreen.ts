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

let provider: FullscreenProvider | null = null;
let current = false;
const listeners = new Set<(value: boolean) => void>();
let unsubscribe: (() => void) | null = null;

const active = (): FullscreenProvider => provider ?? browserProvider;

const watch = () => {
    unsubscribe?.();
    unsubscribe = active().subscribe((value) => {
        current = value;
        listeners.forEach((listener) => listener(value));
    });
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
        if (current) await active().exit();
        else await active().request();
    } catch (error) {
        console.warn("[fullscreen] failed", error);
    }
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
