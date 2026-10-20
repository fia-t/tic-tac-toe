"use client";
import { createGlobalStyle } from "styled-components";
import { Container } from "@game/components/gameStyles";
import { AppColumn } from "@game/components/pageStyles";

// Хелловінська атмосфера гри в новині (осінній скін): замість пляжного неба - сутінки з
// місяцем і зорями, внизу - купки опалого листя; на полі поверх трави - листочки.

const svg = (body: string, viewBox: string) =>
    `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}'>${body}</svg>`)}")`;

// Листок: овал із прожилкою; x, y, поворот, розмір, колір.
const LEAF_COLORS = ["#d9682a", "#e9a23b", "#b8432a", "#c98a2e", "#9c4a22"];
const leaf = (x: number, y: number, rot: number, size: number, color: string) =>
    `<g transform='translate(${x} ${y}) rotate(${rot}) scale(${size})'>` +
    `<path d='M0-5C3.2-3 3.2 3 0 5C-3.2 3-3.2-3 0-5z' fill='${color}'/>` +
    `<path d='M0-4.6V5.6' stroke='rgba(80,30,10,.45)' stroke-width='.5'/></g>`;

// Розкидані по полю листочки (координати - у відсотках поля).
const BOARD_LEAVES: [number, number, number, number][] = [
    [8, 12, 30, 0.9], [27, 6, -40, 0.7], [62, 9, 70, 0.8], [91, 18, -20, 0.9],
    [15, 47, 110, 0.75], [48, 38, -65, 0.6], [83, 52, 15, 0.85], [6, 82, -30, 0.8],
    [37, 72, 55, 0.7], [70, 88, -100, 0.9], [94, 76, 40, 0.65], [55, 60, 160, 0.55],
];
const boardLeaves = svg(
    BOARD_LEAVES.map(([x, y, r, s], i) => leaf(x, y, r, s, LEAF_COLORS[i % LEAF_COLORS.length])).join(""),
    "0 0 100 100"
);

// Купки листя вздовж нижнього краю (смуга, що повторюється по горизонталі).
const groundLeaves = svg(
    Array.from({ length: 22 }, (_, i) => {
        const x = (i * 37) % 200;
        const y = 34 + ((i * 13) % 12);
        return leaf(x, y, (i * 47) % 360, 1.1 + ((i * 7) % 5) / 10, LEAF_COLORS[i % LEAF_COLORS.length]);
    }).join(""),
    "0 0 200 50"
);

export const HalloweenBackdrop = createGlobalStyle`
    :root {
        --board-overlay: ${boardLeaves};
        /* Підписи над полем і лоадера - світлі на темному небі. */
        --bar-ink: #f6e7c8;
        --loader-ink: #f6e7c8;
        --info-bg: rgba(246, 231, 200, 0.85);
        --info-ink: #34204a;
        /* Напівпрозорий кремовий рахунок на темному небі виглядав брудно-сірим. */
        --score-bg: #fff6e6;
    }

    /* Вміст гри - над кажанами, що літають позаду (HalloweenBats). */
    ${AppColumn} {
        position: relative;
        z-index: 1;
    }

    /* Подвійний клас - сильніше за власний фон контейнера незалежно від порядку стилів. */
    ${Container}${Container} {
        background-color: #2a1a3e;
        background-image:
            ${groundLeaves},
            radial-gradient(circle at calc(100% - 70px) 105px, #fff4d6 0 30px, rgba(255, 228, 170, 0.28) 32px, transparent 84px),
            radial-gradient(circle, rgba(255, 244, 214, 0.5) 1px, transparent 1.6px),
            radial-gradient(circle, rgba(255, 244, 214, 0.35) 1px, transparent 1.6px),
            linear-gradient(180deg, #1f1433 0%, #34204a 40%, #6b3550 72%, #b8582a 100%);
        background-size: 400px 100px, auto, 53px 47px, 71px 67px, auto;
        background-position: left bottom, 0 0, 0 0, 20px 30px, 0 0;
        background-repeat: repeat-x, no-repeat, repeat, repeat, no-repeat;

        /* Телефон: смуга керування на всю ширину - місяць лише виглядає з кута. */
        @media (max-width: 760px) {
            background-image:
                ${groundLeaves},
                radial-gradient(circle at 100% 0, #fff4d6 0 26px, rgba(255, 228, 170, 0.25) 28px, transparent 60px),
                radial-gradient(circle, rgba(255, 244, 214, 0.5) 1px, transparent 1.6px),
                radial-gradient(circle, rgba(255, 244, 214, 0.35) 1px, transparent 1.6px),
                linear-gradient(180deg, #1f1433 0%, #34204a 40%, #6b3550 72%, #b8582a 100%);
            background-size: 400px 100px, auto, 53px 47px, 71px 67px, auto;
            background-position: left bottom, 0 0, 0 0, 20px 30px, 0 0;
            background-repeat: repeat-x, no-repeat, repeat, repeat, no-repeat;
        }
    }
`;
