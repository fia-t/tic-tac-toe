"use client";
import React from "react";
import styled, { css } from "styled-components";
import { buttonTone, gameButtonCss } from "@game/components/GameButton";
import type { Difficulty } from "@game/lib/difficulty";
import type { Modifier } from "@game/lib/modifiers";

// Спільні елементи вибору партії - на головній ("Швидка гра") і в смузі над полем:
// складність бота ("світлофор"), іконки модифікаторів і тултіпи.

// Тултіп із data-tip: з'являється при наведенні або фокусі клавіатурою. За замовчуванням - під
// кнопкою (над кнопками стоять підписи груп, а над полем - шапка). Кнопка з відкритим тултіпом
// піднімається над сусідами: при наведенні вона отримує filter (окремий шар), і тултіп інакше
// ховався б під кнопками нижче.
export const tipCss = css`
    &::after {
        content: attr(data-tip);
        position: absolute;
        left: 50%;
        top: calc(100% + var(--gb-c, 0px) + 6px);
        transform: translateX(-50%);
        padding: 4px 9px;
        border-radius: 8px;
        background: #49301f;
        color: #fff7e8;
        font: 400 13px/1.2 var(--font-body);
        white-space: nowrap;
        text-shadow: none;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.12s ease;
        z-index: 25;
    }

    @media (hover: hover) {
        &:hover::after {
            opacity: 1;
        }
    }

    &:focus-visible::after {
        opacity: 1;
    }

    &:hover,
    &:focus-visible {
        z-index: 26;
    }
`;

// Складність бота - "світлофор": вибраний рівень у своєму кольорі.
const DIFF_TONE = { easy: "green", medium: "amber", master: "danger" } as const;

export const DiffButton = styled.button<{ $level: Difficulty }>`
    ${gameButtonCss("sm")}
    /* && - сильніше за мобільні розміри gameButtonCss (вони в @media). Висота - як у кнопок
       модифікаторів поруч (46 px, на телефоні 42), трохи ширші й з більшим текстом. */
    && {
        --gb-c: 13px;
        min-height: 46px;
        padding: 0 8px;
        font-size: 15px;
    }

    @media (max-width: 480px) {
        && {
            min-height: 42px;
            padding: 0 5px;
            font-size: 14px;
        }
    }

    &&[aria-pressed="true"] {
        ${({ $level }) => buttonTone(DIFF_TONE[$level])}
    }
`;

export const DiffGroup = styled.div`
    display: inline-flex;
    flex-wrap: nowrap;
    gap: 6px;
`;

// Іконки модифікаторів: назва - у тултіпі й aria-label.
const MOD_ICON_PATHS: Record<Modifier | "none", React.ReactNode> = {
    none: <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />,
    vanish: (
        <>
            <path d="M4 4l9 9M13 4l-9 9" />
            <path d="M15 15l5 5M20 15l-5 5" strokeDasharray="2 2.4" />
        </>
    ),
    gravity: <path d="M12 3v12M6.5 9.5 12 15l5.5-5.5M4 21h16" />,
    stones: (
        <>
            <ellipse cx="12" cy="17.2" rx="8.5" ry="4.2" />
            <ellipse cx="8.3" cy="10.8" rx="4.3" ry="3.1" transform="rotate(-12 8.3 10.8)" />
            <ellipse cx="16" cy="9.6" rx="3.5" ry="2.7" transform="rotate(10 16 9.6)" />
            <path d="M8 16.2c1.2-.8 2.6-1 4-.9M6.4 9.9c.6-.6 1.3-.9 2.1-1M15.2 8.7c.4-.3.9-.5 1.4-.5" strokeWidth="1.5" />
        </>
    ),
    timer: (
        <>
            <circle cx="12" cy="13.5" r="7.5" />
            <path d="M12 9.5v4l2.8 1.8M9 2.5h6" />
        </>
    ),
    misere: <path d="M7 4v15M3.5 15.5 7 19l3.5-3.5M17 20V5M13.5 8.5 17 5l3.5 3.5" />,
    // Кріт - лапа з кігтями: контурна подушечка, чотири пальці й кігтики.
    mole: (
        <>
            <path d="M8 19.8c-1.7-1-1.9-3.5-.4-5.2 1.1-1.3 2.6-2 4.4-2s3.3.7 4.4 2c1.5 1.7 1.3 4.2-.4 5.2-1.2.7-2.6 1-4 1s-2.8-.3-4-1z" />
            <circle cx="5.4" cy="11.7" r="1.7" fill="currentColor" stroke="none" />
            <circle cx="9.2" cy="8.6" r="1.8" fill="currentColor" stroke="none" />
            <circle cx="14.8" cy="8.6" r="1.8" fill="currentColor" stroke="none" />
            <circle cx="18.6" cy="11.7" r="1.7" fill="currentColor" stroke="none" />
            <path d="M4.4 9.8 3.5 7.8M8.7 6.7 8.3 4.3M15.3 6.7l.4-2.4M19.6 9.8l.9-2" strokeWidth="1.7" />
        </>
    ),
};

export const ModIcon = ({ id, size = 22 }: { id: Modifier | null; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {MOD_ICON_PATHS[id ?? "none"]}
    </svg>
);

export const ModButton = styled.button`
    ${gameButtonCss("xs", { square: true })}
    position: relative;
    flex-shrink: 0;
    ${tipCss}

    && {
        --gb-c: 13px;
        width: 46px;
        height: 46px;
        min-height: 46px;
        padding: 0;
    }

    & > svg {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
    }

    /* Неактивна іконка: приглушуємо саму кнопку (світла вуаль і бліда іконка), а не через filter
       на всій кнопці - інакше блідим ставав би й тултіп. */
    &&:disabled {
        filter: none;
    }

    &:disabled > svg {
        opacity: 0.35;
    }

    &:disabled::before {
        content: "";
        position: absolute;
        inset: calc(-1 * var(--gb-c, 0px));
        border-radius: 12px;
        background: rgba(255, 250, 240, 0.5);
        pointer-events: none;
    }

    @media (max-width: 480px) {
        && {
            width: 42px;
            height: 42px;
            min-height: 42px;
        }
    }
`;

export const ModRow = styled.div`
    display: flex;
    flex-wrap: nowrap;
    gap: 6px;

    @media (max-width: 480px) {
        gap: 4px;
    }
`;

// Іконки дій (заново, гра з другом, бустери) - круглі кремові кнопки.
const ACTION_ICONS = {
    restart: (
        <>
            <path d="M20 12a8 8 0 1 1-2.6-5.9" />
            <path d="M20 4v5h-5" />
        </>
    ),
    friend: (
        <>
            <circle cx="8" cy="8" r="3" />
            <circle cx="16.5" cy="8" r="3" />
            <path d="M2.5 19c.5-3.2 2.7-5 5.5-5s5 1.8 5.5 5" />
            <path d="M13.5 14.4c.9-.3 1.9-.4 3-.4 2.8 0 5 1.8 5.5 5" />
        </>
    ),
    hint: (
        <>
            <path d="M9 18h6M10 21h4" />
            <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3z" />
        </>
    ),
    undo: (
        <>
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
        </>
    ),
    pause: (
        <>
            <rect x="6.5" y="5" width="3.5" height="14" rx="1" />
            <rect x="14" y="5" width="3.5" height="14" rx="1" />
        </>
    ),
    // Сніжинка: шість рівних променів під 60°, на кожному - гілочка.
    freeze: (
        <>
            <path d="M12 2L12 22M20.66 7L3.34 17M20.66 17L3.34 7" />
            <path d="M14.12 19.32L12 17.2L9.88 19.32M6.72 17.5L7.5 14.6L4.6 13.82M4.6 10.18L7.5 9.4L6.72 6.5M9.88 4.68L12 6.8L14.12 4.68M17.28 6.5L16.5 9.4L19.4 10.18M19.4 13.82L16.5 14.6L17.28 17.5" strokeWidth="1.8" />
        </>
    ),
};

export const ActionIcon = ({ id }: { id: keyof typeof ACTION_ICONS }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ACTION_ICONS[id]}
    </svg>
);

export const RoundButton = styled.button`
    ${gameButtonCss("lg", { square: true })}
    position: relative;
    flex-shrink: 0;
    border-radius: 50%;
    ${tipCss}

    && {
        --gb-c: 13px;
        width: 52px;
        height: 52px;
        min-height: 52px;
    }

    & > svg {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
    }

    @media (max-width: 480px) {
        && {
            --gb-c: 11px;
            width: 44px;
            height: 44px;
            min-height: 44px;
        }
    }
`;
