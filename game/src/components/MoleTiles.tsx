"use client";
import styled, { css, keyframes } from "styled-components";

// Модифікатор "кріт" - спільне для гри з ботом (5×5) і гри з другом: горбок на клітинці
// та тремтяча клітинка, де наступним ходом виросте горбок.

const moundUp = keyframes`
    from { transform: scale(0.4) translateY(30%); opacity: 0; }
`;

// Нора крота: ямка (темний отвір у кільці розритої землі) з лічильником, скільки ходів ще простоїть.
export const MoundTile = styled.div`
    position: relative;
    width: 78%;
    height: 78%;
    background:
        /* темний отвір із тінню від верхнього краю */
        radial-gradient(ellipse 38% 26% at 50% 56%, #1f1208 0 55%, #3a2412 70%, transparent 72%),
        /* світліший верхній край ями */
        radial-gradient(ellipse 45% 31% at 50% 53%, #c9955e 0 74%, transparent 76%),
        /* кільце розритої землі */
        radial-gradient(ellipse 58% 41% at 50% 57%, #8a5a2e 0 70%, transparent 72%),
        /* розсипані грудочки */
        radial-gradient(circle at 10% 76%, #8a5a2e 0 5%, transparent 6%),
        radial-gradient(circle at 90% 72%, #7a4e26 0 4%, transparent 5%),
        radial-gradient(circle at 76% 92%, #8a5a2e 0 3.5%, transparent 4.5%);
    animation: ${moundUp} 0.35s cubic-bezier(0.3, 1.6, 0.5, 1);

    b {
        position: absolute;
        top: 0;
        right: 0;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        border-radius: 999px;
        background: #5c3317;
        color: #fff7e8;
        font: 800 11px/18px var(--font-body);
        text-align: center;
    }

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

const shake = keyframes`
    0%, 100% { transform: translate(0, 0); }
    25% { transform: translate(-1.5px, 1px) rotate(-1deg); }
    75% { transform: translate(1.5px, -1px) rotate(1deg); }
`;

// Клітинка, де наступним ходом виросте горбок: тремтить і вкривається тріщинками.
export const moleWarnCss = css`
    background-image:
        repeating-linear-gradient(35deg, transparent 0 9px, rgba(120, 75, 35, 0.35) 9px 11px),
        repeating-linear-gradient(-55deg, transparent 0 13px, rgba(120, 75, 35, 0.25) 13px 15px);
    animation: ${shake} 0.5s ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;
