import type { AggregatorSdk, BannerResult } from "./types";
import { setSoundSuppressed } from "@game/lib/sound";

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
    // https://docs-dev.quartsoft.com/sdk/ad-module - promise ніколи не відхиляється, результат - лише в колбеках.
    ad?: {
        requestAd: (
            kind: "midgame" | "rewarded",
            callbacks?: {
                adStarted?: () => void;
                adFinished?: () => void;
                adRewarded?: () => void;
                adError?: (error: { code: string; message?: string }) => void;
            }
        ) => Promise<void>;
    };
    // https://docs-dev.quartsoft.com/sdk/banner-module - відхиляється з SdkError (code: unfilled, cooldown, notVisible...).
    banner?: {
        requestBanner: (options: { id: string; width: number; height: number }) => Promise<void>;
        clearBanner: (id: string) => Promise<void>;
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
    // Midgame - між партіями (див. App.tsx), лише після game.gameplayStop(); помилки (cooldown тощо) - не страшно.
    showMidgameAd: async () => {
        const ad = api()?.ad;
        if (!ad) return;
        await ad.requestAd("midgame", {
            adStarted: () => setSoundSuppressed(true),
            adFinished: () => setSoundSuppressed(false),
            adError: () => setSoundSuppressed(false),
        });
    },
    // Rewarded - лише за явним вибором гравця ("+" біля ресурсів у шапці). true - переглянуто до кінця.
    showRewardedAd: async () => {
        const ad = api()?.ad;
        if (!ad) return false;
        let rewarded = false;
        await ad.requestAd("rewarded", {
            adStarted: () => setSoundSuppressed(true),
            adRewarded: () => {
                rewarded = true;
            },
            adFinished: () => setSoundSuppressed(false),
            adError: (error) => {
                setSoundSuppressed(false);
                console.warn("[QSPlaySDK] ad.requestAd rewarded failed", error.code);
            },
        });
        return rewarded;
    },
    // Модулі ad і banner є не в кожній версії SDK порталу - реклама вмикається, щойно портал їх видасть.
    get hasRewardedAds() {
        return Boolean(api()?.ad);
    },
    get hasBanners() {
        return Boolean(api()?.banner);
    },
    showBanner: async (id, width, height): Promise<BannerResult> => {
        const banner = api()?.banner;
        if (!banner) return "failed";
        try {
            await banner.requestBanner({ id, width, height });
            return "shown";
        } catch (error) {
            const code = (error as { code?: string })?.code;
            // Немає реклами чи вона вимкнена - звичайні ситуації, без попередження.
            if (code !== "unfilled" && code !== "adsDisabled" && code !== "cooldown") console.warn("[QSPlaySDK] banner.requestBanner failed", code ?? error);
            return code === "cooldown" ? "cooldown" : "failed";
        }
    },
    clearBanner: (id) => safe("banner.clearBanner", () => api()?.banner?.clearBanner(id), undefined),

    setGameContext: (context) => void safe("game.setGameContext", () => api()?.game.setGameContext(context), undefined),
    clearGameContext: () => void safe("game.clearGameContext", () => api()?.game.clearGameContext(), undefined),
    // Сам SDK ніколи не кидає й тротлить (5 с, лише останнє значення) - обгортка не потрібна.
    reportPlayerLevel: (level) => api()?.game.reportPlayerLevel(level),

    // USER_NOT_AUTHENTICATED для гостя - нормальна ситуація, тож без попередження в консолі.
    getUserToken: async () => {
        try {
            return (await api()?.user.getUserToken()) ?? null;
        } catch {
            return null;
        }
    },
    getUser: async () => {
        try {
            const user = await api()?.user.getUser();
            return user ? { id: user.qsid, name: user.name } : null;
        } catch {
            return null;
        }
    },
    shareLink: () => safe("game.shareLink", () => api()?.game.shareLink(), null),
    getLocale: async () => (await safe("game.getConfig", () => api()?.game.getConfig(), null))?.locale ?? null,
    onLocaleChange: (callback) => api()?.game.addLocaleListener(({ locale }) => callback(locale)) ?? (() => {}),

    requestFullscreen: () => safe("game.requestFullscreen", () => api()?.game.requestFullscreen(), undefined),
    exitFullscreen: () => safe("game.exitFullscreen", () => api()?.game.exitFullscreen(), undefined),
    onFullscreenChange: (callback) => api()?.game.addFullscreenListener(({ isFullscreen }) => callback(isFullscreen)) ?? (() => {}),

    getInviteParams: () => safe("game.getInviteParams", () => api()?.game.getInviteParams(), null),
    createInviteLink: (params) =>
        safe("game.inviteLink", () => api()?.game.inviteLink(params as Record<string, DataValue>), null),

    loadData: <T>(key: string) => safe<T | null>("data.getItem", () => api()?.data.getItem<T>(key), null),
    saveData: (key, value) => safe("data.setItem", () => api()?.data.setItem(key, value as DataValue), undefined),

    // Після входу/виходу гостьові дані переносяться в акаунт - викликач має перечитати
    // збереження й повторно відправити рівень (SDK сам цього не робить для гостей).
    onAuthChange: (callback) => api()?.user.addAuthListener(() => callback()) ?? (() => {}),
};
