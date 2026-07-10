"use client";
import styled, { createGlobalStyle } from "styled-components";

// Базовий скид, щоб відсоткові/vw-розміри рахувались від реального
// розміру екрана телефона, а не від дефолтних відступів браузера.
export const GlobalStyle = createGlobalStyle`
    * {
        box-sizing: border-box;
    }
    html, body {
        margin: 0;
        padding: 0;
        min-height: 100%;
        /* Невидимий Tooltip (opacity: 0) все одно розтягує scrollWidth за
           межі екрана на вузьких телефонах, через що vw/fixed-центрування
           попапів (напр. "Гра з другом") зʼїжджає вбік. */
        overflow-x: hidden;
    }
`;

export const Container = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    width: 100%;
    padding: 16px;
    background-image: url('/images/background-image.jpg');
    background-size: cover;
    background-position: center;
    color: white;
`;

// Розташовує ігрове поле та панель кнопок: збоку одне від одного на широких
// екранах, одне під одним - на екрані смартфона.
export const GameLayout = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 20px;
    width: 100%;

    @media (max-width: 640px) {
        flex-direction: column;
        gap: 12px;
    }
`;

// Стилі для ігрового контейнера.
// Розмір поля - у vw з обмеженням зверху, тому воно вписується в екран
// будь-якого смартфона (Android/iPhone), лишаючись 480px на планшетах/десктопі.
export const BoardContainer = styled.div`
    width: min(92vw, 480px);
    aspect-ratio: 1 / 1;
    background: url('/images/sand.png') no-repeat center/cover;
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 0;
    padding: 10px;
    box-sizing: border-box;
`;

export const Cell = styled.div<{ $borderStyle?: string }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background-color: transparent;
    ${({ $borderStyle }) => $borderStyle};
    cursor: pointer;
    touch-action: manipulation;
`;

export const ButtonContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;

    @media (max-width: 640px) {
        flex-direction: row;
    }
`;

// Кнопка - лише прозора рамка-обгортка: сам вигляд (пісочна плитка,
// заокруглення, тінь, рельєф) уже намальований у PNG-іконці всередині.
export const Button = styled.button`
    width: 70px;
    height: 70px;
    flex-shrink: 0;
    border: none;
    border-radius: 22px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    touch-action: manipulation;
    transition: transform 0.15s ease;

    &:hover {
        transform: translateY(-1px);
    }

    &:active {
        transform: translateY(1px) scale(0.97);
    }
`;

// Іконки кнопок - самі PNG вже мають вигляд готової пісочної 3D-плитки,
// тож рендеримо їх на весь розмір кнопки без додаткового фону/рамки.
export const ControlIcon = styled.img`
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
`;

// Обгортка для кнопки з тултіпом - позиціонує підказку відносно самої кнопки.
export const ButtonWithTooltip = styled.div`
    position: relative;
    display: inline-flex;
`;

// Підказка виводиться праворуч від кнопки в тому ж пісочно-бежевому стилі,
// з маленьким "хвостиком", що вказує на кнопку.
export const Tooltip = styled.span`
    position: absolute;
    left: calc(100% + 12px);
    top: 50%;
    transform: translateY(-50%) translateX(-4px);
    background: linear-gradient(155deg, #f5e0b6 0%, #e6c890 100%);
    color: #6b4a25;
    font-size: 13px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 10px;
    white-space: nowrap;
    box-shadow:
        3px 3px 6px rgba(101, 72, 35, 0.3),
        -1px -1px 2px rgba(255, 250, 235, 0.5);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease, transform 0.15s ease;
    z-index: 10;

    &::before {
        content: "";
        position: absolute;
        right: 100%;
        top: 50%;
        transform: translateY(-50%);
        border: 6px solid transparent;
        border-right-color: #eecf9c;
    }

    ${ButtonWithTooltip}:hover & {
        opacity: 1;
        transform: translateY(-50%) translateX(0);
    }
`;

export const Popup = styled.div<{ $result: string }>`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 90vw;
    box-sizing: border-box;
    background: ${({ $result }) => ($result === "win" ? "#4CAF50" : $result === "lose" ? "#F44336" : "#FF9800")};
    color: white;
    padding: clamp(14px, 4vw, 20px);
    border-radius: 10px;
    box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.2);
    text-align: center;
    font-size: clamp(18px, 5vw, 24px);
    z-index: 1000;
    cursor: pointer;
`;

export const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
    cursor: pointer;
`;

export const borderStyles = [
    "border-right: 4px solid #8B4513; border-bottom: 4px solid #8B4513;",
    "border-right: 4px solid #8B4513; border-bottom: 4px solid #8B4513;",
    "border-bottom: 4px solid #8B4513;",
    "border-right: 4px solid #8B4513; border-bottom: 4px solid #8B4513;",
    "border-right: 4px solid #8B4513; border-bottom: 4px solid #8B4513;",
    "border-bottom: 4px solid #8B4513;",
    "border-right: 4px solid #8B4513;",
    "border-right: 4px solid #8B4513;",
    ""
];

// --- Стилі для Ultimate Tic-Tac-Toe (режим "Складний") ---

export const UltimateBoardContainer = styled.div`
    width: min(92vw, 460px);
    aspect-ratio: 1 / 1;
    background: url('/images/sand.png') no-repeat center/cover;
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 6px;
    padding: 10px;
    box-sizing: border-box;
`;

export const MiniBoardWrapper = styled.div<{ $isActive: boolean }>`
    position: relative;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    box-sizing: border-box;
    background-color: rgba(255, 255, 255, 0.08);
    border: 3px solid ${({ $isActive }) => ($isActive ? "#FFD700" : "#8B4513")};
    box-shadow: ${({ $isActive }) => ($isActive ? "0 0 8px 2px rgba(255, 215, 0, 0.8)" : "none")};
`;

export const MiniCell = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    border: 1px solid rgba(139, 69, 19, 0.5);
    cursor: pointer;
    touch-action: manipulation;
`;

// Затемнення завершеного (виграного або нічийного) міні-поля.
// Окремий шар МІЖ сіткою клітинок і зображенням переможця - тому
// саме зображення переможця на нього не зважає і лишається чітким.
export const MiniBoardDimOverlay = styled.div`
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    pointer-events: none;
    z-index: 1;
`;

// Зображення переможця (або "нічия") - завжди поверх затемнення,
// тому не тьмяніє разом з рештою заблокованого поля.
export const MiniBoardResultOverlay = styled.div`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 2;
`;

export const MiniBoardDrawLabel = styled.span`
    font-size: clamp(24px, 9vw, 48px);
    font-weight: bold;
    color: #f5f5f5;
`;
