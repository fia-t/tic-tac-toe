import type { AggregatorSdk } from "./types";

// API за перевіреною документацією CrazyGames HTML5 v2 SDK
// (https://docs.crazygames.com/sdk/html5-v2/intro/, https://docs.crazygames.com/sdk/html5-v2/game/) -
// SDK не потребує явного init(), тому ad/game-методи можуть з'явитись на window.CrazyGames
// асинхронно; кожен виклик тут захищений optional chaining на випадок, якщо скрипт
// із index.crazygames.html ще не встиг завантажитись (напр. локальна розробка).
type AdCallbacks = {
    adStarted?: () => void;
    adFinished?: () => void;
    adError?: (error: unknown, errorData?: unknown) => void;
};

declare global {
    interface Window {
        CrazyGames?: {
            SDK: {
                game: {
                    sdkGameLoadingStart: () => void;
                    sdkGameLoadingStop: () => void;
                    gameplayStart: () => void;
                    gameplayStop: () => void;
                    happytime: () => void;
                };
                ad: {
                    requestAd: (type: "midgame" | "rewarded", callbacks: AdCallbacks) => void;
                };
            };
        };
    }
}

// true = реклама показана/завершена (для rewarded - зараховувати нагороду);
// false = помилка показу реклами. Якщо SDK-скрипт не завантажився взагалі (не в
// CrazyGames-оточенні), не блокуємо гравця - одразу true.
const requestAd = (type: "midgame" | "rewarded"): Promise<boolean> =>
    new Promise((resolve) => {
        const sdk = window.CrazyGames?.SDK;
        if (!sdk) {
            resolve(true);
            return;
        }
        sdk.ad.requestAd(type, {
            adFinished: () => resolve(true),
            adError: () => resolve(false),
        });
    });

export const crazyGamesSdk: AggregatorSdk = {
    init: async () => {},
    loadingStart: () => window.CrazyGames?.SDK.game.sdkGameLoadingStart(),
    loadingStop: () => window.CrazyGames?.SDK.game.sdkGameLoadingStop(),
    gameplayStart: () => window.CrazyGames?.SDK.game.gameplayStart(),
    gameplayStop: () => window.CrazyGames?.SDK.game.gameplayStop(),
    showMidgameAd: async () => {
        await requestAd("midgame");
    },
    showRewardedAd: () => requestAd("rewarded"),
    happyTime: () => window.CrazyGames?.SDK.game.happytime(),
};
