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
    // Кріт - силует згори: видовжене тіло з носиком, передні лапи віялом кігтів, задні лапки, хвостик.
    mole: (
        <>
            <path d="M12 2.4c-.8 1.3-1.3 2.8-1.6 4.2C8.3 7.6 7 10.2 7 13.6c0 3.9 2.1 7 5 7s5-3.1 5-7c0-3.4-1.3-6-3.4-7-.3-1.4-.8-2.9-1.6-4.2z" fill="currentColor" stroke="none" />
            <circle cx="8.6" cy="10.9" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="15.4" cy="10.9" r="1.5" fill="currentColor" stroke="none" />
            <path d="M7.35 10.25L3.82 11.17L7.45 11.45zM7.58 10.07L3.94 9.71L7.27 11.22zM7.85 9.96L4.56 8.39L7.16 10.95zM8.15 9.96L5.59 7.36L7.16 10.65zM16.84 10.65L18.41 7.36L15.85 9.96zM16.84 10.95L19.44 8.39L16.15 9.96zM16.73 11.22L20.06 9.71L16.42 10.07zM16.55 11.45L20.18 11.17L16.65 10.25zM7.25 17.07L5.36 18.29L7.6 18.01zM7.45 16.87L5.21 17.17L7.36 17.86zM7.7 16.77L5.55 16.1L7.2 17.63zM16.8 17.63L18.45 16.1L16.3 16.77zM16.64 17.86L18.79 17.17L16.55 16.87zM16.4 18.01L18.64 18.29L16.75 17.07z" fill="currentColor" stroke="currentColor" strokeWidth=".8" strokeLinejoin="round" />
            <path d="M12 20.4c0 1.1-.4 1.9-1.2 2.4" strokeWidth="1.5" />
        </>
    ),
};

// Малюнки іконок різні за розміром і зміщенням у квадраті 24×24 - кожну вирівнюємо до центру й
// однакового візуального розміру (виміряно за межами малюнка); товщина лінії лишається 2.2.
const MOD_FIT: Record<Modifier | "none", [number, number, number]> = { none: [0.71,0.71,0.941], vanish: [-0.53,-0.53,1.044], gravity: [0.71,0.71,0.941], stones: [0.18,-1.69,0.987], timer: [0.99,1.21,0.918], mole: [-0.6,-1.23,1.05], misere: [0.13,0.13,0.99] };

export const ModIcon = ({ id, size = 22 }: { id: Modifier | null; size?: number }) => {
    const [tx, ty, k] = MOD_FIT[id ?? "none"];
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <g transform={`translate(${tx} ${ty}) scale(${k})`} strokeWidth={(2.2 / k).toFixed(2)}>
                {MOD_ICON_PATHS[id ?? "none"]}
            </g>
        </svg>
    );
};

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

    /* -1px: центр світлої частини кнопки, без нижнього бортика основи. */
    & > svg {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, calc(-50% - 1px));
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
