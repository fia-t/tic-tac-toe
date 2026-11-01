"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styled, { css, keyframes } from "styled-components";
import { IconClose } from "@game/components/GameIcons";
import { Overlay, boardTile, hintedCell } from "@game/components/gameStyles";
import { ModalCloseButton } from "@game/components/onlineStyles";
import { GameButton } from "@game/components/GameButton";
import { Coin } from "@game/components/SkinShop";
import { ActionIcon } from "@game/components/GameOptions";
import { assetUrl } from "@game/lib/assets";
import { useT } from "@game/lib/i18n";
import { SHOP_THEMES, Theme, skinPrice } from "@game/lib/themes";
import { todayKey } from "@game/lib/daily";
import { BoosterKind, GIFT_DAYS, WalletState, addBoosters, earnCoins, giftStatus, markGiftClaimed, startSkinTrial, useWallet } from "@game/lib/wallet";

// Подарунок дня - після завантаження гри, раз на день. Тиждень подарунків - ігрове поле 3×3 "Класики":
// у центрі хрестик, у нижньому лівому куті нолик, дні - у решті клітинок. Сьогоднішній подарунок
// видно, наступні - сюрприз (під підписом дня лише фішка), забраний день закривається своєю фішкою.
// Забрали 7-й день - хрестики на діагоналі світяться, як виграшна лінія.
// Подарунки: монети, бустери в запас і пробний скін; якщо всі скіни є - монети.
// За рекламу (де вона є) - подвійний подарунок. Після отримання над полем вистрибує нагорода (за рекламу - зі штампом "×2").

type Boosts = [BoosterKind, number][];
type Gift = { kind: "coins"; n: number } | { kind: "boosters"; boosts: Boosts } | { kind: "trial"; skin: Theme; hours: number };

const PLAN: ({ kind: "coins"; n: number } | { kind: "boosters"; boosts: Boosts } | { kind: "trial"; fallback: number })[] = [
    { kind: "coins", n: 50 },
    { kind: "boosters", boosts: [["hint", 1]] },
    { kind: "coins", n: 100 },
    { kind: "trial", fallback: 100 },
    { kind: "boosters", boosts: [["undo", 2]] },
    { kind: "coins", n: 150 },
    {
        kind: "boosters",
        boosts: [
            ["hint", 3],
            ["undo", 3],
            ["pause", 3],
            ["freeze", 3],
        ],
    },
];
const TRIAL_GIFT_HOURS = 24;
const BOOSTER_NAME = { hint: "boosterHint", undo: "boosterUndo", pause: "boosterPause", freeze: "boosterFreeze" } as const;
// Фішки днів - сталий візерунок: "сюрприз" на днях, що попереду, і позначка забраного дня.
const SURPRISE: ("x" | "o")[] = ["x", "o", "x", "o", "x", "x", "x"];
// Клітинки поля 0..8: 4 - хрестик, 6 - нолик, дні 1-7 - по черзі в решті (7-й - в останній клітинці).
const PIECE_CELLS: Record<number, "x" | "o"> = { 4: "x", 6: "o" };
// Виграшна діагональ після 7-го дня: день 1, центр, день 7.
const WIN_LINE = [0, 4, 8];
// Скільки вікно лишається відкритим після отримання (на 7-й день - довше, щоб побачити виграшну лінію).
const CLOSE_MS = 2300;
const CLOSE_LAST_MS = 3000;

const notOwned = (wallet: WalletState) => SHOP_THEMES.filter((skin) => !wallet.owned.includes(skin.id));

const giftFor = (day: number, wallet: WalletState): Gift => {
    const plan = PLAN[day];
    if (plan.kind !== "trial") return plan;
    // Пробний - найдорожчий скін, якого ще немає (покуштувати "преміум").
    const skin = [...notOwned(wallet)].sort((a, b) => skinPrice(b) - skinPrice(a))[0];
    return skin ? { kind: "trial", skin, hours: TRIAL_GIFT_HOURS } : { kind: "coins", n: plan.fallback };
};

const grant = (gift: Gift, doubled: boolean) => {
    const k = doubled ? 2 : 1;
    if (gift.kind === "coins") earnCoins(gift.n * k);
    else if (gift.kind === "trial") startSkinTrial(gift.skin.id, gift.hours * k);
    else gift.boosts.forEach(([kind, n]) => addBoosters(kind, n * k));
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

const winPulse = keyframes`
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.16); }
`;

const burstPop = keyframes`
    0% { opacity: 0; transform: scale(0.2) translateY(40px); }
    100% { opacity: 1; transform: none; }
`;

const burstRays = keyframes`
    0% { opacity: 0; transform: scale(0.4) rotate(0); }
    20% { opacity: 1; }
    100% { opacity: 0.9; transform: scale(1) rotate(90deg); }
`;

const burstX2 = keyframes`
    0% { opacity: 0; transform: scale(3) rotate(-30deg); }
    100% { opacity: 1; transform: rotate(10deg); }
`;

const burstOut = keyframes`
    to { opacity: 0; transform: translateY(-30px) scale(0.9); }
`;

const sparkFly = keyframes`
    from { opacity: 1; transform: translate(0, 0) scale(1); }
    to { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0.3); }
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
    width: min(92vw, 460px);
    height: fit-content;
    max-height: calc(100dvh - 24px);
    overflow-y: auto;
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

// Заголовок - не більше двох рядків: у перекладі він розбитий "\n" на дві половини, кожна - свій рядок
// без переносу; шрифт зменшується з шириною екрана.
const Title = styled.h2`
    margin: 0;
    padding: 0 36px;
    text-align: center;
    font: 800 min(24px, 4vw) / 1.2 var(--font-heading);
    color: #5b3413;
    text-shadow: 0 2px 0 rgba(255, 255, 255, 0.7);

    span {
        display: block;
        white-space: nowrap;
    }
`;

const Close = styled(ModalCloseButton)`
    top: 10px;
    right: 10px;
`;

// Поле 3×3 у заглибленій рамці, як на дошці.
const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin: 16px 0;
    padding: 8px;
    border-radius: 22px;
    box-shadow:
        inset 0 4px 10px rgba(90, 50, 10, 0.3),
        inset 0 0 0 2px rgba(150, 95, 35, 0.3);

    @media (max-width: 480px) {
        gap: 7px;
        margin: 12px 0;
        padding: 6px;
    }
`;

const Tile = styled.div<{ $state: "done" | "today" | "next" | "piece"; $win?: boolean }>`
    ${boardTile}
    position: relative;
    aspect-ratio: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 6px;
    text-align: center;
    ${({ $state }) => $state === "today" && hintedCell}
    ${({ $state }) =>
        $state === "today" &&
        css`
            background: rgba(255, 236, 170, 0.55);
        `}
    ${({ $state }) =>
        $state === "done" &&
        css`
            & > :not(img) {
                opacity: 0.45;
            }
        `}
    ${({ $win }) =>
        $win &&
        css`
            background: rgba(255, 236, 170, 0.45);

            & > img {
                animation: ${winPulse} 0.55s ease-in-out 0.5s 3;
                filter: drop-shadow(0 0 4px #fff) drop-shadow(0 0 10px rgba(255, 210, 60, 1)) drop-shadow(0 0 20px rgba(255, 170, 20, 0.9));
            }
        `}

    @media (hover: hover) {
        &:hover {
            background: ${({ $state }) => ($state === "today" ? "rgba(255, 236, 170, 0.55)" : "rgba(255, 255, 255, 0.18)")};
        }
    }
`;

const DayLabel = styled.span<{ $big?: boolean }>`
    font: 800 14px/1 var(--font-heading);
    color: ${({ $big }) => ($big ? "#b8301f" : "#6b4318")};

    @media (max-width: 480px) {
        font-size: 12px;
    }
`;

const Amount = styled.span<{ $today?: boolean }>`
    font: 800 15px/1.1 var(--font-heading);
    color: ${({ $today }) => ($today ? "#2f8a3e" : "#5b3413")};
`;

// Фішка на полі: хрестик у центрі, нолик у кутку і "сюрприз" на днях, що попереду.
const Piece = styled.img<{ $size: string }>`
    width: ${({ $size }) => $size};
    height: auto;
    pointer-events: none;
`;

// Забраний день - хрестик "Класики" поверх клітинки, як хід на полі.
const Mark = styled.img<{ $fresh: boolean }>`
    position: absolute;
    inset: 0;
    margin: auto;
    width: 72%;
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
        width: 34px;
        height: 34px;
    }

    @media (max-width: 480px) {
        img {
            width: 26px;
            height: 26px;
        }
    }
`;

// Бустер - іконка з-під поля (без кружечка); кілька - сіткою, кожен з числом.
const Boost = styled.span<{ $small: boolean }>`
    display: inline-flex;
    color: #49301f;

    svg {
        width: ${({ $small }) => ($small ? "24px" : "36px")};
        height: ${({ $small }) => ($small ? "24px" : "36px")};
    }

    @media (max-width: 480px) {
        svg {
            width: ${({ $small }) => ($small ? "18px" : "30px")};
            height: ${({ $small }) => ($small ? "18px" : "30px")};
        }
    }
`;

// Більше двох бустерів (7-й день) - сіткою 2×2.
const BoostList = styled.span<{ $grid: boolean }>`
    display: ${({ $grid }) => ($grid ? "grid" : "flex")};
    grid-template-columns: repeat(2, auto);
    flex-direction: column;
    align-items: center;
    gap: ${({ $grid }) => ($grid ? "4px 8px" : "3px")};
    font: 800 16px/1.1 var(--font-heading);
    color: #5b3413;

    & > span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }

    @media (max-width: 480px) {
        gap: ${({ $grid }) => ($grid ? "2px 4px" : "3px")};
        font-size: ${({ $grid }) => ($grid ? "12px" : "16px")};

        & > span {
            gap: 2px;
        }
    }
`;

const Buttons = styled.div<{ $two: boolean }>`
    display: grid;
    grid-template-columns: ${({ $two }) => ($two ? "1fr 1fr" : "1fr")};
    gap: 10px;
`;

const AdButton = styled.span`
    position: relative;
    display: block;
`;

// Ярлик "AD" - як на бустерах: помаранчевий, з кремовим обідком, трохи нахилений.
const AdTag = styled.span`
    position: absolute;
    top: -8px;
    right: -6px;
    z-index: 1;
    height: 22px;
    padding: 0 6px;
    border-radius: 7px;
    background: linear-gradient(180deg, #ffc247, #f08a1c);
    color: #fff;
    font: 800 13px/22px var(--font-heading);
    letter-spacing: 0.5px;
    text-shadow: 0 1px 0 rgba(140, 60, 0, 0.7);
    box-shadow:
        0 0 0 2px #fff7e8,
        0 2px 4px rgba(73, 48, 31, 0.3);
    transform: rotate(8deg);
    pointer-events: none;
`;

// --- ефект отримання: нагорода вистрибує над полем, за нею крутяться золоті промені, розлітаються іскри ---

const Burst = styled.div`
    position: absolute;
    inset: 0;
    z-index: 6;
    display: grid;
    place-items: center;
    pointer-events: none;
    animation: ${burstOut} 0.35s ease-in 1.85s forwards;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

const Rays = styled.div<{ $x2: boolean }>`
    position: absolute;
    width: ${({ $x2 }) => ($x2 ? "380px" : "300px")};
    height: ${({ $x2 }) => ($x2 ? "380px" : "300px")};
    border-radius: 50%;
    background: repeating-conic-gradient(${({ $x2 }) => ($x2 ? "rgba(255, 170, 40, 0.6)" : "rgba(255, 214, 90, 0.55)")} 0 12deg, transparent 12deg 30deg);
    mask-image: radial-gradient(circle, #000 25%, transparent 70%);
    animation: ${burstRays} 2.2s linear both;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

const BurstBody = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 16px 26px 14px;
    border-radius: 26px;
    background: radial-gradient(circle at 50% 35%, #fffaf0, #ffe7b0);
    box-shadow:
        0 0 0 4px #fff7e8,
        0 0 0 7px #f5b82e,
        0 16px 34px rgba(60, 30, 5, 0.4);
    color: #49301f;
    animation: ${burstPop} 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;

    b {
        font: 800 40px/1 var(--font-heading);
        color: #2f8a3e;
        text-shadow: 0 2px 0 #fff;
    }

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

const BurstGrid = styled.span`
    display: grid;
    grid-template-columns: repeat(2, auto);
    gap: 6px 18px;

    & > span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }

    && b {
        font-size: 26px;
    }
`;

const X2Tag = styled.span`
    position: absolute;
    top: -18px;
    right: -22px;
    padding: 2px 10px;
    border-radius: 12px;
    background: linear-gradient(180deg, #ffc247, #f08a1c);
    color: #fff;
    font: 800 30px/1.2 var(--font-heading);
    text-shadow: 0 2px 0 rgba(140, 60, 0, 0.7);
    box-shadow:
        0 0 0 3px #fff7e8,
        0 4px 10px rgba(73, 48, 31, 0.35);
    animation: ${burstX2} 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both;
`;

const Spark = styled.span`
    position: absolute;
    left: calc(50% - 4px);
    top: calc(50% - 4px);
    width: 9px;
    height: 9px;
    border-radius: 50%;
    animation: ${sparkFly} 0.9s ease-out both;

    @media (prefers-reduced-motion: reduce) {
        display: none;
    }
`;

const SPARK_COLORS = ["#ffd04d", "#f2a818", "#1fb3d9", "#e8452f", "#2f8a3e"];

const GiftBurst: React.FC<{ gift: Gift; doubled: boolean }> = ({ gift, doubled }) => {
    const t = useT();
    const k = doubled ? 2 : 1;
    // Іскри - сталі напрямки по колу (з невеликим розкидом), за рекламу - удвічі більше й далі.
    const [sparks] = useState(() => {
        const count = doubled ? 28 : 14;
        return Array.from({ length: count }, (_, i) => {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
            const dist = 90 + Math.random() * (doubled ? 110 : 70);
            return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, delay: doubled && i % 2 ? 0.4 : 0.1 };
        });
    });
    const body =
        gift.kind === "coins" ? (
            <>
                <Coin size={64} />
                <b>+{gift.n * k}</b>
            </>
        ) : gift.kind === "trial" ? (
            <>
                <SkinPeek style={{ transform: "scale(1.6)", margin: "10px 0" }}>
                    <img src={gift.skin.xMarkerUrl} alt="" />
                    <img src={gift.skin.oMarkerUrl} alt="" />
                </SkinPeek>
                <b style={{ fontSize: 28 }}>{t("giftTrial", { h: String(gift.hours * k) })}</b>
            </>
        ) : gift.boosts.length === 1 ? (
            <>
                <Boost $small={false} style={{ transform: "scale(1.7)", margin: "14px 0" }}>
                    <ActionIcon id={gift.boosts[0][0]} />
                </Boost>
                <b>+{gift.boosts[0][1] * k}</b>
            </>
        ) : (
            <BurstGrid>
                {gift.boosts.map(([kind, n]) => (
                    <span key={kind}>
                        <Boost $small={false}>
                            <ActionIcon id={kind} />
                        </Boost>
                        <b>+{n * k}</b>
                    </span>
                ))}
            </BurstGrid>
        );
    return (
        <Burst aria-live="polite">
            <Rays $x2={doubled} />
            <BurstBody>
                {body}
                {doubled && <X2Tag>×2</X2Tag>}
            </BurstBody>
            {sparks.map((s, i) => (
                <Spark
                    key={i}
                    style={{ "--dx": `${s.dx}px`, "--dy": `${s.dy}px`, background: SPARK_COLORS[i % SPARK_COLORS.length], animationDelay: `${s.delay}s` } as React.CSSProperties}
                />
            ))}
        </Burst>
    );
};

const pieceUrl = (p: "x" | "o") => assetUrl(`images/themes/classic-${p}.svg`);

export const DailyGift: React.FC<{ onRewardedAd?: () => Promise<boolean>; onClose: () => void }> = ({ onRewardedAd, onClose }) => {
    const t = useT();
    const wallet = useWallet();
    const [today] = useState(todayKey);
    // Що вже забрано в цьому вікні: день із хрестиком, що "падає", і закриття за мить.
    const [claimed, setClaimed] = useState<number | null>(null);
    const [doubled, setDoubled] = useState(false);
    const [watching, setWatching] = useState(false);
    const status = giftStatus(today, wallet);
    const day = claimed ?? status.day;
    const gifts = Array.from({ length: GIFT_DAYS }, (_, i) => giftFor(i, wallet));
    // Подарунок сьогодні фіксуємо до видачі: після неї "найдорожчий скін без власника" вже інший.
    const [todayGift] = useState(() => gifts[status.day]);

    useEffect(() => {
        if (claimed === null) return;
        const timer = setTimeout(onClose, claimed === GIFT_DAYS - 1 ? CLOSE_LAST_MS : CLOSE_MS);
        return () => clearTimeout(timer);
    }, [claimed, onClose]);

    const claim = (double: boolean) => {
        if (claimed !== null) return;
        grant(todayGift, double);
        markGiftClaimed(today);
        setDoubled(double);
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

    const content = (gift: Gift, today: boolean) => {
        if (gift.kind === "boosters") {
            const small = gift.boosts.length > 1;
            return (
                <BoostList $grid={gift.boosts.length > 2}>
                    {gift.boosts.map(([kind, n]) => (
                        <span key={kind} title={t(BOOSTER_NAME[kind])}>
                            <Boost $small={small}>
                                <ActionIcon id={kind} />
                            </Boost>
                            {small && `+${n}`}
                        </span>
                    ))}
                    {!small && <Amount $today={today}>+{gift.boosts[0][1]}</Amount>}
                </BoostList>
            );
        }
        const icon =
            gift.kind === "coins" ? (
                <Coin size={gift.n >= 150 ? 40 : 34} />
            ) : (
                <SkinPeek>
                    <img src={gift.skin.xMarkerUrl} alt="" />
                    <img src={gift.skin.oMarkerUrl} alt="" />
                </SkinPeek>
            );
        const label = gift.kind === "trial" ? t("giftTrial", { h: String(gift.hours) }) : `+${gift.n}`;
        return (
            <>
                {icon}
                <Amount $today={today}>{label}</Amount>
            </>
        );
    };

    const tileState = (i: number): "done" | "today" | "next" =>
        claimed !== null ? (i <= claimed ? "done" : "next") : i < day || (i === day && !status.ready) ? "done" : i === day ? "today" : "next";

    const win = claimed === GIFT_DAYS - 1;
    let next = 0;
    const cells = Array.from({ length: 9 }, (_, c) => {
        const piece = PIECE_CELLS[c];
        if (piece)
            return (
                <Tile key={c} $state="piece" $win={win && WIN_LINE.includes(c)}>
                    <Piece $size="70%" src={pieceUrl(piece)} alt="" />
                </Tile>
            );
        const i = next++;
        const state = tileState(i);
        const big = i === GIFT_DAYS - 1;
        return (
            <Tile key={c} $state={state} $win={win && WIN_LINE.includes(c)}>
                <DayLabel $big={big && state !== "done"}>{state === "today" ? t("giftToday") : t("giftDay", { n: String(i + 1) })}</DayLabel>
                {state === "next" ? <Piece $size="58%" src={pieceUrl(SURPRISE[i])} alt="" /> : content(i === status.day ? todayGift : gifts[i], state === "today")}
                {state === "done" && <Mark $fresh={i === claimed} src={pieceUrl(SURPRISE[i])} alt="" />}
            </Tile>
        );
    });

    return createPortal(
        <>
            <Dim onClick={onClose} />
            <Board role="dialog" aria-modal="true" aria-labelledby="gift-title">
                <Close onClick={onClose} aria-label={t("close")}>
                    <IconClose size={16} />
                </Close>
                <Title id="gift-title">
                    {t("giftTitle")
                        .split("\n")
                        .map((line) => (
                            <span key={line}>{line}</span>
                        ))}
                </Title>
                <Grid>{cells}</Grid>
                {claimed !== null && <GiftBurst gift={todayGift} doubled={doubled} />}
                {status.ready || claimed !== null ? (
                    <Buttons $two={Boolean(onRewardedAd)}>
                        <GameButton tone="green" size="lg" block disabled={claimed !== null || watching} onClick={() => claim(false)}>
                            {t("giftClaim")}
                        </GameButton>
                        {onRewardedAd && (
                            <AdButton>
                                <GameButton tone="amber" size="lg" block disabled={claimed !== null || watching} onClick={() => void watch()}>
                                    {t("giftDouble")}
                                </GameButton>
                                <AdTag aria-hidden="true">AD</AdTag>
                            </AdButton>
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
