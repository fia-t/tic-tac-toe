// Спільний інтерфейс над CrazyGames SDK / Poki SDK / "немає SDK" (itch.io) - App.tsx і
// весь ігровий UI викликають лише ці методи, не знаючи, який саме агрегатор зараз показує гру.
export type AggregatorSdk = {
    init: () => Promise<void>;
    loadingStart: () => void;
    loadingStop: () => void;
    gameplayStart: () => void;
    gameplayStop: () => void;
    // Рекламна пауза між партіями - викликається періодично (див. App.tsx), не гарантовано
    // показує рекламу щоразу (агрегатор сам вирішує частоту) - тому без return-значення.
    showMidgameAd: () => Promise<void>;
    // Rewarded-реклама: true = переглянуто (можна відкривати "Гра з другом"),
    // false = відхилено/не вдалося показати.
    showRewardedAd: () => Promise<boolean>;
    happyTime?: () => void;
};
