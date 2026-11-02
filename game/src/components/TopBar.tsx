"use client";
import React, { useContext, useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { gameButtonCss } from "@game/components/GameButton";
import { tipCss } from "@game/components/GameOptions";
import { Coin } from "@game/components/SkinShop";
import { FullscreenButton, SettingsButton } from "@game/components/SettingsPanel";
import { assetUrl } from "@game/lib/assets";
import { CAMPAIGN_LEVELS, totalStars, useCampaign } from "@game/lib/campaign";
import { currentStreak, useDailyState } from "@game/lib/daily";
import { AD_REWARD_COINS, useLastEarning, useWallet } from "@game/lib/wallet";
import { RewardedAdContext } from "@game/components/GameScreen";
import { RewardPopup, type RewardKind } from "@game/components/RewardPopup";
import { openPanel } from "@game/lib/ui";
import { useT } from "@game/lib/i18n";

// Верхній ряд меню: зірки кампанії, монети (з "+" - монети за рекламу), серія викликів дня (вогник),
// а біля правого краю - повний екран і шестерня налаштувань. Стоїть у потоці сторінки, над вмістом.
// Ширина - як у смуги над полем на екрані партії: на широкому екрані на всю ширину вікна.

const Bar = styled.header`
    position: relative;
    z-index: 30;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0;

    @media (min-width: 761px) {
        align-self: center;
        width: 100vw;
        padding: 10px 48px;
    }

    @media (min-width: 761px) and (max-width: 939px) {
        padding: 10px 24px;
    }

    /* Вузький екран: ряд ущільнений, щоб три плашки й шестерня вмістились без прокрутки. */
    @media (max-width: 420px) {
        gap: 5px;
    }
`;

// Розпірка: ресурси - біля правого краю.
const Spacer = styled.span`
    flex: 1 1 auto;
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
`;

// Під час партії - таб, з якого прийшли (натискання повертає туди), як у прототипі.
const CrumbSlot = styled.div`
    flex: 0 1 auto;
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

// Лічильники шапки - не кнопки, а втоплені плашки (кнопки тут лише "+"). Іконка велика й виступає
// за лівий край плашки; натискання все одно відкриває розділ лічильника.
const Pill = styled.button`
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 58px;
    height: 34px;
    margin-left: 20px;
    padding: 0 18px 0 0;
    border: none;
    border-radius: 12px;
    background: #efd9b0;
    box-shadow:
        inset 0 3px 4px rgba(92, 51, 23, 0.3),
        inset 0 -1px 0 rgba(255, 255, 255, 0.5),
        0 1px 0 rgba(255, 255, 255, 0.75);
    color: #6b4523;
    font: inherit;
    font-size: 15px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    cursor: pointer;

    & > svg {
        flex-shrink: 0;
        margin-left: -14px;
        filter: drop-shadow(0 2px 1px rgba(92, 51, 23, 0.3));
    }

    &:focus-visible {
        outline: 3px solid #1fb3d9;
        outline-offset: 2px;
    }

    /* Що означає лічильник - тултіп при наведенні чи фокусі.
       Плашки - біля лівого краю шапки, тож тултіп вирівняний по лівому краю (не виходить за екран). */
    ${tipCss}

    &::after {
        left: -14px;
        right: auto;
        transform: none;
    }

    @media (max-width: 420px) {
        min-width: 0;
        height: 32px;
        margin-left: 14px;
        padding-right: 14px;
        gap: 4px;

        & > svg {
            margin-left: -12px;
        }
    }
`;

// Плашка з кнопкою "+", що трохи заходить на її правий край.
const Stat = styled.span`
    position: relative;
    display: inline-flex;
    align-items: center;

    /* Наведена плашка лишається під своїм "+" (тултіп і так над усім). */
    ${Pill}:hover, ${Pill}:focus-visible {
        z-index: auto;
    }
`;

// Об'ємна зелена кнопка - та сама текстура, що в "Легкого" рівня бота (а не круглий значок, схожий на монету).
const PlusButton = styled.button`
    ${gameButtonCss("sm", { square: true, tone: "green" })}
    z-index: 1;
    margin-left: -8px;

    && {
        --gb-c: 8px;
        width: 28px;
        height: 28px;
        min-height: 28px;
    }

    ${tipCss}

    &::after {
        left: calc(-1 * var(--gb-c, 0px));
        right: auto;
        transform: none;
    }

    &:disabled {
        cursor: progress;
    }
`;

const PlusIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" aria-hidden="true" style={{ filter: "drop-shadow(0 1px 0 rgba(10, 50, 15, 0.6))" }}>
        <path d="M12 4v16M4 12h16" />
    </svg>
);

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

// Зірка займає ~3/4 свого viewBox, тож 36px - та сама видима висота, що в монети 28px і вогника 28px.
const StarIcon = ({ size = 36 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5l2.6 6.1 6.6.5-5 4.3 1.6 6.4L12 16.4 6.2 19.8l1.6-6.4-5-4.3 6.6-.5z" fill="#1fb3d9" stroke="#0f6f8c" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
);

// viewBox обрізаний по самому полум'ю: size - його справжня висота, як у монети й зірки того ж розміру.
export const Flame = ({ size = 22 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="4.5 1.5 15 16" fill="#e8662f" aria-hidden="true">
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
    // Вогник серії - на головну до картки виклику дня.
    onDaily: () => void;
    // Під час партії: назва таба, з якого прийшли, і повернення туди.
    crumb?: { label: string; onClick: () => void } | null;
    // Привітання головної й кампанії - між ресурсами й повним екраном (лише на широкому екрані).
    greeting?: React.ReactNode;
};

export const TopBar: React.FC<TopBarProps> = ({ onDaily, crumb, greeting }) => {
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

    // "+" біля кожної плашки - попап про цей ресурс і що за нього дасть реклама.
    const rewarded = useContext(RewardedAdContext);
    const [reward, setReward] = useState<RewardKind | null>(null);
    const PLUS_LABEL: Record<RewardKind, string> = {
        streak: t("rewardTitleStreak"),
        stars: t("rewardTitleStars"),
        coins: rewarded ? t("coinsForAd", { n: String(AD_REWARD_COINS) }) : t("rewardTitleCoins"),
    };
    const REWARD_ICON: Record<RewardKind, React.ReactNode> = { streak: <Flame size={40} />, stars: <StarIcon size={50} />, coins: <Coin size={40} /> };
    const plus = (kind: RewardKind) => (
        <PlusButton type="button" onClick={() => setReward(kind)} aria-label={PLUS_LABEL[kind]} data-tip={PLUS_LABEL[kind]}>
            <PlusIcon />
        </PlusButton>
    );

    return (
        <Bar>
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
            {/* Ліворуч - повний екран і налаштування, далі заголовок сторінки; ресурси - біля правого краю. */}
            <FullscreenButton />
            <SettingsButton inline />
            {greeting}
            <Spacer />
            <Stat>
                <Pill type="button" onClick={onDaily} aria-label={t("streakOpen", { n: String(streak) })} data-tip={t("tipStreak", { n: String(streak) })}>
                    <Flame size={28} />
                    <span>{streak}</span>
                </Pill>
                {plus("streak")}
            </Stat>
            <Stat>
                <Pill
                    type="button"
                    onClick={() => openPanel("campaign")}
                    aria-label={t("campaignOpen", { n: String(stars), total: String(CAMPAIGN_LEVELS.length * 3) })}
                    data-tip={t("tipStars", { n: String(stars), total: String(CAMPAIGN_LEVELS.length * 3) })}
                >
                    <StarIcon />
                    <span>{stars}</span>
                </Pill>
                {plus("stars")}
            </Stat>
            <Stat>
                <Pill type="button" onClick={() => openPanel("shop")} aria-label={t("shopOpen", { n: String(wallet.coins) })} data-tip={t("tipCoins")}>
                    <Coin size={28} />
                    <span>{wallet.coins}</span>
                    {bubble !== null && <EarnBubble aria-hidden="true">+{bubble}</EarnBubble>}
                </Pill>
                {plus("coins")}
            </Stat>
            {reward && <RewardPopup kind={reward} icon={REWARD_ICON[reward]} onRewardedAd={rewarded} onClose={() => setReward(null)} />}
        </Bar>
    );
};
