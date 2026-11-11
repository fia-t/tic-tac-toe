import { css, keyframes } from "styled-components";

// Зимове оформлення скіна (theme.fx === "winter"): усе - лише CSS під :root[data-fx="winter"],
// без зміни розмітки, тож для інших скінів нічого не змінюється.
export const WINTER = ':root[data-fx="winter"]';

const svg = (body: string, w: number, h: number) =>
    `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`)}")`;

// Бурульки: льодяна смужка й бурульки різної довжини, повторюються по ширині.
const ICICLES = svg(
    `<defs><linearGradient id="i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#d6efff"/><stop offset="1" stop-color="#9fd3f7" stop-opacity=".85"/></linearGradient></defs>` +
        `<g fill="url(#i)" stroke="#8cc4ea" stroke-width=".8" stroke-linejoin="round">` +
        `<path d="M3 0h9l-4 15z"/><path d="M15 0h11l-5 24z"/><path d="M29 0h7l-3.5 10z"/><path d="M39 0h10l-4.5 19z"/><path d="M52 0h7l-3.5 12z"/></g>` +
        `<rect x="0" y="0" width="62" height="3.5" rx="1.75" fill="#eaf7ff"/>` +
        `<g fill="#fff" opacity=".9"><path d="M17.5 3l1 10-1.8-1z"/><path d="M41.5 3l.9 8-1.6-.8z"/></g>`,
    62,
    24
);

// Бурульки під елементом (елемент отримує position: relative).
export const winterIcicles = css`
    ${WINTER} & {
        position: relative;
    }
    ${WINTER} &::after {
        content: "";
        position: absolute;
        left: 18px;
        right: 18px;
        top: calc(100% - 4px);
        height: 22px;
        background: ${ICICLES} 0 0 / 62px 22px repeat-x;
        filter: drop-shadow(0 2px 2px rgba(60, 120, 170, 0.25));
        pointer-events: none;
        z-index: 1;
    }
`;

// Обледеніння краю: холодна блакитна облямівка з інеєм замість піщаної тіні.
export const winterFrost = (shadow: string) => css`
    ${WINTER} & {
        box-shadow:
            inset 0 0 0 2px rgba(190, 228, 255, 0.85),
            inset 0 0 14px rgba(160, 210, 245, 0.55),
            ${shadow};
    }
`;

// Сніжинки на фоні: шари білих крапок у плитці, що повільно їдуть донизу.
let seed = 11;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const flakes = (count: number, tile: number, min: number, max: number) =>
    Array.from({ length: count }, () => {
        const r = (min + rnd() * (max - min)).toFixed(1);
        return `radial-gradient(circle at ${Math.round(rnd() * tile)}px ${Math.round(rnd() * tile)}px, rgba(255,255,255,${(0.7 + rnd() * 0.3).toFixed(2)}) 0 ${r}px, transparent ${(Number(r) + 1).toFixed(1)}px)`;
    }).join(", ");

const SMALL_TILE = 260;
const BIG_TILE = 420;
const fallSmall = keyframes`
    from { background-position: 0 0; }
    to { background-position: 0 ${SMALL_TILE}px; }
`;
const fallBig = keyframes`
    from { background-position: 0 0; }
    to { background-position: 0 ${BIG_TILE}px; }
`;
const sway = keyframes`
    0%, 100% { transform: translateX(-12px); }
    50% { transform: translateX(12px); }
`;

// Для кореневого контейнера гри: зимове небо, падаючий сніг позаду вмісту, блакитне світіння виграшу.
export const winterBackdrop = css`
    --win-glow-a: rgba(255, 210, 60, 1);
    --win-glow-b: rgba(255, 170, 20, 0.9);

    ${WINTER} & {
        --win-glow-a: rgba(150, 220, 255, 1);
        --win-glow-b: rgba(40, 150, 255, 0.9);
        isolation: isolate;
        background-color: #d9ecfa;
        background-image:
            radial-gradient(ellipse 170px 46px at 14% 70px, rgba(255, 255, 255, 0.6), transparent 70%),
            radial-gradient(ellipse 230px 58px at 80% 46px, rgba(255, 255, 255, 0.55), transparent 70%),
            linear-gradient(180deg, #cfe5f7 0%, #e3f1fb 55%, #ffffff 100%);
        background-size: auto;
        background-repeat: no-repeat;
    }
    ${WINTER} &::before,
    ${WINTER} &::after {
        content: "";
        position: fixed;
        inset: -20px;
        z-index: -1;
        pointer-events: none;
    }
    ${WINTER} &::before {
        background-image: ${flakes(14, SMALL_TILE, 1.2, 2.4)};
        background-size: ${SMALL_TILE}px ${SMALL_TILE}px;
        animation:
            ${fallSmall} 14s linear infinite,
            ${sway} 6s ease-in-out infinite;
    }
    ${WINTER} &::after {
        background-image: ${flakes(9, BIG_TILE, 2.6, 4.2)};
        background-size: ${BIG_TILE}px ${BIG_TILE}px;
        opacity: 0.9;
        animation:
            ${fallBig} 16s linear infinite,
            ${sway} 9s ease-in-out infinite reverse;
    }
    @media (prefers-reduced-motion: reduce) {
        ${WINTER} &::before,
        ${WINTER} &::after {
            animation: none;
        }
    }
`;

// Бурулька, що звисає з правого краю плашки (статус партії).
export const winterIcicleRight = css`
    ${WINTER} & {
        position: relative;
    }
    ${WINTER} &::after {
        content: "";
        position: absolute;
        right: 14px;
        top: calc(100% - 3px);
        width: 46px;
        height: 22px;
        background: ${ICICLES} 0 0 / 62px 22px no-repeat;
        filter: drop-shadow(0 2px 2px rgba(60, 120, 170, 0.25));
        pointer-events: none;
        z-index: 3;
    }
`;

// Обледеніння плашки (рамка, а не лише тінь: тінь статусу анімується): крижана облямівка, іній по краях і глянцевий відблиск зверху.
export const winterIce = (shadow?: string) => css`
    ${WINTER} & {
        border: 2px solid rgba(160, 210, 240, 0.95);
        box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.75),
            inset 0 0 12px rgba(150, 205, 245, 0.7)${shadow ? `, ${shadow}` : ""};
        background-image: linear-gradient(180deg, rgba(225, 243, 255, 0.95) 0%, rgba(236, 248, 255, 0) 55%, rgba(195, 228, 250, 0.5) 100%);
    }
`;
