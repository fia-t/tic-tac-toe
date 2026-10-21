"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styled, { css, keyframes } from "styled-components";
import { useT } from "@game/lib/i18n";

// Бустери таймера: "Пауза" зупиняє відлік на PAUSE_SECONDS секунд (або до ходу гравця, якщо
// він походить раніше), "Заморозка" прибирає таймер на FREEZE_TURNS ходів гравця (поточний -
// перший з них). Поки бустер діє, на його кнопці - зворотний відлік (секунди / ходи).
// Стан спільний для всіх полів (3×3, 5×5, гіга-поле) - на екрані завжди одна партія.
export const FREEZE_TURNS = 3;
export const PAUSE_SECONDS = 10;

// pauseLeft - скільки секунд паузи лишилось (0 - паузи немає).
// expired - щойно вийшов час і хід зроблено випадково (кілька секунд показуємо це в рядку статусу).
// firstFree - перший хід гравця в партії: без таймера (поле щойно відкрилось, гравець ще роздивляється).
type TimerBoostState = { paused: boolean; pauseLeft: number; frozenNow: boolean; frozenLeft: number; expired: boolean; firstFree: boolean };
let boost: TimerBoostState = { paused: false, pauseLeft: 0, frozenNow: false, frozenLeft: 0, expired: false, firstFree: false };
let expiredTimer: ReturnType<typeof setTimeout> | undefined;
const EXPIRED_NOTICE_MS = 2500;
const markExpired = () => {
    clearTimeout(expiredTimer);
    setBoost({ expired: true });
    expiredTimer = setTimeout(() => setBoost({ expired: false }), EXPIRED_NOTICE_MS);
};
let pausedUntil = 0;
const listeners = new Set<() => void>();
const setBoost = (next: Partial<TimerBoostState>) => {
    boost = { ...boost, ...next };
    listeners.forEach((listener) => listener());
};

const endPause = () => {
    pausedUntil = 0;
    setBoost({ paused: false, pauseLeft: 0 });
};

export const pauseMoveTimer = (): void => {
    pausedUntil = Date.now() + PAUSE_SECONDS * 1000;
    setBoost({ paused: true, pauseLeft: PAUSE_SECONDS });
};
export const freezeMoveTimer = (): void => {
    pausedUntil = 0;
    setBoost({ paused: false, pauseLeft: 0, frozenNow: true, frozenLeft: FREEZE_TURNS - 1 });
};
// Нова партія - пауза й заморозка знімаються.
export const resetMoveTimerBoosts = (): void => {
    pausedUntil = 0;
    clearTimeout(expiredTimer);
    // firstFree не чіпаємо - його веде сам таймер за номером партії.
    setBoost({ paused: false, pauseLeft: 0, frozenNow: false, frozenLeft: 0, expired: false });
};

export const useMoveTimerBoost = (): TimerBoostState =>
    useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        () => boost,
        () => boost
    );

// Скільки ходів ще без таймера (разом із поточним).
export const frozenTurns = (state: TimerBoostState) => state.frozenLeft + (state.frozenNow ? 1 : 0);

// Модифікатор "таймер": на хід гравця seconds секунд, інакше хід робиться випадково
// (onExpire). Відлік стартує заново щоразу, коли змінюється resetKey (напр. кількість ходів).
// round - номер партії проти бота: там діють бустери "Пауза" й "Заморозка", а перший хід кожної
// партії - без таймера. В онлайні round не передається (ні бустерів, ні вільного першого ходу).
export const useMoveTimer = (active: boolean, resetKey: unknown, seconds: number, onExpire: () => void, round?: number): number => {
    const [left, setLeft] = useState(1);
    const expireRef = useRef(onExpire);
    expireRef.current = onExpire;
    const boosts = round !== undefined;
    // Скільки ходів гравця почалось у поточній партії.
    const turns = useRef<{ round?: number; count: number; key: unknown }>({ round, count: 0, key: undefined });

    useEffect(() => {
        setLeft(1);
        if (!active) {
            if (boosts && boost.firstFree) setBoost({ firstFree: false });
            return;
        }
        if (boosts) {
            if (turns.current.round !== round) turns.current = { round, count: 0, key: undefined };
            // Той самий хід (напр. повторний запуск ефекту без зміни поля) не рахується вдруге.
            if (turns.current.key !== resetKey) {
                turns.current.key = resetKey;
                turns.current.count += 1;
            }
            // Перший хід партії - без відліку.
            if (turns.current.count === 1) {
                setBoost({ firstFree: true });
                return;
            }
            if (boost.firstFree) setBoost({ firstFree: false });
        }
        // Новий хід гравця: пауза минулого ходу знята; заморожений хід витрачає одну "заморозку".
        if (boosts && boost.paused) endPause();
        if (boosts && boost.frozenNow) setBoost({ frozenNow: boost.frozenLeft > 0, frozenLeft: Math.max(0, boost.frozenLeft - 1) });
        let end = Date.now() + seconds * 1000;
        let last = Date.now();
        const interval = setInterval(() => {
            const now = Date.now();
            const step = now - last;
            last = now;
            // Пауза минає сама через PAUSE_SECONDS; поки триває - щосекунди оновлюємо відлік на кнопці.
            if (boosts && boost.paused) {
                const secs = Math.ceil((pausedUntil - now) / 1000);
                if (secs <= 0) endPause();
                else if (secs !== boost.pauseLeft) setBoost({ pauseLeft: secs });
            }
            // Вкладка у фоні, пауза або заморозка - відлік стоїть (гравець не втрачає хід).
            const paused = boosts && boost.paused;
            const frozen = boosts && boost.frozenNow;
            if (document.hidden || paused || frozen) {
                end += step;
                if (frozen) {
                    end = now + seconds * 1000;
                    setLeft(1);
                }
                return;
            }
            const fraction = Math.max(0, (end - now) / (seconds * 1000));
            setLeft(fraction);
            if (fraction <= 0) {
                clearInterval(interval);
                if (boosts) markExpired();
                expireRef.current();
            }
        }, 100);
        return () => clearInterval(interval);
    }, [active, resetKey, seconds, boosts, round]);

    return active ? left : 1;
};

const Row = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    width: min(92vw, 460px);
    margin: 0 0 8px;
    color: var(--bar-ink, #7a5530);
    font-size: 13px;
    font-weight: 800;
`;

const Label = styled.span`
    white-space: nowrap;
`;

const Track = styled.div`
    flex: 1;
    min-width: 0;
    height: 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.65);
    box-shadow: inset 0 1px 2px rgba(101, 72, 35, 0.25);
    overflow: hidden;
`;

type BarState = "normal" | "urgent" | "paused" | "frozen";

const FILL: Record<BarState, string> = {
    normal: "#1f9ec2",
    urgent: "#e8452f",
    paused: "#f2a93b",
    frozen: "linear-gradient(90deg, #7fd3ef, #1fb3d9)",
};

const Fill = styled.div<{ $state: BarState }>`
    height: 100%;
    border-radius: inherit;
    background: ${({ $state }) => FILL[$state]};
    transition: width 0.1s linear;
`;

const pulse = keyframes`
    to { transform: scale(1.12); }
`;

const Secs = styled.span<{ $state: BarState }>`
    min-width: 34px;
    padding: 2px 8px;
    border-radius: 999px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    background: ${({ $state }) => ($state === "urgent" ? "#e8452f" : $state === "paused" ? "#d98a1c" : $state === "frozen" ? "#0f6f8c" : "rgba(255, 255, 255, 0.85)")};
    color: ${({ $state }) => ($state === "normal" ? "#49301f" : "#fff")};
    ${({ $state }) =>
        $state === "urgent" &&
        css`
            animation: ${pulse} 0.5s ease-in-out infinite alternate;
        `}

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

// Рядок над полем: підпис із лімітом ("Час на хід · 5 с"), смужка й зворотний відлік секунд;
// на останніх 2 секундах лічильник червоний і пульсує. Пауза - помаранчева смужка, заморозка - синя.
export const MoveTimerBar = ({ fraction, seconds, boosts = false }: { fraction: number; seconds: number; boosts?: boolean }) => {
    const t = useT();
    const shared = useMoveTimerBoost();
    const state = boosts ? shared : { paused: false, pauseLeft: 0, frozenNow: false, frozenLeft: 0, expired: false, firstFree: false };
    const secs = Math.ceil(fraction * seconds);
    const barState: BarState = state.frozenNow || state.firstFree ? "frozen" : state.paused ? "paused" : secs <= 2 ? "urgent" : "normal";
    const label = state.firstFree
        ? t("timerFirstFree")
        : barState === "frozen"
            ? t("timerFrozen", { n: String(frozenTurns(state)) })
            : barState === "paused"
            ? t("timerPaused", { n: String(state.pauseLeft) })
            : t("timerLimit", { n: String(seconds) });
    return (
        <Row>
            <Label>{label}</Label>
            <Track role="progressbar" aria-label={t("timerLabel")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}>
                <Fill $state={barState} style={{ width: `${barState === "frozen" ? 100 : fraction * 100}%` }} />
            </Track>
            <Secs $state={barState} aria-hidden="true">
                {state.firstFree ? t("timerSecs", { n: String(seconds) }) : barState === "frozen" ? "❄" : barState === "paused" ? "❚❚" : t("timerSecs", { n: String(secs) })}
            </Secs>
        </Row>
    );
};
