"use client";
import styled, { createGlobalStyle } from "styled-components";

// Шапка гри - у потоці сторінки (TopBar), тож верхній відступ Container під кнопку в куті
// не потрібен; бічні поля - як у прототипі.
export const ShellVars = createGlobalStyle`
    :root {
        --shell-top: 0px;
        --shell-x: max(16px, env(safe-area-inset-left, 0px));
    }
`;

// Одна колонка гри до 760px (як у прототипі): шапка, під нею - головна, сторінка розділу,
// поле або екран онлайн-кімнати.
export const AppColumn = styled.div`
    &&& {
        margin-block: 0;
    }
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 760px;
    min-height: 100%;
    margin: 0 auto;
    color: #4a2c0c;
    font: 500 15px/1.45 var(--font-body);
`;

// Спільні стилі сторінок меню (головна, кампанія, магазин, нагороди, профіль) - як у прототипі:
// кремові картки з м'якою нижньою кромкою на небі гри.

export const Page = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 100%;
    min-width: 0;
    /* Місце під нижнє меню. */
    padding-bottom: 96px;
    color: #4a2c0c;
`;

export const Card = styled.section<{ $tone?: "daily" }>`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    padding: 16px;
    border-radius: 24px;
    background: ${({ $tone }) => ($tone === "daily" ? "linear-gradient(160deg, #ffe3a3, #f7d7a6 60%)" : "#fff6e6")};
    box-shadow:
        inset 0 -5px 0 #ebcb98,
        0 12px 24px rgba(70, 40, 10, 0.16);

    h2 {
        margin: 0;
        font-size: 24px;
        line-height: 1.05;
        text-wrap: balance;
    }

    h3 {
        margin: 0;
        font-size: 19px;
        line-height: 1.05;
        text-wrap: balance;
    }
`;

export const Eyebrow = styled.div`
    font-size: 12px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #7a5530;
`;

export const Muted = styled.div`
    margin: 0;
    color: #7a5530;
    font-size: 13px;
    line-height: 1.45;
`;

export const Row = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
`;

export const Spread = styled(Row)`
    justify-content: space-between;
`;

export const Progress = styled.div`
    height: 10px;
    border-radius: 999px;
    background: #f1c88c;
    overflow: hidden;

    & > i {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #1fb3d9, #0f6f8c);
    }
`;

// Інформаційна плашка (рівень, ліга, серія) - не кнопка: пласкиий напівпрозорий бейдж без рельєфу,
// щоб не плутати з натискними кнопками поруч.
export const InfoPill = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    padding: 0 12px;
    border-radius: 14px;
    background: rgba(255, 247, 232, 0.72);
    box-shadow: inset 0 0 0 1.5px rgba(139, 101, 60, 0.22);
    color: #7a5530;
    font-size: 14px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

// Дві картки (або кнопки) поруч; на вузькому екрані - одна під одною.
export const TwoCol = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;

    /* Кнопки карток поруч - притиснуті до низу, на одному рівні. */
    & > section > button:last-child {
        margin-top: auto;
    }

    @media (max-width: 420px) {
        grid-template-columns: 1fr;
    }
`;
