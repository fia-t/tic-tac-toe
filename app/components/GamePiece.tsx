"use client";
import React, { useState } from "react";
import styled, { keyframes } from "styled-components";

// Кожна фішка отримує свій власний "почерк" - трохи інший кут падіння,
// горизонтальний зсув і кут спокою, - щоб розстановка не виглядала штамповано.
const randRange = (min: number, max: number) => Math.random() * (max - min) + min;

// Єдина анімація трансформацій фішки: падіння (гравітація) -> удар (сплющення) ->
// відскок (пружина) -> усадка з поворотом до кута спокою -> згасаюче похитування.
// animation-timing-function всередині кожного кадру задає окрему криву для
// свого відрізка (CSS дозволяє це робити для одного @keyframes).
const fallAndSettle = keyframes`
    0% {
        opacity: 0;
        transform: translate(calc(var(--tx) * 1px), -35px) rotate(calc(var(--rot-start) * 1deg)) scale(1.15);
        animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19);
    }
    28% {
        opacity: 1;
        transform: translate(calc(var(--tx) * 1px), 3px) rotate(calc(var(--rot-start) * 1deg)) scaleX(1.06) scaleY(0.88);
        animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    41% {
        transform: translate(calc(var(--tx) * 1px), -6px) rotate(calc(var(--rot-start) * 1deg)) scale(1.03);
        animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
    }
    50% {
        transform: translate(calc(var(--tx) * 1px), 0) rotate(calc(var(--rot-rest) * 1deg)) scale(1);
        animation-timing-function: ease-in-out;
    }
    71% {
        transform: translate(calc(var(--tx) * 1px), 0) rotate(calc((var(--rot-rest) + 2) * 1deg)) scale(1);
        animation-timing-function: ease-in-out;
    }
    84% {
        transform: translate(calc(var(--tx) * 1px), 0) rotate(calc((var(--rot-rest) - 1) * 1deg)) scale(1);
        animation-timing-function: ease-in-out;
    }
    94% {
        transform: translate(calc(var(--tx) * 1px), 0) rotate(calc((var(--rot-rest) + 0.5) * 1deg)) scale(1);
        animation-timing-function: ease-out;
    }
    100% {
        transform: translate(calc(var(--tx) * 1px), 0) rotate(calc(var(--rot-rest) * 1deg)) scale(1);
    }
`;

// Тінь під фішкою: маленька й бліда, поки фішка високо, витягується й
// темнішає точно в момент удару, потім заспокоюється до м'якої "idle" тіні.
const shadowPulse = keyframes`
    0% { opacity: 0.08; transform: translateX(-50%) scale(0.55, 0.4); }
    20% { opacity: 0.18; transform: translateX(-50%) scale(0.8, 0.55); }
    28% { opacity: 0.5; transform: translateX(-50%) scale(1.2, 0.85); }
    41% { opacity: 0.22; transform: translateX(-50%) scale(0.85, 0.65); }
    50% { opacity: 0.35; transform: translateX(-50%) scale(1, 0.75); }
    100% { opacity: 0.28; transform: translateX(-50%) scale(0.95, 0.7); }
`;

// Кругова хвиля - з'являється рівно в момент удару фішки об дошку.
const ripplePulse = keyframes`
    0% { opacity: 0.35; transform: translateX(-50%) scale(0.4); }
    100% { opacity: 0; transform: translateX(-50%) scale(1.5); }
`;

const reducedFade = keyframes`
    0% { opacity: 0; transform: scale(0.9); }
    100% { opacity: 1; transform: scale(1); }
`;

const PieceWrapper = styled.div<{ $tx: number; $rotStart: number; $rotRest: number }>`
    position: relative;
    width: 70%;
    height: 70%;
    display: flex;
    align-items: center;
    justify-content: center;
    --tx: ${(p) => p.$tx};
    --rot-start: ${(p) => p.$rotStart};
    --rot-rest: ${(p) => p.$rotRest};
`;

const PieceShadow = styled.div`
    position: absolute;
    left: 50%;
    bottom: 6%;
    width: 72%;
    height: 22%;
    border-radius: 50%;
    background: radial-gradient(closest-side, rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0) 75%);
    filter: blur(1.5px);
    transform: translateX(-50%) scale(0.95, 0.7);
    opacity: 0.28;
    animation: ${shadowPulse} 680ms both;
    pointer-events: none;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

const PieceRipple = styled.div`
    position: absolute;
    left: 50%;
    bottom: 12%;
    width: 58%;
    height: 58%;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.55);
    opacity: 0;
    transform: translateX(-50%) scale(0.4);
    animation: ${ripplePulse} 300ms ease-out 190ms forwards;
    pointer-events: none;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
        display: none;
    }
`;

const PieceImg = styled.img`
    position: relative;
    width: 100%;
    height: 100%;
    object-fit: contain;
    will-change: transform, opacity;
    animation: ${fallAndSettle} 680ms both;
    filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.25));

    @media (prefers-reduced-motion: reduce) {
        animation: ${reducedFade} 150ms ease-out both;
    }
`;

type GamePieceProps = {
    src: string;
    alt?: string;
    className?: string;
};

// Обгортка над маркером X/O (яким би не було зображення теми) - додає
// "тактильну" анімацію розстановки: падіння, удар, відскок, усадку й
// коротке похитування, без жодного зсуву макета (лише transform/opacity).
export const GamePiece: React.FC<GamePieceProps> = ({ src, alt = "marker", className }) => {
    const [random] = useState(() => ({
        tx: randRange(-4, 4),
        rotStart: randRange(-12, 12),
        rotRest: randRange(-2, 2),
    }));

    return (
        <PieceWrapper className={className} $tx={random.tx} $rotStart={random.rotStart} $rotRest={random.rotRest}>
            <PieceShadow />
            <PieceRipple />
            <PieceImg src={src} alt={alt} draggable={false} />
        </PieceWrapper>
    );
};
