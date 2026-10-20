"use client";
import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { gameButtonCss } from "@game/components/GameButton";
import { tipCss } from "@game/components/GameOptions";
import { Coin } from "@game/components/SkinShop";
import { FullscreenButton, SettingsButton } from "@game/components/SettingsPanel";
import { assetUrl } from "@game/lib/assets";
import { CAMPAIGN_LEVELS, totalStars, useCampaign } from "@game/lib/campaign";
import { currentStreak, useDailyState } from "@game/lib/daily";
import { useLastEarning, useWallet } from "@game/lib/wallet";
import { openPanel } from "@game/lib/ui";
import { useT } from "@game/lib/i18n";

// Верхній ряд (як у прототипі): логотип із назвою - "На головну", зірки кампанії, монети,
// серія викликів дня (вогник), повний екран і шестерня налаштувань. Стоїть у потоці сторінки, над вмістом.

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

const Brand = styled.button<{ $compact?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    flex: ${({ $compact }) => ($compact ? "0 1 auto" : "1")};
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

    /* Назва гри у два рядки: "Tic Tac Toe" і менше бірюзове "Beach Battle". */
    span {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        min-width: 0;
    }

    b,
    small {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    b {
        font: 700 18px/1 var(--font-heading);
        color: #5c3317;
    }

    small {
        font: 700 13px/1 var(--font-heading);
        color: #1c97b8;
        letter-spacing: 0.02em;
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

    /* Під час партії на вузькому екрані місце між назвою й плашками - для "Назад до ..." без логотипа. */
    @media (max-width: 420px) {
        ${({ $compact }) => ($compact ? "display: none;" : "")}
    }
`;

// Під час партії - таб, з якого прийшли (натискання повертає туди), як у прототипі.
const CrumbSlot = styled.div`
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
`;

const Crumb = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    max-width: 100%;
    min-width: 0;
    min-height: 34px;
    padding: 0 12px 0 8px;
    border: none;
    border-radius: 999px;
    background: rgba(255, 247, 232, 0.72);
    box-shadow: inset 0 0 0 1.5px rgba(139, 101, 60, 0.22);
    color: #0f6f8c;
    font: 800 15px/1 var(--font-body);
    cursor: pointer;
    white-space: nowrap;

    span {
        overflow: hidden;
        text-overflow: ellipsis;
    }

    svg {
        flex-shrink: 0;
    }

    @media (hover: hover) {
        &:hover {
            background: #fff7e8;
            color: #0a5068;
        }
    }

    &:focus-visible {
        outline: 3px solid #1fb3d9;
        outline-offset: 2px;
    }

    /* На телефоні - лише стрілка: назва табу обрізалась би ("Challe..."); повна - в aria-label. */
    @media (max-width: 420px) {
        padding: 0 10px;
        min-height: 36px;

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

    /* Що означає лічильник - тултіп при наведенні чи фокусі (натискання відкриває його розділ).
       Вирівняний по правому краю кнопки, щоб біля краю екрана не виходив за нього. */
    ${tipCss}

    &::after {
        left: auto;
        right: calc(-1 * var(--gb-c, 0px));
        transform: none;
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

export const GAME_TITLE = "Tic Tac Toe Beach Battle";

const BrandName = () => (
    <span>
        <b>Tic Tac Toe</b>
        <small>Beach Battle</small>
    </span>
);

// Шапка екрана онлайн-кімнати: той самий логотип ("На головну" - вихід із кімнати) і шестерня,
// без плашок зірок, монет і серії (їхні розділи живуть у меню гри, а не в кімнаті).
export const RoomTopBar: React.FC<{ onHome: () => void }> = ({ onHome }) => {
    const t = useT();
    return (
        <Bar>
            <Brand type="button" onClick={onHome} aria-label={t("nav_home")} title={t("nav_home")}>
                <img src={assetUrl("images/logo.png")} alt="" />
                <BrandName />
            </Brand>
            <FullscreenButton />
            <SettingsButton inline />
        </Bar>
    );
};

type TopBarProps = {
    // Логотип: у грі - вихід у меню, у меню - на головну (вгору).
    onHome: () => void;
    // Вогник серії - на головну до картки виклику дня.
    onDaily: () => void;
    // Під час партії: назва таба, з якого прийшли, і повернення туди.
    crumb?: { label: string; onClick: () => void } | null;
};

export const TopBar: React.FC<TopBarProps> = ({ onHome, onDaily, crumb }) => {
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
            <Brand type="button" data-tour="menu" $compact={Boolean(crumb)} onClick={onHome} aria-label={t("nav_home")} title={t("nav_home")}>
                <img src={assetUrl("images/logo.png")} alt="" />
                <BrandName />
            </Brand>
            {crumb && (
                <CrumbSlot>
                    <Crumb type="button" onClick={crumb.onClick} aria-label={`${t("back")}: ${crumb.label}`} title={`${t("back")}: ${crumb.label}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M15 5l-7 7 7 7" />
                        </svg>
                        <span>{crumb.label}</span>
                    </Crumb>
                </CrumbSlot>
            )}
            <Pill
                type="button"
                onClick={() => openPanel("campaign")}
                aria-label={t("campaignOpen", { n: String(stars), total: String(CAMPAIGN_LEVELS.length * 3) })}
                data-tip={t("tipStars", { n: String(stars), total: String(CAMPAIGN_LEVELS.length * 3) })}
            >
                <StarIcon />
                <span>{stars}</span>
            </Pill>
            <Pill type="button" onClick={() => openPanel("shop")} aria-label={t("shopOpen", { n: String(wallet.coins) })} data-tip={t("tipCoins")}>
                <Coin size={17} />
                <span>{wallet.coins}</span>
                {bubble !== null && <EarnBubble aria-hidden="true">+{bubble}</EarnBubble>}
            </Pill>
            <Pill type="button" onClick={onDaily} aria-label={t("streakOpen", { n: String(streak) })} data-tip={t("tipStreak", { n: String(streak) })}>
                <Flame />
                <span>{streak}</span>
            </Pill>
            <FullscreenButton />
            <SettingsButton inline />
        </Bar>
    );
};
