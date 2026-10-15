"use client";
import React from "react";
import styled, { keyframes } from "styled-components";
import { useT } from "@game/lib/i18n";

// Тематичний лоадер (замість сірого спінера): маленьке поле 3×3, на якому по черзі
// "ставляться" хрестики й нулики - як ходи партії, - потім поле очищається й усе по колу.
// Під полем - підпис "Завантаження...".

// Ходи по клітинках 0-8 (зліва направо, згори вниз): хрестик, нулик, хрестик...
const MOVES = [4, 0, 2, 6, 3];
const CYCLE = 3.2;
const STEP = 0.35;

// Фішка з'являється у свою чергу, тримається до кінця циклу й зникає разом з усіма.
const place = (index: number) => {
    const at = ((index * STEP) / CYCLE) * 100;
    return keyframes`
        0%, ${at}% { opacity: 0; transform: scale(0.3); }
        ${at + 5}% { opacity: 1; transform: scale(1.15); }
        ${at + 9}%, 86% { opacity: 1; transform: scale(1); }
        96%, 100% { opacity: 0; transform: scale(0.8); }
    `;
};

const PLACE = MOVES.map((_, i) => place(i));

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    min-height: 260px;
    padding: 24px 0;
    color: #7a5530;
    font-weight: 800;
    font-size: 15px;

    @media (prefers-reduced-motion: reduce) {
        svg {
            animation: none !important;
            opacity: 1 !important;
        }
    }
`;

const Board = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 34px);
    grid-template-rows: repeat(3, 34px);
    gap: 5px;
    padding: 8px;
    border-radius: 16px;
    background: #f6d39e;
    box-shadow: inset 0 -4px 0 #ddae6b, inset 0 3px 0 #ffebcb, 0 8px 16px rgba(120, 80, 30, 0.18);
`;

const Cell = styled.div<{ $order: number }>`
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: #fbe7c6;
    box-shadow: inset 0 2px 4px rgba(160, 105, 40, 0.28);

    svg {
        width: 24px;
        height: 24px;
        opacity: 0;
        animation: ${({ $order }) => ($order >= 0 ? PLACE[$order] : "none")} ${CYCLE}s ease-out infinite;
    }
`;

const Cross = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5l14 14M19 5 5 19" stroke="#e8452f" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
);

const Ring = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7.5" fill="none" stroke="#1fb3d9" strokeWidth="4.5" />
    </svg>
);

export const GameLoader: React.FC<{ label?: string }> = ({ label }) => {
    const t = useT();
    return (
        <Wrap role="status" aria-live="polite">
            <Board aria-hidden="true">
                {Array.from({ length: 9 }, (_, cell) => {
                    const order = MOVES.indexOf(cell);
                    return (
                        <Cell key={cell} $order={order}>
                            {order >= 0 && (order % 2 === 0 ? <Cross /> : <Ring />)}
                        </Cell>
                    );
                })}
            </Board>
            <span>{label ?? t("loading")}</span>
        </Wrap>
    );
};
