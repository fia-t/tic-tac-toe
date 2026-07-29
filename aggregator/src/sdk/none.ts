import type { AggregatorSdk } from "./types";

// itch.io (і будь-який показ поза відомим агрегатором) - немає рекламної мережі й немає
// SDK. showRewardedAd одразу віддає true (гейт перед "Гра з другом" стає інформаційним
// кроком, а не темним патерном "прикинутись, що показали рекламу"); midgame-реклама - no-op.
export const noneSdk: AggregatorSdk = {
    init: async () => {},
    loadingStart: () => {},
    loadingStop: () => {},
    gameplayStart: () => {},
    gameplayStop: () => {},
    showMidgameAd: async () => {},
    showRewardedAd: async () => true,
};
