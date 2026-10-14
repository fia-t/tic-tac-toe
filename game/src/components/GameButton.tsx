"use client";
import React, { forwardRef } from "react";
import styled, { css } from "styled-components";
import { assetUrl } from "@game/lib/assets";

// Єдина кнопка проєкту. Форма - завжди еталонна плитка public/images/ui/button-base-gold.png
// (з "Blank cream game button base.png"), для прямокутних кнопок - через 9-slice
// (border-image): кути й бортик не спотворюються, тягнеться лише центр. Жодних додаткових
// рамок чи тіней - лише картинка, текст і SVG-іконка поверх.

export type GameButtonSize = "xs" | "sm" | "md" | "lg" | "xl";
export type GameButtonTone = "default" | "accent" | "danger" | "gold";

// h - висота, c - товщина кута (скільки пікселів займає заокруглений бортик), fs - шрифт,
// px - горизонтальний відступ тексту від краю кнопки.
const SIZES: Record<GameButtonSize, { h: number; c: number; fs: number; px: number }> = {
    xs: { h: 32, c: 11, fs: 12, px: 12 },
    sm: { h: 40, c: 13, fs: 13, px: 14 },
    md: { h: 48, c: 16, fs: 15, px: 18 },
    lg: { h: 56, c: 19, fs: 16, px: 22 },
    xl: { h: 72, c: 24, fs: 18, px: 24 },
};

// Мобільна версія (вузький екран / iframe порталу на телефоні): крок менше, але не нижче 40 px
// для кнопок, у які треба влучати пальцем.
const MOBILE_STEP: Record<GameButtonSize, GameButtonSize> = { xs: "xs", sm: "sm", md: "sm", lg: "md", xl: "lg" };

const BASE_URL = assetUrl("images/ui/button-base-gold.png");

const TONE_COLOR: Record<GameButtonTone, string> = {
    default: "#5b3f22",
    accent: "#0f6f8c",
    danger: "#b32f1c",
    gold: "#6b4306",
};

const sizeVars = (size: GameButtonSize) => {
    const s = SIZES[size];
    return css`
        --gb-h: ${s.h}px;
        --gb-c: ${s.c}px;
        --gb-fs: ${s.fs}px;
        --gb-px: ${s.px}px;
    `;
};

// Вигляд без розміру - для елементів, що лише виглядають як кнопка (напр. "обличчя" картки режиму).
export const gameButtonFace = css`
    box-sizing: border-box;
    border-style: solid;
    border-color: transparent;
    border-width: var(--gb-c, 16px);
    border-image: url("${BASE_URL}") 30% fill / var(--gb-c, 16px) stretch;
    background: transparent;
    box-shadow: none;
    color: ${TONE_COLOR.default};
    transition:
        transform 0.12s ease,
        filter 0.12s ease;

    &[data-tone="accent"] {
        color: ${TONE_COLOR.accent};
    }
    &[data-tone="danger"] {
        color: ${TONE_COLOR.danger};
    }
    &[data-tone="gold"] {
        color: ${TONE_COLOR.gold};
        filter: sepia(0.35) saturate(1.8) hue-rotate(-8deg);
    }
`;

const states = css`
    @media (hover: hover) {
        &:hover:not(:disabled) {
            filter: brightness(1.05) saturate(1.06);
            transform: translateY(-1px);
        }
        &[data-tone="gold"]:hover:not(:disabled) {
            filter: sepia(0.35) saturate(1.8) hue-rotate(-8deg) brightness(1.05);
        }
    }

    /* Активна (вибрана) - вибраний рівень, режим, вкладка. */
    &[data-selected="true"],
    &[aria-pressed="true"],
    &[aria-current="page"] {
        color: ${TONE_COLOR.accent};
        filter: brightness(0.93) saturate(1.3);
        transform: translateY(1px);
    }

    /* Натиснута в момент кліку. */
    &:active:not(:disabled) {
        filter: brightness(0.9) saturate(1.2);
        transform: translateY(2px) scale(0.98);
    }

    /* Неактивна. */
    &:disabled,
    &[aria-disabled="true"] {
        cursor: not-allowed;
        filter: grayscale(0.55) opacity(0.55);
        transform: none;
    }

    &:focus-visible {
        outline: 3px solid #1fb3d9;
        outline-offset: 3px;
    }
`;

export const gameButtonCss = (size: GameButtonSize = "md", options: { square?: boolean; mobileSize?: GameButtonSize } = {}) => css`
    ${sizeVars(size)}
    ${gameButtonFace}
    ${states}
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: var(--gb-h);
    ${options.square ? "width: var(--gb-h); height: var(--gb-h); padding: 0;" : "padding: 0 max(2px, calc(var(--gb-px) - var(--gb-c)));"}
    font: inherit;
    font-size: var(--gb-fs);
    font-weight: 800;
    line-height: 1.1;
    text-align: center;
    cursor: pointer;
    touch-action: manipulation;
    user-select: none;
    -webkit-tap-highlight-color: transparent;

    @media (max-width: 640px) {
        ${sizeVars(options.mobileSize ?? MOBILE_STEP[size])}
    }
`;

const Root = styled.button<{ $size: GameButtonSize; $square: boolean; $block: boolean; $mobile?: GameButtonSize }>`
    ${({ $size, $square, $mobile }) => gameButtonCss($size, { square: $square, mobileSize: $mobile })}
    ${({ $block }) => ($block ? "display: flex; width: 100%;" : "")}
`;

// SVG-іконка - окремий шар, точно по центру кнопки (для кнопок лише з іконкою).
const IconLayer = styled.span`
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
`;

const InlineIcon = styled.span`
    display: inline-grid;
    place-items: center;
    flex-shrink: 0;
`;

export type GameButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: GameButtonSize;
    // Розмір на вузькому екрані; за замовчуванням - на крок менший.
    mobileSize?: GameButtonSize;
    // Квадратна кнопка (зазвичай лише з іконкою).
    square?: boolean;
    // На всю ширину контейнера.
    block?: boolean;
    tone?: GameButtonTone;
    // Активний (вибраний) стан - для перемикачів без aria-pressed.
    selected?: boolean;
    icon?: React.ReactNode;
};

export const GameButton = forwardRef<HTMLButtonElement, GameButtonProps>(function GameButton(
    { size = "md", mobileSize, square = false, block = false, tone = "default", selected, icon, children, type = "button", ...rest },
    ref
) {
    const iconOnly = icon !== undefined && (children === undefined || children === null || children === false);
    return (
        <Root
            ref={ref}
            type={type}
            $size={size}
            $square={square}
            $block={block}
            $mobile={mobileSize}
            data-tone={tone === "default" ? undefined : tone}
            data-selected={selected ? "true" : undefined}
            {...rest}
        >
            {iconOnly ? (
                <IconLayer>{icon}</IconLayer>
            ) : (
                <>
                    {icon !== undefined && <InlineIcon>{icon}</InlineIcon>}
                    {children}
                </>
            )}
        </Root>
    );
});
