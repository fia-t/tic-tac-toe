"use client";
import React, { useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { IconClose } from "@game/components/GameIcons";
import { Overlay } from "@game/components/gameStyles";
import { ModalCard, ModalCloseButton, ModalTitle, PillButton } from "@game/components/onlineStyles";
import { InfoPill } from "@game/components/pageStyles";
import { Star } from "@game/components/DailyChallenge";
import { AD_REWARD_COINS, earnCoins, useWallet } from "@game/lib/wallet";
import { CAMPAIGN_LEVELS, recordLevelStars, starBoostTarget, totalStars, useCampaign } from "@game/lib/campaign";
import { MAX_STREAK_SHIELDS, addStreakShield, currentStreak, useDailyState } from "@game/lib/daily";
import { useT } from "@game/lib/i18n";

// Попап "+" біля вогника, зірок і монет у шапці: що це за ресурс, скільки його є й що дасть
// реклама за винагороду. За рекламу (найвигідніше для гравця й не ламає прогрес):
// - вогник: +1 захист серії (рятує серію за пропущений день), максимум MAX_STREAK_SHIELDS;
// - зірки: +1 зірка на пройденому рівні кампанії з найменшою кількістю зірок (не відкриває нових рівнів);
// - монети: +AD_REWARD_COINS (≈ дві перемоги над Майстром, шоста частина ціни скіна).
// Поки реклами немає (сайт, портал без модуля ad) - лише пояснення.

export type RewardKind = "stars" | "coins" | "streak";

// Над нижнім меню (z-index 1400).
const Dim = styled(Overlay)`
    z-index: 1500;
`;

const Card = styled(ModalCard)`
    z-index: 1501;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const Head = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding-right: 36px;

    & > svg {
        flex-shrink: 0;
        filter: drop-shadow(0 2px 2px rgba(92, 51, 23, 0.3));
    }

    h2 {
        margin: 0;
    }
`;

const About = styled.p`
    margin: 0;
    color: #6b4a2a;
    font-size: 15px;
    line-height: 1.4;
`;

const Gain = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px;
    border-radius: 16px;
    background: rgba(47, 138, 62, 0.1);
    color: #2f8a3e;
    font: 700 20px/1.2 var(--font-heading);
    text-align: center;
`;

const Note = styled.p`
    margin: 0;
    color: #8a6a45;
    font-size: 14px;
    text-align: center;
`;

// Зірки рівня до й після реклами: нова зірка трохи більша.
const LevelStars = ({ from, to }: { from: number; to: number }) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }} aria-hidden="true">
        {[0, 1, 2].map((i) => (
            <Star key={i} on={i < to} size={i >= from && i < to ? 28 : 22} />
        ))}
    </span>
);

export const RewardPopup: React.FC<{ kind: RewardKind; icon: React.ReactNode; onRewardedAd?: () => Promise<boolean>; onClose: () => void }> = ({
    kind,
    icon,
    onRewardedAd,
    onClose,
}) => {
    const t = useT();
    const wallet = useWallet();
    const campaign = useCampaign();
    const daily = useDailyState();
    const [watching, setWatching] = useState(false);

    const target = starBoostTarget(campaign);
    const shields = daily.shields ?? 0;
    const content = {
        coins: {
            title: t("rewardTitleCoins"),
            about: t("rewardAboutCoins"),
            have: t("rewardHaveCoins", { n: String(wallet.coins) }),
            gain: t("rewardCoins", { n: String(AD_REWARD_COINS) }),
            blocked: null,
            grant: () => earnCoins(AD_REWARD_COINS),
        },
        stars: {
            title: t("rewardTitleStars"),
            about: t("rewardAboutStars"),
            have: t("rewardHaveStars", { n: String(totalStars(campaign)), total: String(CAMPAIGN_LEVELS.length * 3) }),
            gain: target && (
                <>
                    {t("rewardStarLevel", { n: String(target.index + 1) })}
                    <LevelStars from={target.stars} to={target.stars + 1} />
                </>
            ),
            blocked: target ? null : totalStars(campaign) > 0 ? t("rewardNoStarTarget") : t("rewardNoStarYet"),
            grant: () => {
                if (target) recordLevelStars(target.level.id, target.stars + 1);
            },
        },
        streak: {
            title: t("rewardTitleStreak"),
            about: t("rewardAboutStreak"),
            have: t("rewardHaveStreak", { n: String(currentStreak(daily)), k: String(shields), max: String(MAX_STREAK_SHIELDS) }),
            gain: t("rewardShield"),
            blocked: shields >= MAX_STREAK_SHIELDS ? t("rewardShieldsFull") : null,
            grant: () => {
                addStreakShield();
            },
        },
    }[kind];
    const canWatch = Boolean(onRewardedAd) && !content.blocked;

    const watch = async () => {
        if (!onRewardedAd) return;
        setWatching(true);
        try {
            if (await onRewardedAd()) {
                content.grant();
                onClose();
            }
        } finally {
            setWatching(false);
        }
    };

    // Портал у body: шапка - свій шар (z-index), нижнє меню інакше лягало б поверх затемнення.
    return createPortal(
        <>
            <Dim onClick={onClose} />
            <Card role="dialog" aria-modal="true" aria-labelledby="reward-title">
                <ModalCloseButton onClick={onClose} aria-label={t("close")}>
                    <IconClose size={16} />
                </ModalCloseButton>
                <Head>
                    {icon}
                    <ModalTitle id="reward-title">{content.title}</ModalTitle>
                </Head>
                <About>{content.about}</About>
                <InfoPill style={{ alignSelf: "flex-start" }}>{content.have}</InfoPill>
                {content.blocked ? <Note>{content.blocked}</Note> : <Gain>{content.gain}</Gain>}
                {!content.blocked && !onRewardedAd && <Note>{t("rewardSoon")}</Note>}
                {canWatch ? (
                    <PillButton type="button" onClick={() => void watch()} disabled={watching} autoFocus>
                        {t("rewardWatch")}
                    </PillButton>
                ) : (
                    <PillButton type="button" onClick={onClose} autoFocus>
                        {t("close")}
                    </PillButton>
                )}
            </Card>
        </>,
        document.body
    );
};
