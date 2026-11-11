"use client";
// GameAnalytics (tool.gameanalytics.com) - дублює ті самі ігрові події, що йдуть у GA4 через trackEvent.
// Ключі гри - публічні для веб-SDK (як і Firebase config): NEXT_PUBLIC_GAMEANALYTICS_GAME_KEY / _SECRET_KEY.
// Без ключів модуль нічого не робить. SDK вантажиться динамічно лише в браузері (на SSR він не потрібен),
// події до завантаження стоять у черзі, тож перші секунди після старту не губляться.
//
// Як події мапляться:
//   campaign_level_* / daily_*  -> progression (Start / Complete / Fail), score = зірки
//   skin_bought                  -> resource Sink "coins" за скін
//   ad_rewarded_request          -> ad event RewardedVideo (+ design-подія з placement/result)
//   решта                        -> design event "назва:параметр:параметр..." (до 5 частин), value = число з параметрів

type Params = Record<string, unknown>;
// ESM default-експорт SDK - командна функція, а клас зі статичними методами лежить у
// gameanalytics.GameAnalytics (його d.ts цього не описує), тож потрібні методи описуємо самі.
type Fields = Record<string, unknown>;
interface GA {
    configureAvailableCustomDimensions01(values: string[]): void;
    configureAvailableResourceCurrencies(values: string[]): void;
    configureAvailableResourceItemTypes(values: string[]): void;
    initialize(gameKey?: string, secretKey?: string): void;
    setCustomDimension01(value: string): void;
    addProgressionEvent(status: number, p1: string, p2?: string, p3?: string, score?: number, fields?: Fields): void;
    addResourceEvent(flow: number, currency: string, amount: number, itemType: string, itemId: string, fields?: Fields): void;
    addAdEvent(action: number, type: number, sdk: string, placement: string, fields?: Fields): void;
    addAdEventWithNoAdReason(action: number, type: number, sdk: string, placement: string, reason: number, fields?: Fields): void;
    addDesignEvent(id: string, value?: number, fields?: Fields): void;
}

const gameKey = process.env.NEXT_PUBLIC_GAMEANALYTICS_GAME_KEY;
const secretKey = process.env.NEXT_PUBLIC_GAMEANALYTICS_SECRET_KEY;

// Значення enum'ів SDK (у d.ts вони declare, тож беремо числа).
const PROGRESSION = { start: 1, complete: 2, fail: 3 } as const;
const RESOURCE_SINK = 2;
const AD_ACTION = { show: 2, failedShow: 3, rewardReceived: 4 } as const;
const AD_TYPE_REWARDED = 2;
const AD_ERROR_UNKNOWN = 1;

// Рядкові параметри, що стають частинами design-події, у порядку важливості.
const DESIGN_KEYS = [
    "mode", "gameMode", "difficulty", "modifier", "placement", "action", "screen", "kind",
    "booster", "skin", "tab", "to", "result", "via", "from", "how", "phase", "level",
];
// Числовий параметр, що йде як value design-події.
const VALUE_KEYS = ["moves", "stars", "waited", "price", "day", "step", "streak"];

const SOURCES = ["site", "embed", "portal", "crazygames", "poki", "itch"];

const part = (value: unknown): string =>
    String(value).replace(/[^A-Za-z0-9 \-_.()!?]/g, "_").slice(0, 64) || "none";

const designId = (name: string, params: Params): string => {
    const parts = [part(name)];
    for (const key of DESIGN_KEYS) {
        if (parts.length >= 5) break;
        const value = params[key];
        if (typeof value === "string" || typeof value === "number") parts.push(part(value));
    }
    return parts.join(":");
};

const designValue = (params: Params): number | undefined => {
    for (const key of VALUE_KEYS) {
        const value = params[key];
        if (typeof value === "number" && Number.isFinite(value)) return value;
    }
    return undefined;
};

const send = (ga: GA, name: string, params: Params): void => {
    switch (name) {
        case "campaign_level_started":
            ga.addProgressionEvent(PROGRESSION.start, "campaign", part(params.level));
            return;
        case "campaign_level_finished":
            ga.addProgressionEvent(
                params.result === "win" ? PROGRESSION.complete : PROGRESSION.fail,
                "campaign", part(params.level), undefined, Number(params.stars) || 0,
            );
            return;
        case "daily_started":
            ga.addProgressionEvent(PROGRESSION.start, "daily", part(params.template));
            return;
        case "daily_finished":
            ga.addProgressionEvent(
                Number(params.stars) > 0 ? PROGRESSION.complete : PROGRESSION.fail,
                "daily", part(params.template), undefined, Number(params.stars) || 0,
            );
            return;
        case "skin_bought":
            if (Number(params.price) > 0) ga.addResourceEvent(RESOURCE_SINK, "coins", Number(params.price), "skin", part(params.skin));
            break;
        case "ad_rewarded_request": {
            const placement = part(params.placement);
            if (params.result === "rewarded") ga.addAdEvent(AD_ACTION.rewardReceived, AD_TYPE_REWARDED, "portal", placement);
            else if (params.result === "unavailable") ga.addAdEventWithNoAdReason(AD_ACTION.failedShow, AD_TYPE_REWARDED, "portal", placement, AD_ERROR_UNKNOWN);
            else ga.addAdEvent(AD_ACTION.show, AD_TYPE_REWARDED, "portal", placement);
            break;
        }
    }
    ga.addDesignEvent(designId(name, params), designValue(params));
};

let ga: GA | null = null;
let loading = false;
const queue: Array<[string, Params]> = [];

const load = (): void => {
    if (loading) return;
    loading = true;
    import("gameanalytics")
        .then((mod) => {
            const sdk = mod as unknown as { gameanalytics?: { GameAnalytics?: GA } };
            const GameAnalytics = sdk.gameanalytics?.GameAnalytics;
            if (!GameAnalytics) throw new Error("GameAnalytics SDK: клас не знайдено");
            const target = process.env.GAME_TARGET;
            const source = target ?? (window.location.pathname.startsWith("/embed") ? "embed" : "site");
            GameAnalytics.configureAvailableCustomDimensions01(SOURCES);
            GameAnalytics.configureAvailableResourceCurrencies(["coins"]);
            GameAnalytics.configureAvailableResourceItemTypes(["skin"]);
            GameAnalytics.initialize(gameKey, secretKey);
            if (SOURCES.includes(source)) GameAnalytics.setCustomDimension01(source);
            ga = GameAnalytics;
            queue.splice(0).forEach(([name, params]) => send(GameAnalytics, name, params));
        })
        .catch(() => {
            queue.length = 0;
        });
};

export const isGameAnalyticsConfigured = Boolean(gameKey && secretKey);

export const trackGameAnalytics = (name: string, params: Params = {}): void => {
    if (!isGameAnalyticsConfigured || typeof window === "undefined") return;
    try {
        if (ga) send(ga, name, params);
        else {
            queue.push([name, params]);
            load();
        }
    } catch {
        // аналітика ніколи не ламає гру
    }
};
