import type { AggregatorSdk } from "./types";

// API за перевіреною документацією Poki HTML5 SDK (https://sdk.poki.com/html5).
declare global {
    interface Window {
        PokiSDK?: {
            init: () => Promise<void>;
            gameLoadingFinished: () => void;
            gameplayStart: () => void;
            gameplayStop: () => void;
            commercialBreak: (onStart?: () => void) => Promise<void>;
            rewardedBreak: (onStart?: () => void) => Promise<boolean>;
        };
    }
}

export const pokiSdk: AggregatorSdk = {
    init: async () => {
        try {
            await window.PokiSDK?.init();
        } catch {
            // Документація Poki: якщо init відхилився - усе одно продовжувати гру.
        }
    },
    // Poki не має окремого "почати завантаження" - лише сигнал про завершення.
    loadingStart: () => {},
    loadingStop: () => window.PokiSDK?.gameLoadingFinished(),
    gameplayStart: () => window.PokiSDK?.gameplayStart(),
    gameplayStop: () => window.PokiSDK?.gameplayStop(),
    showMidgameAd: async () => {
        if (!window.PokiSDK) return;
        await window.PokiSDK.commercialBreak();
    },
    showRewardedAd: async () => {
        if (!window.PokiSDK) return true;
        return window.PokiSDK.rewardedBreak();
    },
};
