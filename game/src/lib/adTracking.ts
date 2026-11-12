import { trackEvent } from "@game/lib/firebase";

// Аналітика реклами за винагороду: де її попросили (placement) і чим закінчилось.
// showRewardedAd віддає лише true/false - чому "ні", повідомляє сам SDK через reportAdOutcome
// (портал розрізняє помилку реклами й недодивлену). Інші SDK цього не вміють - тоді "not_finished".

export type AdOutcome = "rewarded" | "not_finished" | "unavailable";
export type AdPlacement =
    | "skin_trial"
    | "coins"
    | "stars"
    | "streak"
    | "gift_double"
    | "win_double"
    | "booster"
    | "friend_game";

let lastOutcome: AdOutcome | null = null;

export const reportAdOutcome = (outcome: AdOutcome): void => {
    lastOutcome = outcome;
};

export const watchRewardedAd = async (
    placement: AdPlacement,
    show: () => Promise<boolean>,
    extra?: Record<string, unknown>,
): Promise<boolean> => {
    lastOutcome = null;
    const rewarded = await show();
    trackEvent("ad_rewarded_request", {
        placement,
        result: rewarded ? "rewarded" : (lastOutcome ?? "not_finished"),
        ...extra,
    });
    return rewarded;
};
