"use client";
import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useT } from "@game/lib/i18n";

// Модифікатор "таймер": на хід гравця TIMER_SECONDS секунд, інакше хід робиться випадково
// (onExpire). Відлік стартує заново щоразу, коли змінюється resetKey (напр. кількість ходів).
export const useMoveTimer = (active: boolean, resetKey: unknown, seconds: number, onExpire: () => void): number => {
    const [left, setLeft] = useState(1);
    const expireRef = useRef(onExpire);
    expireRef.current = onExpire;

    useEffect(() => {
        setLeft(1);
        if (!active) return;
        const end = Date.now() + seconds * 1000;
        const interval = setInterval(() => {
            // Вкладка у фоні - відлік на паузі (гравець не програє хід, поки не бачить гру).
            if (document.hidden) return;
            const fraction = Math.max(0, (end - Date.now()) / (seconds * 1000));
            setLeft(fraction);
            if (fraction <= 0) {
                clearInterval(interval);
                expireRef.current();
            }
        }, 100);
        return () => clearInterval(interval);
    }, [active, resetKey, seconds]);

    return active ? left : 1;
};

const Track = styled.div`
    width: min(92vw, 460px);
    height: 8px;
    margin: 0 0 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.65);
    box-shadow: inset 0 1px 2px rgba(101, 72, 35, 0.25);
    overflow: hidden;
`;

const Fill = styled.div<{ $urgent: boolean }>`
    height: 100%;
    border-radius: inherit;
    background: ${({ $urgent }) => ($urgent ? "#e8452f" : "#1f9ec2")};
    transition: width 0.1s linear;
`;

export const MoveTimerBar = ({ fraction }: { fraction: number }) => {
    const t = useT();
    return (
        <Track role="progressbar" aria-label={t("timerLabel")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}>
            <Fill $urgent={fraction < 0.35} style={{ width: `${fraction * 100}%` }} />
        </Track>
    );
};
