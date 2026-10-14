"use client";
import React, { useEffect, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { RoomDoc, PlayerSymbol } from "@game/lib/onlineGame";
import { claimTimeout } from "@game/lib/matchmaking";
import { RATED_FIRST_TURN_MS, RATED_GRACE_MS, RATED_TURN_MS } from "@game/lib/rating";
import { useT } from "@game/lib/i18n";

// Час на хід у рейтинговому матчі. Дедлайн пише сервер (room.turnDeadline); клієнт лише
// показує відлік і, коли час вийшов, просить сервер зарахувати технічну перемогу - сервер
// сам перевіряє час, тож неточний годинник клієнта нічого не зламає.

// З якого залишку показувати попап над полем.
const ALERT_FROM_MS = 10_000;

export const formatClock = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// Залишок часу на поточний хід (мс) або null, якщо таймера немає (не рейтингова чи вже завершена партія).
export const useRatedTurnClock = (roomId: string, room: RoomDoc): number | null => {
    const deadlineMs = room.rated && room.status === "playing" ? room.turnDeadline?.toMillis?.() ?? null : null;
    const firstTurn = room.board.every((cell) => cell === null);

    // Локальний дедлайн: не пізніше серверного, але й не більше повного часу на хід від
    // моменту, коли ми дізнались про хід, - так відлік не "стрибає", якщо годинник пристрою відстає.
    const [localDeadline, setLocalDeadline] = useState<number | null>(null);
    useEffect(() => {
        if (deadlineMs === null) {
            setLocalDeadline(null);
            return;
        }
        setLocalDeadline(Math.min(Date.now() + (firstTurn ? RATED_FIRST_TURN_MS : RATED_TURN_MS), deadlineMs));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- новий відлік лише з новим дедлайном
    }, [deadlineMs]);

    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (localDeadline === null) return;
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(id);
    }, [localDeadline]);

    // Час вийшов - запит технічної перемоги. Його шлють обидва клієнти (хто перший - той і
    // завершить партію); "ще рано" від сервера - підправляємо відлік під серверний час.
    useEffect(() => {
        if (localDeadline === null) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout>;
        const attempt = async () => {
            const res = await claimTimeout(roomId).catch(() => null);
            if (cancelled) return;
            if (res?.error === "too_early" && typeof res.retryInMs === "number") {
                setLocalDeadline(Date.now() + Math.max(0, res.retryInMs - RATED_GRACE_MS));
            } else if (!res) {
                timer = setTimeout(() => void attempt(), 3000);
            }
        };
        timer = setTimeout(() => void attempt(), Math.max(0, localDeadline - Date.now()) + RATED_GRACE_MS + 300);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [localDeadline, roomId]);

    return localDeadline === null ? null : Math.max(0, localDeadline - now);
};

const pulse = keyframes`
    0%, 100% { transform: translateX(-50%) scale(1); }
    50% { transform: translateX(-50%) scale(1.04); }
`;

const Alert = styled.div<{ $tone: "danger" | "calm"; $urgent: boolean }>`
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 64px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 1400;
    width: min(92vw, 380px);
    box-sizing: border-box;
    padding: 10px 16px;
    border-radius: 16px;
    text-align: center;
    color: #fff;
    box-shadow: 0 10px 24px rgba(80, 20, 10, 0.35);
    ${({ $tone }) =>
        $tone === "danger"
            ? css`
                  background: linear-gradient(180deg, #ef5a3f 0%, #c3321d 100%);
              `
            : css`
                  background: linear-gradient(180deg, #2bb3d4 0%, #0f6f8c 100%);
              `}
    ${({ $urgent }) =>
        $urgent &&
        css`
            animation: ${pulse} 1s ease-in-out infinite;
        `}

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }

    @media (max-width: 640px) {
        top: calc(env(safe-area-inset-top, 0px) + 56px);
        padding: 8px 12px;
    }
`;

const AlertTitle = styled.div`
    font-size: 17px;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
`;

const AlertHint = styled.div`
    margin-top: 2px;
    font-size: 13px;
    font-weight: 700;
    opacity: 0.95;
`;

type TurnAlertProps = { room: RoomDoc; mySymbol: PlayerSymbol; remaining: number | null };

// Попап над полем: свій хід - червоний ("час спливає, перемога буде за суперником"),
// хід суперника, що мовчить чи вийшов, - бірюзовий ("не встигне - перемога твоя").
export const TurnAlert: React.FC<TurnAlertProps> = ({ room, mySymbol, remaining }) => {
    const t = useT();
    if (remaining === null) return null;
    const myTurn = room.currentPlayer === mySymbol;
    const opponentLeft = !myTurn && room.leftPlayer === room.currentPlayer;
    if (remaining > ALERT_FROM_MS && !opponentLeft) return null;
    const clock = formatClock(remaining);
    const [title, hint] = myTurn
        ? [t("turnAlertMine", { t: clock }), t("turnAlertMineHint")]
        : opponentLeft
        ? [t("turnAlertLeft", { t: clock }), t("turnAlertLeftHint")]
        : [t("turnAlertTheirs", { t: clock }), t("turnAlertTheirsHint")];
    return (
        <Alert role="alert" aria-live="assertive" $tone={myTurn ? "danger" : "calm"} $urgent={myTurn && remaining <= 5_000}>
            <AlertTitle>{title}</AlertTitle>
            <AlertHint>{hint}</AlertHint>
        </Alert>
    );
};
