import type { AggregatorSdk } from "./types";
import { setSoundSuppressed } from "@game/lib/sound";

// CrazyGames HTML5 SDK v3 (https://docs.crazygames.com/sdk/intro/). Скрипт
// https://sdk.crazygames.com/crazygames-sdk-v3.js підставляє game/vite.config.ts (--mode crazygames).
// v3, на відміну від v2, вимагає `await SDK.init()` до будь-якого іншого виклику - тому всі
// методи нижче чекають на `ready` (init ігровий код викликає без await, а loadingStart може
// прийти раніше, ніж init завершився).
//
// Що де використовується:
//  - game: loading/gameplay (через lifecycle.ts), happytime, inviteLink/getInviteParam (гра з другом),
//    settings.muteAudio (вимога: має пріоритет над нашим перемикачем звуку);
//  - ad: midgame + rewarded, звук глушимо на час реклами (adStarted -> adFinished/adError);
//  - data: прогрес (daily/wallet/campaign/profile) - вимога CrazyGames покладатись лише на Data
//    Module (і для гостей, і для акаунтів), не на власний localStorage;
//  - user: імʼя акаунта CrazyGames, вхід (authListener), мова (systemInfo.locale).

type CgUser = { username: string; profilePictureUrl?: string; __dangerousUserId?: string };
type CgSettings = { muteAudio?: boolean; disableChat?: boolean };
type AdCallbacks = {
    adStarted?: () => void;
    adFinished?: () => void;
    adError?: (error: unknown) => void;
};

declare global {
    interface Window {
        CrazyGames?: {
            SDK: {
                init: () => Promise<void>;
                // "crazygames" - на сайті, "local" - localhost (заглушки), "disabled" - інший домен.
                environment: "crazygames" | "local" | "disabled" | string;
                game: {
                    loadingStart: () => void;
                    loadingStop: () => void;
                    gameplayStart: () => void;
                    gameplayStop: () => void;
                    happytime: () => void;
                    inviteLink: (params: Record<string, string>) => string;
                    getInviteParam: (name: string) => string | null;
                    settings: CgSettings;
                    addSettingsChangeListener: (listener: (settings: CgSettings) => void) => void;
                };
                ad: {
                    requestAd: (type: "midgame" | "rewarded", callbacks: AdCallbacks) => void;
                };
                data: {
                    getItem: (key: string) => string | null;
                    setItem: (key: string, value: string) => void;
                };
                user: {
                    isUserAccountAvailable: boolean;
                    systemInfo?: { locale?: string };
                    getUser: () => Promise<CgUser | null>;
                    addAuthListener: (listener: (user: CgUser | null) => void) => void;
                    removeAuthListener: (listener: (user: CgUser | null) => void) => void;
                };
            };
        };
    }
}

type Sdk = NonNullable<Window["CrazyGames"]>["SDK"];

let readyPromise: Promise<Sdk | null> | null = null;

// null - SDK недоступний (скрипт не завантажився / init впав): гра працює без нього.
const ready = (): Promise<Sdk | null> => {
    if (!readyPromise) {
        readyPromise = (async () => {
            const sdk = typeof window !== "undefined" ? window.CrazyGames?.SDK : undefined;
            if (!sdk) return null;
            try {
                await sdk.init();
                return sdk;
            } catch (err) {
                console.warn("[CrazyGames] init failed", err);
                return null;
            }
        })();
    }
    return readyPromise;
};

const call = (fn: (sdk: Sdk) => void) => {
    void ready().then((sdk) => {
        if (!sdk) return;
        try {
            fn(sdk);
        } catch (err) {
            console.warn("[CrazyGames]", err);
        }
    });
};

// Звук глушиться, якщо йде реклама АБО CrazyGames просить вимкнути аудіо (settings.muteAudio).
let adPlaying = false;
let platformMuted = false;
const syncSound = () => setSoundSuppressed(adPlaying || platformMuted);

// true = реклама переглянута (для rewarded - зараховувати нагороду); false = помилка/відмова.
// Без SDK (не CrazyGames-оточення) гравця не блокуємо - одразу true.
const requestAd = async (type: "midgame" | "rewarded"): Promise<boolean> => {
    const sdk = await ready();
    if (!sdk) return true;
    return new Promise((resolve) => {
        const done = (result: boolean) => {
            adPlaying = false;
            syncSound();
            resolve(result);
        };
        try {
            sdk.ad.requestAd(type, {
                adStarted: () => {
                    adPlaying = true;
                    syncSound();
                },
                adFinished: () => done(true),
                adError: () => done(false),
            });
        } catch {
            done(false);
        }
    });
};

const toUser = (user: CgUser | null) =>
    user?.username ? { id: `cg:${user.__dangerousUserId ?? user.username}`, name: user.username } : null;

export const crazyGamesSdk: AggregatorSdk = {
    init: async () => {
        const sdk = await ready();
        if (!sdk) return;
        platformMuted = Boolean(sdk.game.settings?.muteAudio);
        syncSound();
        sdk.game.addSettingsChangeListener?.((settings) => {
            platformMuted = Boolean(settings?.muteAudio);
            syncSound();
        });
    },
    loadingStart: () => call((sdk) => sdk.game.loadingStart()),
    loadingStop: () => call((sdk) => sdk.game.loadingStop()),
    gameplayStart: () => call((sdk) => sdk.game.gameplayStart()),
    gameplayStop: () => call((sdk) => sdk.game.gameplayStop()),
    showMidgameAd: async () => {
        await requestAd("midgame");
    },
    showRewardedAd: () => requestAd("rewarded"),
    hasRewardedAds: true,
    happyTime: () => call((sdk) => sdk.game.happytime()),

    // --- Гра з другом: запрошення веде на сторінку гри на CrazyGames (зовнішні посилання заборонені).
    getInviteParams: async () => {
        const sdk = await ready();
        const roomId = sdk?.game.getInviteParam("roomId");
        return roomId ? { roomId } : null;
    },
    createInviteLink: async (params) => {
        const sdk = await ready();
        if (!sdk) return null;
        try {
            return sdk.game.inviteLink(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])));
        } catch {
            return null;
        }
    },

    // --- Прогрес - Data Module (рядки; зберігаємо JSON). Ліміт - 1 МБ на всю гру.
    loadData: async <T>(key: string): Promise<T | null> => {
        const sdk = await ready();
        if (!sdk) return null;
        try {
            const raw = sdk.data.getItem(key);
            return raw ? (JSON.parse(raw) as T) : null;
        } catch {
            return null;
        }
    },
    saveData: async (key, value) => {
        const sdk = await ready();
        if (!sdk) return;
        try {
            sdk.data.setItem(key, JSON.stringify(value));
        } catch (err) {
            console.warn("[CrazyGames] data.setItem", err);
        }
    },

    // --- Акаунт CrazyGames: імʼя гравця (вимога full launch - використовувати username CrazyGames).
    getUser: async () => {
        const sdk = await ready();
        if (!sdk?.user.isUserAccountAvailable) return null;
        return toUser(await sdk.user.getUser().catch(() => null));
    },
    // Вихід CrazyGames робить перезавантаженням сторінки - слухач спрацьовує лише на вхід
    // (тоді Data Module вже підтягнув дані акаунта - перечитуємо прогрес).
    onAuthChange: (callback) => {
        const listener = () => callback();
        call((sdk) => sdk.user.addAuthListener(listener));
        return () => call((sdk) => sdk.user.removeAuthListener(listener));
    },
    getLocale: async () => (await ready())?.user.systemInfo?.locale ?? null,
};
