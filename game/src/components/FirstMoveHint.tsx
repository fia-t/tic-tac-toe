"use client";
import React from "react";
import styled, { keyframes } from "styled-components";
import { useT } from "@game/lib/i18n";

// Підказка новачку над полем, поки не зроблено першого ходу першої партії:
// за кого граєш і що робити. Після першої завершеної партії більше не показується.

const bob = keyframes`
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
`;

const Hint = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 8px;
    padding: 8px 14px;
    border-radius: 14px;
    background: #fff7e8;
    color: #49301f;
    font-size: 15px;
    font-weight: 800;
    text-align: center;
    animation: ${bob} 1.6s ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }

    @media (max-width: 640px) {
        font-size: 14px;
        padding: 6px 12px;
    }
`;

const Cross = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5 5l14 14M19 5 5 19" stroke="#e8452f" strokeWidth="4" strokeLinecap="round" />
    </svg>
);

export const FirstMoveHint: React.FC = () => {
    const t = useT();
    return (
        <Hint role="status">
            <Cross />
            {t("firstMoveHint")}
        </Hint>
    );
};
