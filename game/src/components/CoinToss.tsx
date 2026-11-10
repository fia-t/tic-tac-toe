"use client";
import React, { useEffect, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { playSound } from "@game/lib/sound";

// Монетка перед партією: хто ходить першим ("Монетка: хто ходить першим?" - у рядку статусу над полем). Лягає поверх поля (усередині BoardHolder),
// крутиться ~1 с і падає стороною з фішкою того, хто починає; підпис - ще трохи, далі зникає.
// Усього ~1.9 с; натискання пропускає анімацію.

const SPIN_MS = 1050;
const HOLD_MS = 650;
const FADE_MS = 220;

const backdropIn = keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
`;

// Підкидання: вгору й назад з легким відскоком; обертання - окремо, на внутрішньому шарі.
const toss = keyframes`
    0% { transform: translateY(0) scale(0.6); }
    40% { transform: translateY(-46%) scale(1.08); }
    78% { transform: translateY(0) scale(1); }
    88% { transform: translateY(-7%) scale(1); }
    100% { transform: translateY(0) scale(1); }
`;

const spin = keyframes`
    from { transform: rotateY(0deg); }
    to { transform: rotateY(var(--coin-end)); }
`;

const shine = keyframes`
    0% { transform: translateX(-120%) rotate(20deg); opacity: 0; }
    30% { opacity: 1; }
    100% { transform: translateX(120%) rotate(20deg); opacity: 0; }
`;

const captionIn = keyframes`
    from { opacity: 0; transform: translateY(8px) scale(0.92); }
    to { opacity: 1; transform: translateY(0) scale(1); }
`;

const Backdrop = styled.div<{ $leaving: boolean }>`
    /* Лише над полем (воно квадратне й перше в BoardHolder), не над бустерами під ним. */
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    aspect-ratio: 1;
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    border-radius: 18px;
    background: radial-gradient(circle at 50% 45%, rgba(255, 246, 225, 0.55), rgba(73, 48, 31, 0.32));
    backdrop-filter: blur(2px);
    cursor: pointer;
    animation: ${backdropIn} 180ms ease-out both;
    transition: opacity ${FADE_MS}ms ease-in;
    opacity: ${({ $leaving }) => ($leaving ? 0 : 1)};
`;

const Lift = styled.div`
    width: clamp(84px, 26%, 128px);
    aspect-ratio: 1;
    perspective: 700px;
    animation: ${toss} ${SPIN_MS}ms cubic-bezier(0.3, 0.7, 0.4, 1) both;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

const Coin = styled.div<{ $end: number }>`
    --coin-end: ${({ $end }) => $end}deg;
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    animation: ${spin} ${SPIN_MS}ms cubic-bezier(0.2, 0.6, 0.25, 1) both;
    filter: drop-shadow(0 8px 10px rgba(73, 48, 31, 0.35));

    @media (prefers-reduced-motion: reduce) {
        animation: none;
        transform: rotateY(var(--coin-end));
    }
`;

const faceCss = css`
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    overflow: hidden;
    border-radius: 50%;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    background:
        radial-gradient(circle at 50% 50%, #fff3d2 0 52%, transparent 53%),
        radial-gradient(circle at 35% 30%, #ffe08a, #e2a73a 60%, #b97a1d);
    box-shadow:
        inset 0 0 0 4px #c98a22,
        inset 0 0 0 7px #ffd36b,
        inset 0 -6px 10px rgba(120, 70, 10, 0.35);

    img {
        width: 52%;
        height: 52%;
        object-fit: contain;
    }
`;

const Front = styled.div`
    ${faceCss}
`;

const Back = styled.div`
    ${faceCss}
    transform: rotateY(180deg);
`;

const Shine = styled.span`
    position: absolute;
    inset: -20% 35%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.75), transparent);
    animation: ${shine} 600ms ease-out ${SPIN_MS - 120}ms both;
`;

const Caption = styled.div<{ $mine: boolean }>`
    min-height: 1.4em;
    padding: 8px 18px;
    border-radius: 999px;
    color: #fff;
    font-size: 18px;
    font-weight: 900;
    text-align: center;
    background: ${({ $mine }) => ($mine ? "linear-gradient(180deg, #4fbf6a, #2f9a4c)" : "linear-gradient(180deg, #f08a4b, #d4642a)")};
    box-shadow: 0 3px 0 rgba(73, 48, 31, 0.25), 0 6px 14px rgba(73, 48, 31, 0.22);
    animation: ${captionIn} 220ms cubic-bezier(0.3, 1.4, 0.5, 1) both;
`;

type CoinTossProps = {
    // true - першим ходить цей гравець.
    mine: boolean;
    myMarker: string;
    opponentMarker: string;
    caption: string;
    onDone: () => void;
};

export const CoinToss: React.FC<CoinTossProps> = ({ mine, myMarker, opponentMarker, caption, onDone }) => {
    const [phase, setPhase] = useState<"spin" | "result" | "leaving">("spin");
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;
    // Натискання й таймер можуть збігтись - завершуємо лише раз.
    const finished = useRef(false);
    const doneRef = useRef(() => {
        if (finished.current) return;
        finished.current = true;
        onDoneRef.current();
    });
    // Кілька повних обертів і зупинка на потрібній стороні (спереду - фішка гравця).
    const [end] = useState(() => (mine ? 1800 : 1980));

    useEffect(() => {
        const timers = [
            setTimeout(() => {
                setPhase("result");
                playSound("coin");
            }, SPIN_MS),
            setTimeout(() => setPhase("leaving"), SPIN_MS + HOLD_MS),
            setTimeout(() => doneRef.current(), SPIN_MS + HOLD_MS + FADE_MS),
        ];
        return () => timers.forEach(clearTimeout);
    }, []);

    return (
        <Backdrop $leaving={phase === "leaving"} onClick={() => doneRef.current()} role="status" aria-live="polite">
            <Lift>
                <Coin $end={end}>
                    <Front>
                        <img src={myMarker} alt="" />
                    </Front>
                    <Back>
                        <img src={opponentMarker} alt="" />
                    </Back>
                    {phase !== "spin" && <Shine />}
                </Coin>
            </Lift>
            <Caption $mine={mine} style={{ visibility: phase === "spin" ? "hidden" : "visible" }}>
                {caption}
            </Caption>
        </Backdrop>
    );
};

// Монетка в партії з ботом: нова партія (round) - новий кидок, поки active. aiFirst - бот почав.
// onAiFirst викликається після анімації, якщо випало боту, - він робить перший хід.
export const useBotCoinToss = (round: number, active: boolean, onAiFirst: () => void) => {
    const [toss, setToss] = useState<{ round: number; aiFirst: boolean } | null>(null);
    const tossedRound = useRef<number | null>(null);
    const aiFirstRef = useRef(onAiFirst);
    aiFirstRef.current = onAiFirst;

    useEffect(() => {
        if (!active) {
            // Вийшли з поля посеред кидка - наступна партія кине монетку знову.
            if (toss) {
                setToss(null);
                tossedRound.current = null;
            }
            return;
        }
        if (tossedRound.current === round) return;
        tossedRound.current = round;
        setToss({ round, aiFirst: Math.random() < 0.5 });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- кидок лише на нову партію
    }, [round, active]);

    const finish = () => {
        if (!toss) return;
        setToss(null);
        if (toss.aiFirst) aiFirstRef.current();
    };

    // Поки монетка ще не кинута для цієї партії - поле теж заблоковане (кадр до ефекту).
    const pending = active && tossedRound.current !== round;
    return { tossing: toss !== null || pending, toss, finish };
};
