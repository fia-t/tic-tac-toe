"use client";
import React, { useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { IconClose } from "@game/components/GameIcons";
import { Overlay } from "@game/components/gameStyles";
import { ModalCard, ModalCloseButton, ModalTitle, PillButton } from "@game/components/onlineStyles";
import { AD_REWARD_COINS, earnCoins } from "@game/lib/wallet";
import { useT } from "@game/lib/i18n";

// Попап "+" біля зірок, монет і вогника в шапці: місце під rewarded-рекламу, за перегляд - +50 монет.
// Поки реклами немає (сайт, портал) - заглушка; на CrazyGames і Poki відео показує SDK, монети вже нараховуються.

// Над нижнім меню (z-index 1400).
const Dim = styled(Overlay)`
    z-index: 1500;
`;

const Card = styled(ModalCard)`
    z-index: 1501;
`;

const AdSlot = styled.div`
    display: grid;
    place-items: center;
    align-content: center;
    gap: 8px;
    aspect-ratio: 16 / 9;
    margin-bottom: 14px;
    padding: 12px;
    border: 2px dashed rgba(139, 101, 60, 0.45);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.45);
    color: #8a6a45;
    font-size: 15px;
    text-align: center;
`;

const PlayIcon = () => (
    <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="rgba(139, 101, 60, 0.2)" />
        <path d="M10 8l6 4-6 4z" fill="#8a6a45" />
    </svg>
);

const Reward = styled.p`
    margin: 0 0 16px;
    color: #2f8a3e;
    font: 700 20px/1.2 var(--font-heading);
    text-align: center;
`;

export const RewardPopup: React.FC<{ onRewardedAd?: () => Promise<boolean>; onClose: () => void }> = ({ onRewardedAd, onClose }) => {
    const t = useT();
    const [watching, setWatching] = useState(false);

    const watch = async () => {
        if (!onRewardedAd) return;
        setWatching(true);
        try {
            if (await onRewardedAd()) {
                earnCoins(AD_REWARD_COINS);
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
                <ModalTitle id="reward-title">{t("rewardTitle")}</ModalTitle>
                {/* Сюди піде рекламне відео, коли підключимо rewarded-рекламу на сайті й порталі. */}
                <AdSlot>
                    <PlayIcon />
                    <span>{t("rewardSoon")}</span>
                </AdSlot>
                <Reward>{t("rewardCoins", { n: String(AD_REWARD_COINS) })}</Reward>
                {onRewardedAd ? (
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
