"use client";
import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { gameButtonCss } from "@game/components/GameButton";
import { Coin } from "@game/components/SkinShop";
import { SettingsButton } from "@game/components/SettingsPanel";
import { assetUrl } from "@game/lib/assets";
import { CAMPAIGN_LEVELS, totalStars, useCampaign } from "@game/lib/campaign";
import { currentStreak, useDailyState } from "@game/lib/daily";
import { useLastEarning, useWallet } from "@game/lib/wallet";
import { openPanel } from "@game/lib/ui";
import { useT } from "@game/lib/i18n";

// Верхній ряд (як у прототипі): логотип із назвою - "На головну", зірки кампанії, монети,
// серія викликів дня (вогник) і шестерня налаштувань. Стоїть у потоці сторінки, над вмістом.

const Bar = styled.header`
    position: relative;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0;

    /* Вузький екран: ряд ущільнений, щоб логотип, три плашки й шестерня вмістились без прокрутки. */
    @media (max-width: 420px) {
        gap: 5px;
    }
`;

const Brand = styled.button`
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 44px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    color: inherit;
    font: inherit;

    img {
        width: 44px;
        height: 44px;
        flex-shrink: 0;
        transition: transform 0.12s ease;
    }

    span {
        flex: 1;
        min-width: 0;
        font: 700 18px/1 var(--font-heading);
        color: #5c3317;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    @media (hover: hover) {
        &:hover img {
            transform: translateY(-1px) rotate(-4deg);
        }
    }

    &:focus-visible {
        outline: 3px solid #1fb3d9;
        outline-offset: 3px;
        border-radius: 12px;
    }

    /* На вузькому екрані - лише логотип: назва розсувала б верхній ряд. */
    @media (max-width: 420px) {
        min-width: 38px;

        img {
            width: 38px;
            height: 38px;
        }

        span {
            display: none;
        }
    }
`;

// Кнопки шапки - стриманіші (38 px), щоб не перетягували увагу з гри.
const Pill = styled.button`
    ${gameButtonCss("sm")}
    font-variant-numeric: tabular-nums;
    color: #7a5530;

    /* && - сильніше за мобільні розміри gameButtonCss (вони в @media). */
    && {
        --gb-c: 12px;
        height: 38px;
        min-height: 38px;
        padding: 0 2px;
        gap: 5px;
        font-size: 14px;
    }

    svg {
        flex-shrink: 0;
    }

    @media (max-width: 420px) {
        && {
            --gb-c: 11px;
            height: 40px;
            min-height: 40px;
            padding: 0 3px;
            gap: 4px;
        }
    }
`;

const rise = keyframes`
    0% { opacity: 0; transform: translateY(4px); }
    15% { opacity: 1; transform: translateY(0); }
    80% { opacity: 1; transform: translateY(-6px); }
    100% { opacity: 0; transform: translateY(-12px); }
`;

// "+N" біля монет на кожне нарахування.
const EarnBubble = styled.span`
    position: absolute;
    left: 50%;
    top: calc(100% + 6px);
    transform: translateX(-50%);
    padding: 2px 8px;
    border-radius: 999px;
    background: #2f8a3e;
    color: #ffffff;
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;
    pointer-events: none;
    animation: ${rise} 1.8s ease-out forwards;
`;

const StarIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5l2.6 6.1 6.6.5-5 4.3 1.6 6.4L12 16.4 6.2 19.8l1.6-6.4-5-4.3 6.6-.5z" fill="#1fb3d9" stroke="#0f6f8c" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
);

// Полум'я тонше за зірку й монету - тож, щоб візуально були однакові, вогник трохи більший.
export const Flame = ({ size = 22 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#e8662f" aria-hidden="true">
        <path d="M12 2c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5.5 1-8.5z" />
    </svg>
);

// Шапка екрана онлайн-кімнати: той самий логотип ("На головну" - вихід із кімнати) і шестерня,
// без плашок зірок, монет і серії (їхні розділи живуть у меню гри, а не в кімнаті).
export const RoomTopBar: React.FC<{ onHome: () => void }> = ({ onHome }) => {
    const t = useT();
    return (
        <Bar>
            <Brand type="button" onClick={onHome} aria-label={t("nav_home")} title={t("nav_home")}>
                <img src={assetUrl("images/logo.png")} alt="" />
                <span>Tic Tac Toe</span>
            </Brand>
            <SettingsButton inline />
        </Bar>
    );
};

type TopBarProps = {
    // Логотип: у грі - вихід у меню, у меню - на головну (вгору).
    onHome: () => void;
    // Вогник серії - на головну до картки виклику дня.
    onDaily: () => void;
};

export const TopBar: React.FC<TopBarProps> = ({ onHome, onDaily }) => {
    const t = useT();
    const campaign = useCampaign();
    const wallet = useWallet();
    const daily = useDailyState();
    const earning = useLastEarning();
    const [bubble, setBubble] = useState<number | null>(null);

    useEffect(() => {
        if (!earning || Date.now() - earning.at > 2000) return;
        setBubble(earning.amount);
        const timer = setTimeout(() => setBubble(null), 1800);
        return () => clearTimeout(timer);
    }, [earning]);

    const stars = totalStars(campaign);
    const streak = currentStreak(daily);

    return (
        <Bar>
            <Brand type="button" onClick={onHome} aria-label={t("nav_home")} title={t("nav_home")}>
                <img src={assetUrl("images/logo.png")} alt="" />
                <span>Tic Tac Toe</span>
            </Brand>
            <Pill
                type="button"
                onClick={() => openPanel("campaign")}
                aria-label={t("campaignOpen", { n: String(stars), total: String(CAMPAIGN_LEVELS.length * 3) })}
                title={t("campaignTitle")}
            >
                <StarIcon />
                <span>{stars}</span>
            </Pill>
            <Pill type="button" onClick={() => openPanel("shop")} aria-label={t("shopOpen", { n: String(wallet.coins) })} title={t("shopTitle")}>
                <Coin size={17} />
                <span>{wallet.coins}</span>
                {bubble !== null && <EarnBubble aria-hidden="true">+{bubble}</EarnBubble>}
            </Pill>
            <Pill type="button" onClick={onDaily} aria-label={t("streakOpen", { n: String(streak) })} title={t("streakTitle")}>
                <Flame />
                <span>{streak}</span>
            </Pill>
            <SettingsButton inline />
        </Bar>
    );
};
