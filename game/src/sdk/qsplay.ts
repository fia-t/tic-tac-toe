import type { AggregatorSdk } from "./types";

// QSPlay SDK порталу play.quartsoft.com - https://docs-dev.quartsoft.com/sdk/intro
// Скрипт https://sdk.quartsoft.com/v1/sdk.js підключається в <head> (game/vite.config.ts,
// --mode portal) і без init() створює window.QSPlaySDK. Поза iframe порталу (локальна
// розробка) SDK сам вмикає mock-режим; ?sdk-debug=1 показує панель з усіма викликами.
// Усі виклики - postMessage до порталу, тому асинхронні й можуть відхилитись з SdkError
// (code: TIMEOUT | UNSUPPORTED_METHOD | USER_NOT_AUTHENTICATED | DATA_QUOTA_EXCEEDED | UNKNOWN).

type DataValue = string | number | boolean | null | DataValue[] | { [key: string]: DataValue };

type SdkUser = { qsid: string; name: string; avatarUrl: string | null };

type QSPlaySDKApi = {
    version: string;
    game: {
        getConfig: () => Promise<{ locale: string; deviceType: "desktop" | "mobile" }>;
        loadingStart: () => Promise<void>;
        loadingStop: () => Promise<void>;
        gameplayStart: () => Promise<void>;
        gameplayStop: () => Promise<void>;
        setGameContext: (context: Record<string, unknown>) => Promise<void>;
        clearGameContext: () => Promise<void>;
        reportPlayerLevel: (level: number) => void;
        requestFullscreen: () => Promise<void>;
        exitFullscreen: () => Promise<void>;
        addFullscreenListener: (cb: (payload: { isFullscreen: boolean }) => void) => () => void;
        addLocaleListener: (cb: (payload: { locale: string }) => void) => () => void;
        shareLink: () => Promise<string>;
        inviteLink: (params: Record<string, DataValue>) => Promise<string>;
        getInviteParams: () => Promise<Record<string, DataValue> | null>;
    };
    user: {
        getUser: () => Promise<SdkUser | null>;
        showAuthPrompt: () => Promise<unknown>;
        addAuthListener: (cb: (payload: { user: SdkUser | null }) => void) => () => void;
        getUserToken: () => Promise<string>;
    };
    data: {
        getItem: <T = DataValue>(key: string) => Promise<T | null>;
        setItem: (key: string, value: DataValue) => Promise<void>;
        removeItem: (key: string) => Promise<void>;
        clear: () => Promise<void>;
    };
};

declare global {
    interface Window {
        QSPlaySDK?: QSPlaySDKApi;
    }
}

// SDK-скрипт міг не завантажитись (блокувальник, офлайн) - гра має працювати й без нього.
const api = (): QSPlaySDKApi | undefined => (typeof window === "undefined" ? undefined : window.QSPlaySDK);

// Помилки SDK ніколи не повинні ламати гру: TIMEOUT/UNKNOWN - поза контролем гри,
// UNSUPPORTED_METHOD - старіша версія порталу. Лише логуємо (code, не message - див. /sdk/errors).
const safe = async <T>(label: string, call: () => Promise<T> | undefined, fallback: T): Promise<T> => {
    try {
        const result = await call();
        return result === undefined ? fallback : result;
    } catch (error) {
        console.warn(`[QSPlaySDK] ${label} failed`, (error as { code?: string })?.code ?? error);
        return fallback;
    }
};

export const qsplaySdk: AggregatorSdk = {
    init: async () => {},
    loadingStart: () => void safe("game.loadingStart", () => api()?.game.loadingStart(), undefined),
    loadingStop: () => void safe("game.loadingStop", () => api()?.game.loadingStop(), undefined),
    gameplayStart: () => void safe("game.gameplayStart", () => api()?.game.gameplayStart(), undefined),
    gameplayStop: () => void safe("game.gameplayStop", () => api()?.game.gameplayStop(), undefined),
    // Рекламу на порталі показує сам портал (PortalGameBridge) - SDK її не має.
    showMidgameAd: async () => {},
    showRewardedAd: async () => true,

    setGameContext: (context) => void safe("game.setGameContext", () => api()?.game.setGameContext(context), undefined),
    clearGameContext: () => void safe("game.clearGameContext", () => api()?.game.clearGameContext(), undefined),
    // Сам SDK ніколи не кидає й тротлить (5 с, лише останнє значення) - обгортка не потрібна.
    reportPlayerLevel: (level) => api()?.game.reportPlayerLevel(level),

    shareLink: () => safe("game.shareLink", () => api()?.game.shareLink(), null),
    getLocale: async () => (await safe("game.getConfig", () => api()?.game.getConfig(), null))?.locale ?? null,
    onLocaleChange: (callback) => api()?.game.addLocaleListener(({ locale }) => callback(locale)) ?? (() => {}),

    getInviteParams: () => safe("game.getInviteParams", () => api()?.game.getInviteParams(), null),
    createInviteLink: (params) =>
        safe("game.inviteLink", () => api()?.game.inviteLink(params as Record<string, DataValue>), null),

    loadData: <T>(key: string) => safe<T | null>("data.getItem", () => api()?.data.getItem<T>(key), null),
    saveData: (key, value) => safe("data.setItem", () => api()?.data.setItem(key, value as DataValue), undefined),

    // Після входу/виходу гостьові дані переносяться в акаунт - викликач має перечитати
    // збереження й повторно відправити рівень (SDK сам цього не робить для гостей).
    onAuthChange: (callback) => api()?.user.addAuthListener(() => callback()) ?? (() => {}),
};
