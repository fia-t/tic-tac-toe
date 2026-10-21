"use client";
import React, { useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { Container } from "@game/components/gameStyles";

// Живі прикраси хелловінської гри в новині: кажани, що пролітають повз місяць, і павутина з
// павучком на рахунку. Фон (небо, місяць, листя) - у HalloweenBackdrop.

// Кажани летять справа наліво повз місяць і знижуються - залітають за поле й повністю ховаються
// за ним; легке погойдування вгору-вниз і помахи крилами. Позаду вмісту гри, кліки не перехоплюють.
const flyAcross = keyframes`
    from { transform: translate(0, 0); }
    to { transform: translate(-520px, 260px); }
`;
const bob = keyframes`
    from { transform: translateY(-10px); }
    to { transform: translateY(10px); }
`;
const flap = keyframes`
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(0.35); }
`;

// Права межа - край ігрової області, а не вікна: кажани з'являються з-під смуги прокрутки,
// а не летять поверх неї (--bats-right виставляє HalloweenBats).
const BatSky = styled.div`
    position: fixed;
    top: 0;
    bottom: 0;
    right: var(--bats-right, 0px);
    width: 460px;
    max-width: 100vw;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;

    /* На телефоні смуга керування на всю ширину - кажани опинялися серед кнопок. */
    @media (max-width: 760px), (prefers-reduced-motion: reduce) {
        display: none;
    }
`;

const BatFlight = styled.div<{ $top: number; $dur: number; $delay: number }>`
    position: absolute;
    top: ${({ $top }) => $top}px;
    left: 100%;
    animation: ${flyAcross} ${({ $dur }) => $dur}s linear ${({ $delay }) => $delay}s infinite;
`;

const BatBob = styled.div<{ $size: number }>`
    width: ${({ $size }) => $size}px;
    animation: ${bob} 1.3s ease-in-out infinite alternate;

    svg {
        display: block;
        width: 100%;
        height: auto;
        /* Ледь помітний місячний ореол - видно на темному небі, але не відволікає від гри. */
        filter: drop-shadow(0 0 3px rgba(246, 231, 200, 0.35));
    }

    .wing {
        transform-box: fill-box;
        transform-origin: 50% 0%;
        animation: ${flap} 0.28s ease-in-out infinite;
    }
`;

const BatShape = () => (
    <svg viewBox="-22 -10 44 20" aria-hidden="true">
        <path className="wing" fill="#1a1024" d="M-3 0C-8-6-15-7-21-4c4 1 5 4 4 7-3-2-7-2-9 1 4 0 6 2 7 5 3-3 9-5 14-4 0-2 1-4 2-5z" />
        <path className="wing" fill="#1a1024" d="M3 0c5-6 12-7 18-4-4 1-5 4-4 7 3-2 7-2 9 1-4 0-6 2-7 5-3-3-9-5-14-4 0-2-1-4-2-5z" />
        <ellipse cx="0" cy="1" rx="3.5" ry="5" fill="#1a1024" />
        <path d="M-2.5-3l-1-3 2 2zm5 0l1-3-2 2z" fill="#1a1024" />
    </svg>
);

// Траєкторії - нижче смуги керування (кнопки "Модифікатор"); перша проходить просто через
// місяць (центр - 70px від правого краю, 105px згори).
const FLIGHTS = [
    { top: 86, dur: 11, delay: 0, size: 62 },
    { top: 140, dur: 14, delay: 4, size: 44 },
    { top: 112, dur: 17, delay: 8, size: 34 },
];

export const HalloweenBats = () => {
    const sky = useRef<HTMLDivElement>(null);
    // Ширина смуги прокрутки контейнера гри (вона з'являється, коли вміст вищий за iframe).
    useEffect(() => {
        const box = document.querySelector<HTMLElement>(String(Container));
        if (!box) return;
        const update = () => sky.current?.style.setProperty("--bats-right", `${box.offsetWidth - box.clientWidth}px`);
        update();
        const observer = new ResizeObserver(update);
        observer.observe(box);
        if (box.firstElementChild) observer.observe(box.firstElementChild);
        return () => observer.disconnect();
    }, []);
    return (
        <BatSky ref={sky} aria-hidden="true">
            {FLIGHTS.map((f, i) => (
                <BatFlight key={i} $top={f.top} $dur={f.dur} $delay={f.delay}>
                    <BatBob $size={f.size}>
                        <BatShape />
                    </BatBob>
                </BatFlight>
            ))}
        </BatSky>
    );
};

// Рахунок у павутинні: павутина в лівому верхньому куті (біля "Бот"), а з-під лівого краю
// на нитці звисає павучок, що повільно опускається й підіймається.
const dangle = keyframes`
    0%, 100% { height: 10px; }
    50% { height: 28px; }
`;
const sway = keyframes`
    from { transform: rotate(-7deg); }
    to { transform: rotate(7deg); }
`;

const Web = styled.svg`
    position: absolute;
    left: -3px;
    top: -3px;
    width: 38px;
    height: 38px;
    pointer-events: none;

    /* Вузький рахунок на телефоні - павутина лише в самому куті, не на слові "Бот". */
    @media (max-width: 560px) {
        width: 22px;
        height: 22px;
    }
`;

const SpiderHang = styled.div`
    position: absolute;
    left: 16px;
    top: calc(100% - 1px);
    z-index: 2;
    width: 2px;
    pointer-events: none;
    transform-origin: top center;
    animation: ${sway} 2.2s ease-in-out infinite alternate;

    /* На телефоні павучок звисав на плашку "Твій хід" - лишається тільки павутинка. */
    @media (max-width: 760px) {
        display: none;
    }

    &::before {
        content: "";
        display: block;
        width: 1px;
        height: 8px;
        margin: 0 auto;
        background: rgba(246, 231, 200, 0.9);
        animation: ${dangle} 4s ease-in-out infinite;
    }

    svg {
        display: block;
        width: 26px;
        margin: -1px 0 0 -12px;
        /* Світлий ореол - щоб темний павук не губився на нічному небі. */
        filter: drop-shadow(0 0 2px rgba(246, 231, 200, 0.7));
    }

    @media (prefers-reduced-motion: reduce) {
        animation: none;

        &::before {
            animation: none;
            height: 14px;
        }
    }
`;

// spider=false - без павучка (під рахунком рядок таймера, павук звисав би на його підпис).
export const ScoreCobweb: React.FC<{ spider?: boolean }> = ({ spider = true }) => (
    <>
        <Web viewBox="0 0 30 30" aria-hidden="true">
            <g fill="none" stroke="rgba(90, 70, 90, 0.55)" strokeWidth="0.8">
                <path d="M2 2L28 4M2 2L26 16M2 2L16 26M2 2L4 28" />
                <path d="M9 2.5Q8 6 8.5 8.5Q5.5 8 2.5 9" />
                <path d="M16 3Q14 9 13.5 13.5Q8 13 3 16" />
                <path d="M23 3.6Q20 12 19 19Q11 19 3.5 23" />
            </g>
        </Web>
        {spider && (
            <SpiderHang aria-hidden="true">
                <svg viewBox="-9 -4 18 16">
                    <g stroke="#1a1024" strokeWidth="1.2" fill="none" strokeLinecap="round">
                        <path d="M-2 3l-4-3-2 2M-2 4h-5l-2 3M-2 5l-4 3-1 3M-2 6l-3 4" />
                        <path d="M2 3l4-3 2 2M2 4h5l2 3M2 5l4 3 1 3M2 6l3 4" />
                    </g>
                    <ellipse cx="0" cy="5" rx="3.6" ry="4.2" fill="#1a1024" />
                    <circle cx="0" cy="0.6" r="2.4" fill="#1a1024" />
                    <circle cx="-0.9" cy="0.3" r="0.6" fill="#ff8a2a" />
                    <circle cx="0.9" cy="0.3" r="0.6" fill="#ff8a2a" />
                </svg>
            </SpiderHang>
        )}
    </>
);
