"use client";
import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Overlay } from "@game/components/gameStyles";
import { ModalCard, ModalCloseButton, PillButton } from "@game/components/onlineStyles";
import { IconClose } from "@game/components/GameIcons";
import { buttonTone } from "@game/components/GameButton";
import { Coin } from "@game/components/SkinShop";
import { getWallet, useWallet } from "@game/lib/wallet";
import { getProfile, useProfile } from "@game/lib/profile";
import { playSound } from "@game/lib/sound";
import { useT } from "@game/lib/i18n";

// Вікно після партії проти ШІ (як у прототипі): режим і результат по центру, нагороди -
// іконки з числами (не кнопки), далі "Ще раз" і "До меню". Клік поза вікном лише ховає його.

export type RoundSummary = { coins: number; xp: number; moves: number };

// Для вікон, що не бачать дошку (виклик дня, рівень кампанії): знімок монет і досвіду на старті
// й підсумок відносно нього.
export type RewardBase = { coins: number; xp: number };
export const snapshotRewards = (): RewardBase => ({ coins: getWallet().coins, xp: getProfile().xp });
export const rewardsSince = (base: RewardBase, moves: number): RoundSummary => ({
    coins: Math.max(0, getWallet().coins - base.coins),
    xp: Math.max(0, getProfile().xp - base.xp),
    moves,
});

// Підсумок поточної партії: скільки ходів зробив гравець і скільки монет/досвіду додалось.
// Нагороди нараховують обробники ігрових подій (wallet.ts, profile.ts) - тут різниця між
// станом на початку партії і зараз; поки гравець не походив, точка відліку оновлюється.
export const useRoundSummary = (cells: unknown[], playerMarker: string): RoundSummary => {
    const wallet = useWallet();
    const profile = useProfile();
    const base = useRef({ coins: wallet.coins, xp: profile.xp });
    const prev = useRef<unknown[]>(cells);
    const [moves, setMoves] = useState(0);

    useEffect(() => {
        const before = prev.current;
        prev.current = cells;
        const playerCells = cells.filter((cell) => cell === playerMarker).length;
        if (playerCells === 0) {
            // Нова партія (або ще не походили) - відлік з нуля.
            setMoves(0);
            base.current = { coins: wallet.coins, xp: profile.xp };
            return;
        }
        const placed = cells.filter((cell, i) => cell === playerMarker && before[i] !== playerMarker).length;
        if (placed > 0) setMoves((m) => m + placed);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- рахуємо лише зміни дошки
    }, [cells, playerMarker]);

    return {
        coins: Math.max(0, wallet.coins - base.current.coins),
        xp: Math.max(0, profile.xp - base.current.xp),
        moves,
    };
};

const Card = styled(ModalCard)`
    text-align: center;
`;

const Eyebrow = styled.div`
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #7a5a35;
`;

const Title = styled.h2<{ $result: "win" | "lose" | "draw" }>`
    margin: 4px 0 10px;
    font-size: clamp(26px, 7vw, 32px);
    font-weight: 900;
    color: ${({ $result }) => ($result === "win" ? "#0f6f8c" : $result === "lose" ? "#b32f1c" : "#49301f")};
`;

const Rewards = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin: 0 0 8px;
    padding: 10px 4px;
    border-top: 1px dashed rgba(139, 101, 60, 0.3);
    border-bottom: 1px dashed rgba(139, 101, 60, 0.3);
`;

// Нагорода: іконка зліва від числа в одному рядку, підпис під ними.
const Stat = styled.div`
    position: relative;
    display: grid;
    grid-template-columns: auto auto;
    justify-content: center;
    align-items: center;
    column-gap: 6px;
    row-gap: 2px;
    padding: 8px 4px;
    border-radius: 14px;
    background: rgba(255, 238, 205, 0.7);

    b {
        font-size: 20px;
        font-weight: 900;
        color: #49301f;
        font-variant-numeric: tabular-nums;
    }

    small {
        grid-column: 1 / -1;
        font-size: 12px;
        font-weight: 700;
        color: #7a5a35;
    }
`;

const iconIn = keyframes`
    0% { opacity: 0; transform: scale(0.3); }
    60% { opacity: 1; transform: scale(1.2); }
    100% { opacity: 1; transform: none; }
`;

const spark = keyframes`
    from { opacity: 1; transform: translate(0, 0) scale(1); }
    to { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0.3); }
`;

// Іконка нагороди: до своєї черги прихована, потім з'являється разом із числом - виринає й пружинить.
const StatIcon = styled.span<{ $phase: "wait" | "in" | "static" }>`
    display: inline-grid;
    place-items: center;
    width: 26px;
    height: 26px;
    ${({ $phase }) => ($phase === "wait" ? "opacity: 0; transform: scale(0.3);" : "")}
    animation: ${({ $phase }) => ($phase === "in" ? iconIn : "none")} 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
`;

const Spark = styled.span`
    position: absolute;
    left: calc(50% - 3px);
    top: calc(50% - 10px);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    pointer-events: none;
    animation: ${spark} 0.65s ease-out forwards;
`;

const SPARK_COLORS: [string, string][] = [
    ["#ffd04d", "#f2a818"],
    ["#8fe3f5", "#1fb3d9"],
    ["#e7c08a", "#b07a45"],
];

const reducedMotion = (): boolean =>
    typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Нагорода з ефектом: іконка з'являється по черзі, число (count) рахує від нуля, довкола
// розлітаються іскорки; на монетах - звук. "Зменшити рух" - без ефектів, одразу підсумкове число.
const RewardStat: React.FC<{ icon: React.ReactNode; value: number; prefix?: string; label: string; order: number; count: boolean }> = ({
    icon,
    value,
    prefix = "",
    label,
    order,
    count,
}) => {
    const [effects] = useState(() => !reducedMotion());
    const [phase, setPhase] = useState<"wait" | "in" | "static">(effects ? "wait" : "static");
    // null - показувати саме значення (без відліку або відлік завершено).
    const [counted, setCounted] = useState<number | null>(effects && count ? 0 : null);
    const [sparks, setSparks] = useState<number[]>([]);
    const target = useRef(value);
    target.current = value;

    useEffect(() => {
        if (!effects) return;
        let frame = 0;
        const start = setTimeout(() => {
            setPhase("in");
            const to = target.current;
            if (to > 0 && count) {
                setSparks(Array.from({ length: 6 }, (_, k) => k));
                setTimeout(() => setSparks([]), 700);
                if (order === 0) playSound("coin");
            }
            if (!count) return;
            const began = performance.now();
            const duration = Math.min(900, 300 + to * 25);
            const step = (now: number) => {
                const k = Math.min(1, (now - began) / duration);
                setCounted(k < 1 ? Math.round(target.current * (1 - (1 - k) ** 3)) : null);
                if (k < 1) frame = requestAnimationFrame(step);
            };
            frame = requestAnimationFrame(step);
        }, 250 + order * 260);
        return () => {
            clearTimeout(start);
            cancelAnimationFrame(frame);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- ефект один раз, при появі вікна
    }, []);

    const [a, b] = SPARK_COLORS[order] ?? SPARK_COLORS[0];
    return (
        <Stat role="listitem">
            <StatIcon $phase={phase}>{icon}</StatIcon>
            <b>
                {prefix}
                {counted ?? value}
            </b>
            <small>{label}</small>
            {sparks.map((k) => {
                const angle = (Math.PI * 2 * k) / 6 + 0.3;
                const distance = 18 + (k % 3) * 5;
                return (
                    <Spark
                        key={k}
                        aria-hidden="true"
                        style={
                            {
                                background: k % 2 ? b : a,
                                "--dx": `${Math.cos(angle) * distance}px`,
                                "--dy": `${Math.sin(angle) * distance}px`,
                            } as React.CSSProperties
                        }
                    />
                );
            })}
        </Stat>
    );
};

const XpStar = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5l2.6 6.1 6.6.5-5 4.3 1.6 6.4L12 16.4 6.2 19.8l1.6-6.4-5-4.3 6.6-.5z" fill="#1fb3d9" stroke="#0f6f8c" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
);

// Ходи - сліди: два відбитки ступні.
const Steps = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
        <g fill="#9a6232">
            <ellipse cx="6.8" cy="16.8" rx="3.3" ry="5.2" transform="rotate(-10 6.8 16.8)" />
            <circle cx="4.2" cy="9.6" r="1.3" />
            <circle cx="6.6" cy="8.8" r="1.4" />
            <circle cx="9" cy="9.4" r="1.2" />
            <ellipse cx="17.2" cy="10" rx="3.3" ry="5.2" transform="rotate(10 17.2 10)" />
            <circle cx="15" cy="2.9" r="1.2" />
            <circle cx="17.4" cy="2.4" r="1.4" />
            <circle cx="19.8" cy="3.2" r="1.3" />
        </g>
    </svg>
);

const PrimaryButton = styled(PillButton)`
    ${buttonTone("primary")}
`;

type ResultPopupProps = {
    result: "win" | "lose" | "draw";
    summary: RoundSummary;
    onClose: () => void;
    onRestart: () => void;
    onMenu?: () => void;
    // Одне вікно для всіх ігор: підпис над заголовком ("Швидка гра", "Гра з другом"...),
    // власний заголовок результату, підпис і стан кнопки "Грати ще раз" та додатковий рядок
    // (напр. зміна рейтингу після швидкого матчу).
    eyebrow?: string;
    title?: string;
    restartLabel?: string;
    restartDisabled?: boolean;
    extra?: React.ReactNode;
    // Зірки рівня кампанії / виклику дня (0-3) - під заголовком.
    stars?: number;
    // Друга дія між "Грати ще раз" і "Повернутися в меню" (напр. "До карти").
    secondary?: { label: string; onClick: () => void };
};

const StarsRow = styled.div`
    display: flex;
    justify-content: center;
    gap: 6px;
    margin: -4px 0 10px;
`;

const StarIcon = ({ on }: { on: boolean }) => (
    <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true">
        <path
            d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"
            fill={on ? "#1fb3d9" : "#d3edf3"}
            stroke={on ? "#0f6f8c" : "#9fcfdc"}
            strokeWidth="1.2"
            strokeLinejoin="round"
        />
    </svg>
);

const Extra = styled.div`
    margin: 0 0 10px;
    color: #4a2c0c;
    font-size: 14px;
    font-weight: 800;
`;

export const ResultPopup: React.FC<ResultPopupProps> = ({
    result,
    summary,
    onClose,
    onRestart,
    onMenu,
    eyebrow,
    title,
    restartLabel,
    restartDisabled = false,
    extra,
    stars,
    secondary,
}) => {
    const t = useT();
    const heading = title ?? (result === "win" ? t("resultWin") : result === "lose" ? t("resultLose") : t("resultDraw"));
    return (
        <>
            <Overlay onClick={onClose} style={{ zIndex: 1600 }} />
            <Card role="dialog" aria-modal="true" aria-labelledby="result-title" onClick={(e) => e.stopPropagation()} style={{ zIndex: 1601 }}>
                <ModalCloseButton type="button" onClick={onClose} aria-label={t("close")}>
                    <IconClose size={16} />
                </ModalCloseButton>
                <Eyebrow>{eyebrow ?? t("homeQuick")}</Eyebrow>
                <Title id="result-title" $result={result}>
                    {heading}
                </Title>
                {stars !== undefined && (
                    <StarsRow role="img" aria-label={`${stars} / 3`}>
                        {[0, 1, 2].map((i) => (
                            <StarIcon key={i} on={i < stars} />
                        ))}
                    </StarsRow>
                )}
                <Rewards role="list">
                    <RewardStat icon={<Coin size={26} />} value={summary.coins} prefix="+" label={t("resultCoins")} order={0} count />
                    <RewardStat icon={<XpStar />} value={summary.xp} prefix="+" label={t("resultXp")} order={1} count />
                    <RewardStat icon={<Steps />} value={summary.moves} label={t("resultMoves")} order={2} count={false} />
                </Rewards>
                {extra && <Extra>{extra}</Extra>}
                <PrimaryButton type="button" onClick={onRestart} disabled={restartDisabled}>
                    {restartLabel ?? t("playAgain")}
                </PrimaryButton>
                {secondary && (
                    <PillButton type="button" onClick={secondary.onClick}>
                        {secondary.label}
                    </PillButton>
                )}
                {onMenu && (
                    <PillButton type="button" $variant="ghost" onClick={onMenu}>
                        {t("backToMenu")}
                    </PillButton>
                )}
            </Card>
        </>
    );
};
