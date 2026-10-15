"use client";
import React from "react";
import styled, { keyframes } from "styled-components";
import { assetUrl } from "@game/lib/assets";
import { useT } from "@game/lib/i18n";

// Тематичний лоадер (замість сірого спінера): логотип злегка підстрибує, під ним по черзі
// "ставляться" хрестик, нулик, хрестик - як перші ходи партії - і підпис "Завантаження...".

const bob = keyframes`
    0%, 100% { transform: translateY(0) rotate(-3deg); }
    50% { transform: translateY(-8px) rotate(3deg); }
`;

const place = keyframes`
    0%, 15% { opacity: 0; transform: scale(0.3); }
    30% { opacity: 1; transform: scale(1.15); }
    40%, 80% { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.8); }
`;

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

    img {
        width: 96px;
        height: 96px;
        animation: ${bob} 1.6s ease-in-out infinite;
    }

    @media (prefers-reduced-motion: reduce) {
        img,
        svg {
            animation: none !important;
            opacity: 1 !important;
        }
    }
`;

const Pieces = styled.div`
    display: flex;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 16px;
    background: rgba(255, 246, 230, 0.7);
    box-shadow: inset 0 -3px 0 #ebcb98;

    svg {
        width: 28px;
        height: 28px;
        opacity: 0;
        animation: ${place} 1.8s ease-out infinite;
    }

    svg:nth-child(2) {
        animation-delay: 0.3s;
    }

    svg:nth-child(3) {
        animation-delay: 0.6s;
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
            <img src={assetUrl("images/logo.png")} alt="" />
            <Pieces aria-hidden="true">
                <Cross />
                <Ring />
                <Cross />
            </Pieces>
            <span>{label ?? t("loading")}</span>
        </Wrap>
    );
};
