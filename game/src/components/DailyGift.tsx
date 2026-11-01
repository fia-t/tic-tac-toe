"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styled, { css, keyframes } from "styled-components";
import { IconClose } from "@game/components/GameIcons";
import { Overlay, boardTile, hintedCell } from "@game/components/gameStyles";
import { ModalCloseButton } from "@game/components/onlineStyles";
import { GameButton } from "@game/components/GameButton";
import { Coin } from "@game/components/SkinShop";
import { Flame } from "@game/components/TopBar";
import { assetUrl } from "@game/lib/assets";
import { useT } from "@game/lib/i18n";
import { SHOP_THEMES, Theme, skinPrice, themeName } from "@game/lib/themes";
import { MAX_STREAK_SHIELDS, addStreakShield, todayKey, useDailyState } from "@game/lib/daily";
import { GIFT_DAYS, WalletState, earnCoins, giftStatus, grantSkin, markGiftClaimed, startSkinTrial, useWallet } from "@game/lib/wallet";

// Подарунок дня - після завантаження гри, раз на день. Тиждень подарунків на піщаному полі "Класики":
// забраний день закреслюється хрестиком, з кутів картки визирають фішки X і O. Подарунки:
// монети, захист серії вогника, пробний скін і на 7-й день - скін назавжди. Якщо подарунок
// уже не має сенсу (захистів максимум, усі скіни є) - замість нього монети.
// За рекламу (де вона є) - подвійний подарунок.

type Gift =
    | { kind: "coins"; n: number }
    | { kind: "shield"; n: number }
    | { kind: "trial"; skin: Theme; hours: number }
    | { kind: "skin"; skin: Theme; bonus: number };

const PLAN: ({ kind: "coins"; n: number } | { kind: "shield" | "trial" | "skin"; fallback: number })[] = [
    { kind: "coins", n: 50 },
    { kind: "shield", fallback: 75 },
    { kind: "coins", n: 100 },
    { kind: "trial", fallback: 100 },
    { kind: "coins", n: 150 },
    { kind: "coins", n: 200 },
    { kind: "skin", fallback: 300 },
];
const TRIAL_GIFT_HOURS = 24;
// За рекламу на 7-й день (скін не подвоїш) - ще й монети.
const SKIN_AD_BONUS = 150;

const notOwned = (wallet: WalletState) => SHOP_THEMES.filter((skin) => !wallet.owned.includes(skin.id));

const giftFor = (day: number, wallet: WalletState, shields: number): Gift => {
    const plan = PLAN[day];
    if (plan.kind === "coins") return plan;
    const free = notOwned(wallet);
    if (plan.kind === "shield") return shields < MAX_STREAK_SHIELDS ? { kind: "shield", n: 1 } : { kind: "coins", n: plan.fallback };
    // Пробний - найдорожчий скін, якого ще немає (покуштувати "преміум"); назавжди - перший за порядком
    // магазину (спершу скіни-предмети).
    if (plan.kind === "trial") {
        const skin = [...free].sort((a, b) => skinPrice(b) - skinPrice(a))[0];
        return skin ? { kind: "trial", skin, hours: TRIAL_GIFT_HOURS } : { kind: "coins", n: plan.fallback };
    }
    const skin = free[0];
    return skin ? { kind: "skin", skin, bonus: SKIN_AD_BONUS } : { kind: "coins", n: plan.fallback };
};

const grant = (gift: Gift, doubled: boolean) => {
    if (gift.kind === "coins") earnCoins(doubled ? gift.n * 2 : gift.n);
    else if (gift.kind === "shield") {
        addStreakShield();
        if (doubled) addStreakShield();
    } else if (gift.kind === "trial") startSkinTrial(gift.skin.id, doubled ? gift.hours * 2 : gift.hours);
    else {
        grantSkin(gift.skin.id);
        if (doubled) earnCoins(gift.bonus);
    }
};

// --- вигляд ---

const pop = keyframes`
    from { opacity: 0; transform: scale(0.92) translateY(10px); }
    to { opacity: 1; transform: none; }
`;

const stamp = keyframes`
    0% { opacity: 0; transform: scale(2.2) rotate(-25deg); }
    70% { opacity: 1; transform: scale(0.92) rotate(4deg); }
    100% { opacity: 1; transform: none; }
`;

const Dim = styled(Overlay)`
    z-index: 1500;
`;

// Картка - саме ігрове поле: кремовий обідок, як у дошки, і піщаний фон "Класики".
const Board = styled.div`
    position: fixed;
    inset: 0;
    z-index: 1501;
    margin: auto;
    width: min(92vw, 540px);
    height: fit-content;
    max-height: calc(100dvh - 60px);
    box-sizing: border-box;
    padding: 22px 18px 18px;
    border: 8px solid transparent;
    border-radius: 30px;
    background:
        url("${assetUrl("images/themes/classic-board.svg")}") center / cover no-repeat padding-box,
        linear-gradient(180deg, #fff3dd 0%, #f6e2b8 45%, #e8c992 100%) border-box;
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.7),
        0 4px 0 #dcbc86,
        0 24px 50px rgba(60, 30, 5, 0.45);
    color: #4a2c0c;
    font: 500 15px/1.35 var(--font-body);
    animation: ${pop} 0.25s ease-out;

    @media (max-width: 480px) {
        padding: 18px 12px 12px;
    }
`;

// Фішки X і O, що визирають з-за верхніх кутів поля.
const Peek = styled.img<{ $side: "left" | "right" }>`
    position: absolute;
    top: -46px;
    width: 84px;
    height: 84px;
    pointer-events: none;
    ${({ $side }) => ($side === "left" ? "left: 18px; transform: rotate(-14deg);" : "right: 64px; transform: rotate(12deg);")}

    @media (max-width: 480px) {
        top: -36px;
        width: 64px;
        height: 64px;
    }
`;

const Head = styled.div`
    position: relative;
    text-align: center;
    padding: 0 40px;

    h2 {
        margin: 0;
        font: 800 28px/1.1 var(--font-heading);
        color: #5b3413;
        text-shadow: 0 2px 0 rgba(255, 255, 255, 0.7);
    }

    p {
        margin: 6px 0 0;
        font-size: 14px;
        color: #7a5226;
    }

    @media (max-width: 480px) {
        padding: 0 34px;

        h2 {
            font-size: 23px;
        }
    }
`;

const Close = styled(ModalCloseButton)`
    top: 10px;
    right: 10px;
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin: 16px 0;

    @media (max-width: 480px) {
        gap: 7px;
        margin: 12px 0;
    }
`;

const Tile = styled.div<{ $state: "done" | "today" | "next"; $wide?: boolean }>`
    ${boardTile}
    position: relative;
    display: flex;
    flex-direction: ${({ $wide }) => ($wide ? "row" : "column")};
    align-items: center;
    justify-content: center;
    gap: ${({ $wide }) => ($wide ? "14px" : "3px")};
    min-height: ${({ $wide }) => ($wide ? "92px" : "104px")};
    padding: 8px 6px;
    text-align: center;
    ${({ $wide }) => $wide && "grid-column: 1 / -1;"}
    ${({ $state }) => $state === "today" && hintedCell}
    ${({ $state }) =>
        $state === "today" &&
        css`
            background: rgba(255, 236, 170, 0.55);
        `}

    @media (hover: hover) {
        &:hover {
            background: ${({ $state }) => ($state === "today" ? "rgba(255, 236, 170, 0.55)" : "rgba(255, 255, 255, 0.18)")};
        }
    }

    @media (max-width: 480px) {
        min-height: ${({ $wide }) => ($wide ? "80px" : "90px")};
    }
`;

const DayLabel = styled.span`
    font: 800 14px/1 var(--font-heading);
    color: #6b4318;
`;

const Amount = styled.span<{ $today?: boolean }>`
    font: 800 15px/1.1 var(--font-heading);
    color: ${({ $today }) => ($today ? "#2f8a3e" : "#5b3413")};
`;

const Faded = styled.div<{ $done: boolean }>`
    display: contents;

    & > * {
        opacity: ${({ $done }) => ($done ? 0.45 : 1)};
    }
`;

// Забраний день - хрестик "Класики" поверх клітинки, як хід на полі.
const Mark = styled.img<{ $fresh: boolean }>`
    position: absolute;
    inset: 0;
    margin: auto;
    width: min(78%, 82px);
    height: auto;
    pointer-events: none;
    ${({ $fresh }) =>
        $fresh &&
        css`
            animation: ${stamp} 0.45s ease-out both;
        `}
`;

const SkinPeek = styled.span`
    display: inline-flex;
    gap: 2px;

    img {
        width: 38px;
        height: 38px;
    }
`;

const SkinBoard = styled.span<{ $bg: string }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 4px 8px;
    border-radius: 12px;
    background: url("${({ $bg }) => $bg}") center / cover;
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.6);

    img {
        width: 40px;
        height: 40px;
    }
`;

const WideText = styled.span`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    text-align: left;
`;

const Buttons = styled.div<{ $two: boolean }>`
    display: grid;
    grid-template-columns: ${({ $two }) => ($two ? "1fr 1fr" : "1fr")};
    gap: 10px;
`;

// Щит із вогником - захист серії.
const ShieldIcon = ({ size = 40 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 3 L35 8 V19 C35 28 28 34 20 37 C12 34 5 28 5 19 V8Z" fill="#3a9fd8" stroke="#1d6a9a" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M20 6.5 L32 10.5 V19 C32 26 26.5 31 20 33.6Z" fill="#ffffff" fillOpacity="0.18" />
        <g transform="translate(10.5 9) scale(0.95)">
            <Flame size={20} />
        </g>
    </svg>
);

const AdIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
        <rect x="2" y="4" width="20" height="16" rx="5" fill="#1f8fe0" stroke="#fff" strokeWidth="1.6" />
        <path d="M10 8.5v7l6-3.5z" fill="#fff" />
    </svg>
);

export const DailyGift: React.FC<{ onRewardedAd?: () => Promise<boolean>; onClose: () => void }> = ({ onRewardedAd, onClose }) => {
    const t = useT();
    const wallet = useWallet();
    const daily = useDailyState();
    const [today] = useState(todayKey);
    // Що вже забрано в цьому вікні: день із хрестиком, що "падає", і закриття за мить.
    const [claimed, setClaimed] = useState<number | null>(null);
    const [watching, setWatching] = useState(false);
    const status = giftStatus(today, wallet);
    const day = claimed ?? status.day;
    const shields = daily.shields ?? 0;
    const gifts = Array.from({ length: GIFT_DAYS }, (_, i) => giftFor(i, wallet, shields));
    // Подарунок сьогодні фіксуємо до видачі: після grantSkin "найдешевший скін без власника" вже інший.
    const [todayGift] = useState(() => gifts[status.day]);

    useEffect(() => {
        if (claimed === null) return;
        const timer = setTimeout(onClose, 1300);
        return () => clearTimeout(timer);
    }, [claimed, onClose]);

    const claim = (doubled: boolean) => {
        if (claimed !== null) return;
        grant(todayGift, doubled);
        markGiftClaimed(today);
        setClaimed(status.day);
    };

    const watch = async () => {
        if (!onRewardedAd || watching) return;
        setWatching(true);
        try {
            if (await onRewardedAd()) claim(true);
        } finally {
            setWatching(false);
        }
    };

    const label = (gift: Gift): string =>
        gift.kind === "coins"
            ? `+${gift.n}`
            : gift.kind === "shield"
            ? t("giftShield")
            : gift.kind === "trial"
            ? t("giftTrial", { h: String(gift.hours) })
            : t("giftSkin");

    const icon = (gift: Gift) =>
        gift.kind === "coins" ? (
            <Coin size={gift.n >= 150 ? 44 : 38} />
        ) : gift.kind === "shield" ? (
            <ShieldIcon size={42} />
        ) : (
            <SkinPeek>
                <img src={gift.skin.xMarkerUrl} alt="" />
                <img src={gift.skin.oMarkerUrl} alt="" />
            </SkinPeek>
        );

    const tileState = (i: number): "done" | "today" | "next" =>
        claimed !== null ? (i <= claimed ? "done" : "next") : i < day ? "done" : i === day ? "today" : "next";

    return createPortal(
        <>
            <Dim onClick={onClose} />
            <Board role="dialog" aria-modal="true" aria-labelledby="gift-title">
                <Peek $side="left" src={assetUrl("images/themes/classic-x.svg")} alt="" />
                <Peek $side="right" src={assetUrl("images/themes/classic-o.svg")} alt="" />
                <Close onClick={onClose} aria-label={t("close")}>
                    <IconClose size={16} />
                </Close>
                <Head>
                    <h2 id="gift-title">{t("giftTitle")}</h2>
                    <p>{t("giftHint")}</p>
                </Head>
                <Grid>
                    {gifts.map((gift, i) => {
                        const state = tileState(i);
                        const shown = i === status.day ? todayGift : gift;
                        const last = i === GIFT_DAYS - 1;
                        const mark = state === "done" && <Mark $fresh={i === claimed} src={assetUrl("images/themes/classic-x.svg")} alt="" />;
                        if (last && shown.kind === "skin") {
                            return (
                                <Tile key={i} $state={state} $wide>
                                    <Faded $done={state === "done"}>
                                        <SkinBoard $bg={shown.skin.backgroundUrl}>
                                            <img src={shown.skin.xMarkerUrl} alt="" />
                                            <img src={shown.skin.oMarkerUrl} alt="" />
                                        </SkinBoard>
                                        <WideText>
                                            <DayLabel>{state === "today" ? t("giftToday") : t("giftDay", { n: String(i + 1) })}</DayLabel>
                                            <Amount $today={state === "today"}>{themeName(shown.skin)}</Amount>
                                            <span style={{ fontSize: 13, color: "#7a5226" }}>{t("giftSkin")}</span>
                                        </WideText>
                                    </Faded>
                                    {mark}
                                </Tile>
                            );
                        }
                        return (
                            <Tile key={i} $state={state} $wide={last}>
                                <Faded $done={state === "done"}>
                                    <DayLabel>{state === "today" ? t("giftToday") : t("giftDay", { n: String(i + 1) })}</DayLabel>
                                    {icon(shown)}
                                    <Amount $today={state === "today"}>{label(shown)}</Amount>
                                </Faded>
                                {mark}
                            </Tile>
                        );
                    })}
                </Grid>
                {status.ready || claimed !== null ? (
                    <Buttons $two={Boolean(onRewardedAd)}>
                        <GameButton tone="green" size="lg" block disabled={claimed !== null || watching} onClick={() => claim(false)}>
                            {t("giftClaim")}
                        </GameButton>
                        {onRewardedAd && (
                            <GameButton tone="amber" size="lg" block disabled={claimed !== null || watching} onClick={() => void watch()}>
                                <AdIcon />
                                {todayGift.kind === "skin" ? `+${todayGift.bonus}` : t("giftDouble")}
                            </GameButton>
                        )}
                    </Buttons>
                ) : (
                    <GameButton size="lg" block onClick={onClose}>
                        {t("close")}
                    </GameButton>
                )}
            </Board>
        </>,
        document.body
    );
};

// Чи показувати подарунок після завантаження: сьогоднішній ще не забрано.
export const isGiftReady = (wallet: WalletState): boolean => giftStatus(todayKey(), wallet).ready;
