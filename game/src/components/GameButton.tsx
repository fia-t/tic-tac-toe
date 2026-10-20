"use client";
import React, { forwardRef } from "react";
import styled, { css } from "styled-components";
import { assetUrl } from "@game/lib/assets";

// Єдина кнопка проєкту. Форма - завжди еталонна плитка public/images/ui/button-base-gold.png
// (з "Blank cream game button base.png"), для прямокутних кнопок - через 9-slice
// (border-image): кути й бортик не спотворюються, тягнеться лише центр. Жодних додаткових
// рамок чи тіней - лише картинка, текст і SVG-іконка поверх.

export type GameButtonSize = "xs" | "sm" | "md" | "lg" | "xl";
// Кольори - та сама еталонна форма, перефарбована зі збереженням світлотіні:
// default - кремова (звичайні кнопки, #49301F), primary - глибока бірюзова #176B78 ("Грати", головна дія),
// wood - горіхова #80532F (вибраний варіант: рівень, модифікатор, вкладка), danger - червона, amber - золота.
// green - зелена (рівень "Легкий" у "світлофорі" складності).
export type GameButtonTone = "default" | "primary" | "wood" | "danger" | "amber" | "green";

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

// fill - колір центру основи (для підкладки, див. gameButtonFace).
const TONES: Record<GameButtonTone, { img: string; fill: string; color: string; shadow: string }> = {
    // Другорядні кнопки - кремова основа з пом'якшеними блиском і нижньою кромкою (менше візуальної ваги).
    default: { img: "button-base-cream.png", fill: "#f6e2b8", color: "#49301f", shadow: "none" },
    primary: { img: "button-base-teal.png", fill: "#1a6d7a", color: "#fff7e8", shadow: "0 1px 1px rgba(5, 40, 45, 0.4)" },
    wood: { img: "button-base-wood.png", fill: "#815532", color: "#fff7e8", shadow: "0 1px 1px rgba(50, 25, 5, 0.45)" },
    danger: { img: "button-base-red.png", fill: "#cc442d", color: "#ffffff", shadow: "0 1px 1px rgba(90, 20, 5, 0.45)" },
    amber: { img: "button-base-amber.png", fill: "#f3b638", color: "#4a2c0c", shadow: "0 1px 0 rgba(255, 240, 200, 0.6)" },
    green: { img: "button-base-green.png", fill: "#3d9548", color: "#fff7e8", shadow: "0 1px 1px rgba(10, 50, 15, 0.45)" },
};

// Колір кнопки - картинка-основа плюс колір тексту. Можна підставляти в будь-який styled-компонент.
export const buttonTone = (tone: GameButtonTone) => css`
    border-image-source: url("${assetUrl(`images/ui/${TONES[tone].img}`)}");
    --gb-fill: ${TONES[tone].fill};
    color: ${TONES[tone].color};
    text-shadow: ${TONES[tone].shadow};
`;

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
    border-image: url("${assetUrl("images/ui/button-base-cream.png")}") 30% fill / var(--gb-c, 16px) stretch;
    /* Підкладка кольору центру трохи ширша за центральну частину 9-slice: на дробовому масштабі
       екрана між частинами border-image бувають субпіксельні щілини - так крізь них не видно фон. */
    background-color: transparent;
    background-image: linear-gradient(var(--gb-fill, #f6e2b8), var(--gb-fill, #f6e2b8));
    background-origin: border-box;
    background-clip: border-box;
    background-position: center;
    background-repeat: no-repeat;
    background-size: calc(100% - 2 * var(--gb-c, 16px) + 6px) calc(100% - 2 * var(--gb-c, 16px) + 6px);
    box-shadow: none;
    ${buttonTone("default")}
    transition:
        transform 0.12s ease,
        filter 0.12s ease;

    &[data-tone="primary"] {
        ${buttonTone("primary")}
    }
    &[data-tone="wood"] {
        ${buttonTone("wood")}
    }
    &[data-tone="danger"] {
        ${buttonTone("danger")}
    }
    &[data-tone="amber"] {
        ${buttonTone("amber")}
    }
    &[data-tone="green"] {
        ${buttonTone("green")}
    }
`;

const states = css`
    @media (hover: hover) {
        /* Тіні під кнопкою немає; при наведенні - ледь помітна. */
        &:hover:not(:disabled) {
            filter: brightness(1.04) drop-shadow(0 3px 5px rgba(73, 48, 31, 0.14));
            transform: translateY(-1px);
        }
    }

    /* Активна (вибрана) - вибраний рівень, режим, вкладка: дерев'яна кнопка зі світлим текстом. */
    &[data-selected="true"],
    &[aria-pressed="true"],
    &[aria-current="page"] {
        ${buttonTone("wood")}
    }

    /* Натиснута в момент кліку. */
    &:active:not(:disabled) {
        filter: brightness(0.9);
        transform: translateY(2px) scale(0.98);
    }

    /* Неактивна. */
    &:disabled,
    &[aria-disabled="true"] {
        cursor: not-allowed;
        filter: var(--gb-disabled-filter, grayscale(0.6) opacity(0.6));
        transform: none;
    }

    &:focus-visible {
        outline: 3px solid #1fb3d9;
        outline-offset: 3px;
    }
`;

export const gameButtonCss = (
    size: GameButtonSize = "md",
    options: { square?: boolean; mobileSize?: GameButtonSize; tone?: GameButtonTone } = {}
) => css`
    ${sizeVars(size)}
    ${gameButtonFace}
    ${options.tone && options.tone !== "default" ? buttonTone(options.tone) : ""}
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

    /* Іконка не стискається до вузької зони між бортиками - лишається свого розміру по центру. */
    & > svg {
        flex-shrink: 0;
    }

    @media (max-width: 640px) {
        ${sizeVars(options.mobileSize ?? MOBILE_STEP[size])}
    }
`;

const Root = styled.button<{ $size: GameButtonSize; $square: boolean; $block: boolean; $mobile?: GameButtonSize }>`
    ${({ $size, $square, $mobile }) => gameButtonCss($size, { square: $square, mobileSize: $mobile })}
    ${({ $block }) => ($block ? "display: flex; width: 100%;" : "")}
`;

// SVG-іконка - окремий шар, точно по центру кнопки (для кнопок лише з іконкою).
// Від'ємний inset на товщину бортика: шар займає всю кнопку, а не вузьку зону всередині
// border-image, інакше іконка, більша за цю зону, з'їжджає вправо-вниз.
const IconLayer = styled.span`
    position: absolute;
    inset: calc(-1 * var(--gb-c, 0px));
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
