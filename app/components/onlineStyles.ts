"use client";
import styled, { keyframes } from "styled-components";

// Стилі для онлайн-режиму "Гра з другом" - витримані в тій самій пляжній
// пісочно-бежевій палітрі, що й gameStyles.ts, але окремо, щоб не роздувати
// існуючий файл стилів класичної/Ultimate гри.

export const ModalCard = styled.div`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(92vw, 420px);
    max-height: 88vh;
    overflow-y: auto;
    box-sizing: border-box;
    background: linear-gradient(160deg, #fff6e6 0%, #f7e6c4 100%);
    border-radius: 24px;
    padding: 24px;
    box-shadow:
        0 12px 30px rgba(101, 72, 35, 0.35),
        inset 1px 1px 1px rgba(255, 255, 255, 0.6);
    color: #5b3f22;
    z-index: 1001;

    @media (max-width: 480px) {
        padding: 18px;
        border-radius: 18px;
    }
`;

export const ModalCloseButton = styled.button`
    position: absolute;
    top: 14px;
    right: 14px;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 10px;
    background: rgba(139, 101, 60, 0.15);
    color: #6b4a25;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
        background: rgba(139, 101, 60, 0.25);
    }
`;

export const ModalTitle = styled.h2`
    margin: 0 0 16px;
    padding-right: 30px;
    font-size: clamp(18px, 5vw, 22px);
    font-weight: 700;
    color: #5b3f22;
`;

export const ModalSubtitle = styled.p`
    margin: 0 0 12px;
    font-size: 14px;
    color: #7a5a35;
`;

export const ModeOptionGroup = styled.div`
    display: flex;
    gap: 10px;
    margin-bottom: 18px;

    @media (max-width: 420px) {
        flex-direction: column;
    }
`;

export const ModeOption = styled.button<{ $active: boolean }>`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 14px 10px;
    border-radius: 16px;
    cursor: pointer;
    border: 2px solid ${({ $active }) => ($active ? "#c9974f" : "transparent")};
    background: ${({ $active }) =>
        $active
            ? "linear-gradient(155deg, #f5e0b6 0%, #ecd1a1 45%, #dfbd89 100%)"
            : "rgba(139, 101, 60, 0.08)"};
    box-shadow: ${({ $active }) =>
        $active ? "2px 3px 6px rgba(101, 72, 35, 0.3), inset 1px 1px 1px rgba(255,255,255,0.5)" : "none"};
    color: #5b3f22;
    font-weight: 600;
    font-size: 14px;
    transition: transform 0.15s ease;

    &:hover {
        transform: translateY(-1px);
    }
`;

export const ModeOptionHint = styled.span`
    font-size: 12px;
    font-weight: 400;
    color: #8a6a42;
`;

export const PillButton = styled.button<{ $variant?: "primary" | "ghost" }>`
    width: 100%;
    padding: 12px 16px;
    border: none;
    border-radius: 14px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 700;
    margin-top: 10px;
    touch-action: manipulation;
    transition: transform 0.15s ease, opacity 0.15s ease;

    ${({ $variant }) =>
        $variant === "ghost"
            ? `
        background: rgba(139, 101, 60, 0.12);
        color: #6b4a25;
        box-shadow: none;
    `
            : `
        background: linear-gradient(155deg, #f5e0b6 0%, #ecd1a1 45%, #dfbd89 100%);
        color: #5b3f22;
        box-shadow: 3px 4px 8px rgba(101, 72, 35, 0.3), inset 1px 1px 1px rgba(255,255,255,0.5);
    `}

    &:hover {
        transform: translateY(-1px);
    }

    &:active {
        transform: translateY(1px) scale(0.98);
    }

    &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
        transform: none;
    }
`;

export const ButtonRow = styled.div`
    display: flex;
    gap: 10px;

    ${PillButton} {
        margin-top: 0;
        width: auto;
        flex: 1;
    }
`;

export const TextInput = styled.input`
    width: 100%;
    box-sizing: border-box;
    padding: 11px 14px;
    border-radius: 12px;
    border: 2px solid rgba(139, 101, 60, 0.25);
    background: #fffaf0;
    color: #5b3f22;
    font-size: 14px;
    outline: none;

    &:focus {
        border-color: #c9974f;
    }
`;

export const InviteLinkRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: stretch;
    margin: 10px 0;
`;

export const InviteLinkBox = styled.div`
    flex: 1;
    min-width: 0;
    padding: 11px 12px;
    border-radius: 12px;
    background: #fffaf0;
    border: 2px solid rgba(139, 101, 60, 0.2);
    color: #5b3f22;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const CopyIconButton = styled.button`
    flex-shrink: 0;
    padding: 0 14px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(155deg, #f5e0b6 0%, #ecd1a1 45%, #dfbd89 100%);
    color: #5b3f22;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    box-shadow: 2px 3px 6px rgba(101, 72, 35, 0.3);

    &:hover {
        transform: translateY(-1px);
    }
`;

export const CopyFeedback = styled.span`
    display: inline-block;
    margin-top: 4px;
    font-size: 13px;
    color: #3f7a4d;
    font-weight: 600;
`;

const pulse = keyframes`
    0%, 100% { opacity: 0.35; }
    50% { opacity: 1; }
`;

export const WaitingText = styled.p`
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 16px 0 0;
    font-size: 14px;
    color: #7a5a35;

    &::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #c9974f;
        animation: ${pulse} 1.4s ease-in-out infinite;
    }
`;

export const ErrorText = styled.p`
    margin: 10px 0 0;
    font-size: 13px;
    color: #b3402c;
    font-weight: 600;
`;

// --- Ігрове поле онлайн-режиму (динамічний розмір 3x3 / 9x9) ---

export const OnlineBoardContainer = styled.div<{ $size: number; $backgroundUrl?: string }>`
    width: min(92vw, 420px);
    aspect-ratio: 1 / 1;
    background: url("${({ $backgroundUrl }) => $backgroundUrl || "/images/sand.png"}") no-repeat center/cover;
    position: relative;
    display: grid;
    grid-template-columns: ${({ $size }) => `repeat(${$size}, 1fr)`};
    grid-template-rows: ${({ $size }) => `repeat(${$size}, 1fr)`};
    gap: 0;
    padding: 10px;
    box-sizing: border-box;
    border-radius: 18px;
    overflow: hidden;
`;

export const OnlineCell = styled.div<{ $borderRight: boolean; $borderBottom: boolean; $disabled: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background-color: transparent;
    border-right: ${({ $borderRight }) => ($borderRight ? "3px solid #8B4513" : "none")};
    border-bottom: ${({ $borderBottom }) => ($borderBottom ? "3px solid #8B4513" : "none")};
    cursor: ${({ $disabled }) => ($disabled ? "default" : "pointer")};
    touch-action: manipulation;
`;

export const TurnBanner = styled.div<{ $myTurn: boolean }>`
    width: min(92vw, 420px);
    text-align: center;
    padding: 8px 14px;
    margin-bottom: 10px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 14px;
    box-sizing: border-box;
    color: ${({ $myTurn }) => ($myTurn ? "#3f7a4d" : "#7a5a35")};
    background: ${({ $myTurn }) => ($myTurn ? "rgba(76, 175, 80, 0.18)" : "rgba(139, 101, 60, 0.12)")};
`;

export const OnlineLayout = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
`;

export const OpponentLeftCard = styled.div`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(92vw, 360px);
    box-sizing: border-box;
    background: linear-gradient(160deg, #fff6e6 0%, #f7e6c4 100%);
    border-radius: 20px;
    padding: 22px;
    text-align: center;
    box-shadow: 0 12px 30px rgba(101, 72, 35, 0.35);
    color: #5b3f22;
    z-index: 1001;
`;

export const RoomCodeBadge = styled.div`
    display: inline-block;
    padding: 6px 14px;
    border-radius: 10px;
    background: rgba(139, 101, 60, 0.12);
    color: #5b3f22;
    font-weight: 700;
    letter-spacing: 2px;
    font-size: 15px;
    margin-bottom: 4px;
`;
