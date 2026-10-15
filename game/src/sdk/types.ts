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
    // Чи справді є rewarded-реклама (CrazyGames, Poki). Без неї гра не пропонує
    // "нагород за рекламу" - showRewardedAd там лише заглушка, що одразу віддає true.
    hasRewardedAds?: boolean;
    happyTime?: () => void;

    // --- Нижче - можливості, які має лише QSPlay SDK порталу (src/sdk/qsplay.ts). ---
    // Інші адаптери їх не реалізують, тож викликач перевіряє наявність (sdk.x?.()).

    // Контекст для звітів гравців про проблеми (режим, рахунок тощо).
    setGameContext?: (context: Record<string, unknown>) => void;
    clearGameContext?: () => void;
    // Загальний прогрес гравця - ціле число, що лише зростає.
    reportPlayerLevel?: (level: number) => void;
    // Параметри, з якими гру відкрили за invite-посиланням порталу (null - звичайний візит).
    getInviteParams?: () => Promise<Record<string, unknown> | null>;
    // Посилання на сторінку гри на порталі, що доставить params запрошеному.
    createInviteLink?: (params: Record<string, unknown>) => Promise<string | null>;
    // Хмарні збереження (гість або акаунт порталу).
    loadData?: <T>(key: string) => Promise<T | null>;
    saveData?: (key: string, value: unknown) => Promise<void>;
    // Посилання на сторінку гри з UTM-мітками порталу - для кнопок "Поділитися".
    shareLink?: () => Promise<string | null>;
    // Короткоживучий токен гравця QS Play для нашого бекенду (null - гість/не увійшов).
    getUserToken?: () => Promise<string | null>;
    // Акаунт гравця на порталі (null - гість) - для картки гравця в адмінці.
    getUser?: () => Promise<{ id: string; name: string } | null>;
    // Мова порталу (напр. "en", "uk") і її зміна без перезавантаження; повертає відписку.
    getLocale?: () => Promise<string | null>;
    onLocaleChange?: (callback: (locale: string) => void) => () => void;
    // Повний екран (портал розгортає iframe гри сам) і його зміна; onFullscreenChange повертає відписку.
    requestFullscreen?: () => Promise<void>;
    exitFullscreen?: () => Promise<void>;
    onFullscreenChange?: (callback: (isFullscreen: boolean) => void) => () => void;
    // Вхід/вихід гравця на порталі; повертає відписку.
    onAuthChange?: (callback: () => void) => () => void;
};
