"use client";
import React, { useMemo } from "react";
import styled, { css, keyframes } from "styled-components";
import { Overlay } from "@game/components/gameStyles";
import { ModalCard, ModalCloseButton, PillButton } from "@game/components/onlineStyles";
import { IconClose } from "@game/components/GameIcons";
import { buttonTone } from "@game/components/GameButton";
import { isHalloweenEmbed } from "@game/lib/embed";
import { useT } from "@game/lib/i18n";

// Результат партії у вбудованій грі (iframe у новині): без монет, досвіду й "До меню" - лише
// заголовок і "Грати ще раз". Для хелловінського скіна - анімація на весь екран: за перемогу
// в гарбуз-кошик сиплються цукерки, за програш привид з павуком влаштовують капость.

type Result = "win" | "lose" | "draw";

const reduced = css`
    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

const Card = styled(ModalCard)<{ $low?: boolean }>`
    text-align: center;

    ${({ $low }) =>
        $low &&
        css`
            /* Під анімацією - внизу екрана, щоб не закривати цукерки й привида. */
            top: auto;
            bottom: max(24px, env(safe-area-inset-bottom, 0px));
        `}
`;

const Title = styled.h2<{ $result: Result; $spooky?: boolean }>`
    margin: 4px 0 14px;
    font-size: clamp(24px, 7vw, 32px);
    font-weight: 900;
    color: ${({ $result, $spooky }) => ($spooky ? ($result === "win" ? "#d9620f" : "#5b2a86") : $result === "win" ? "#0f6f8c" : $result === "lose" ? "#b32f1c" : "#49301f")};
`;

const PrimaryButton = styled(PillButton)`
    ${buttonTone("primary")}
`;

// --- шар анімації ---

const Stage = styled.div<{ $tint: string }>`
    position: fixed;
    inset: 0;
    z-index: 1600;
    overflow: hidden;
    pointer-events: none;
    background: ${({ $tint }) => $tint};
`;

const fall = keyframes`
    0% { transform: translate(0, -15vh) rotate(0deg); opacity: 0; }
    10% { opacity: 1; }
    80% { opacity: 1; }
    100% { transform: translate(var(--dx), 72vh) rotate(var(--spin)); opacity: 0; }
`;

const Candy = styled.span`
    position: absolute;
    top: 0;
    display: block;
    width: 34px;
    height: 34px;
    animation: ${fall} var(--dur) cubic-bezier(0.45, 0, 0.7, 1) var(--delay) infinite both;
    ${reduced}
`;

const bob = keyframes`
    0%, 100% { transform: translateY(0) rotate(0deg); }
    30% { transform: translateY(4px) rotate(-3deg); }
    60% { transform: translateY(-2px) rotate(3deg); }
`;

const Bucket = styled.div`
    position: absolute;
    left: calc(50% - 66px);
    bottom: calc(220px + env(safe-area-inset-bottom, 0px));
    width: 132px;
    animation: ${bob} 0.9s ease-in-out 0.6s 4;
    ${reduced}
`;

const drop = keyframes`
    0% { transform: translateY(-100%); }
    55% { transform: translateY(0); }
    65% { transform: translateY(-14px); }
    75% { transform: translateY(0); }
    100% { transform: translateY(0); }
`;

const wiggle = keyframes`
    0%, 100% { transform: rotate(-7deg); }
    50% { transform: rotate(7deg); }
`;

const Spider = styled.div`
    position: absolute;
    top: 0;
    right: 14%;
    width: 64px;
    animation: ${drop} 1.6s ease-out both;
    ${reduced}

    & > div {
        transform-origin: 50% 0;
        animation: ${wiggle} 1.2s ease-in-out 1.6s infinite;
        ${reduced}
    }
`;

// Привид залітає збоку, робить петлю над полем і зависає над вікном результату, похитуючись.
const fly = keyframes`
    0% { transform: translate(-40vw, 30vh) scale(0.7); opacity: 0; }
    15% { opacity: 0.95; }
    45% { transform: translate(20vw, 4vh) scale(1.05); }
    70% { transform: translate(-12vw, 18vh) scale(1); }
    100% { transform: translate(0, 10vh) scale(1); opacity: 0.95; }
`;

const hover = keyframes`
    0%, 100% { transform: translateY(0) rotate(-4deg); }
    50% { transform: translateY(-12px) rotate(4deg); }
`;

const Ghost = styled.div`
    position: absolute;
    top: 0;
    left: calc(50% - 55px);
    width: 110px;
    animation: ${fly} 2.6s ease-in-out 0.2s both;
    ${reduced}

    & > div {
        animation: ${hover} 1.6s ease-in-out 2.8s infinite;
        ${reduced}
    }
`;

const flap = keyframes`
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(0.45); }
`;

const batPath = keyframes`
    0% { transform: translate(var(--x0), var(--y0)); opacity: 0; }
    15% { opacity: 1; }
    100% { transform: translate(var(--x1), var(--y1)); opacity: 0; }
`;

const Bat = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 42px;
    animation: ${batPath} var(--dur) ease-in-out var(--delay) infinite both;
    ${reduced}

    svg {
        animation: ${flap} 0.25s linear infinite;
        ${reduced}
    }
`;

// --- картинки (SVG) ---

const WrappedCandy = ({ color }: { color: string }) => (
    <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M6 16l9 8-9 8 3 3 10-9h10l10 9 3-3-9-8 9-8-3-3-10 9H19L9 13z" fill={color} opacity="0.75" />
        <ellipse cx="24" cy="24" rx="10" ry="8" fill={color} />
        <path d="M17 21c3-2 10-2 14 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
    </svg>
);

const Lollipop = ({ color }: { color: string }) => (
    <svg viewBox="0 0 48 48" aria-hidden="true">
        <rect x="22" y="24" width="4" height="22" rx="2" fill="#f4ead8" />
        <circle cx="24" cy="18" r="14" fill={color} />
        <path d="M24 18m-8 0a8 8 0 1 0 8-8a5 5 0 1 1-5 5" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
);

const CandyCorn = () => (
    <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 4c6 10 14 26 14 34 0 4-6 6-14 6s-14-2-14-6c0-8 8-24 14-34z" fill="#fff4dc" />
        <path d="M14.5 28c-2 4-4.5 8-4.5 10 0 4 6 6 14 6s14-2 14-6c0-2-2.5-6-4.5-10z" fill="#f28c1b" />
        <path d="M11 37c0 4 6 7 13 7s13-3 13-7c-3 2-8 3-13 3s-10-1-13-3z" fill="#f6c443" />
    </svg>
);

const PumpkinBucket = () => (
    <svg viewBox="0 0 120 120" aria-hidden="true">
        <path d="M18 44C18 20 102 20 102 44" stroke="#3b2a1a" strokeWidth="5" fill="none" strokeLinecap="round" />
        <ellipse cx="60" cy="76" rx="52" ry="40" fill="#f07a14" />
        <path d="M60 36c-8 12-8 68 0 80M60 36c8 12 8 68 0 80M36 40c-12 14-12 60 0 74M84 40c12 14 12 60 0 74" stroke="#c95a0a" strokeWidth="3" fill="none" />
        <ellipse cx="60" cy="40" rx="40" ry="8" fill="#5a2c08" />
        <path d="M38 64l10 8H30zM82 64l10 8H74z" fill="#3b1a05" />
        <path d="M36 90c8 8 40 8 48 0l-6 3-4-3-4 4-4-4-4 4-4-4-4 4-4-4z" fill="#3b1a05" />
    </svg>
);

const GhostSvg = () => (
    <svg viewBox="0 0 100 110" aria-hidden="true">
        <path d="M50 4C24 4 12 26 12 52v50l12-10 13 10 13-10 13 10 13-10 12 10V52C88 26 76 4 50 4z" fill="#fbf8ff" stroke="#c9bde0" strokeWidth="2" />
        <ellipse cx="37" cy="46" rx="6" ry="9" fill="#2b1a3d" />
        <ellipse cx="63" cy="46" rx="6" ry="9" fill="#2b1a3d" />
        <path d="M38 66c6 8 18 8 24 0" stroke="#2b1a3d" strokeWidth="4" fill="none" strokeLinecap="round" />
        <g transform="translate(78 58) rotate(20)">
            <ellipse cx="0" cy="0" rx="9" ry="7" fill="#e8452f" />
            <path d="M-9 0l-7-6v12zM9 0l7-6v12z" fill="#e8452f" opacity="0.8" />
        </g>
    </svg>
);

const SpiderSvg = () => (
    <svg viewBox="0 0 64 150" aria-hidden="true">
        <line x1="32" y1="0" x2="32" y2="108" stroke="#d8d0e6" strokeWidth="1.5" />
        <g stroke="#1d1427" strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M24 118l-14-8-6 6M24 124l-16 0-4 8M26 130l-12 10M40 118l14-8 6 6M40 124l16 0 4 8M38 130l12 10" />
        </g>
        <ellipse cx="32" cy="124" rx="12" ry="14" fill="#1d1427" />
        <circle cx="32" cy="108" r="8" fill="#2a1d38" />
        <circle cx="29" cy="107" r="2" fill="#ff5a3c" />
        <circle cx="35" cy="107" r="2" fill="#ff5a3c" />
    </svg>
);

const BatSvg = () => (
    <svg viewBox="0 0 64 32" aria-hidden="true">
        <path d="M32 10c-2-4-6-6-6-6s1 4 0 6c-6-6-16-6-24 0 6 0 10 4 10 10 4-4 10-4 12 0 2-2 6-2 8 0 2-4 8-4 12 0 0-6 4-10 10-10-8-6-18-6-24 0-1-2 0-6 0-6s-4 2-6 6z" fill="#2b1a3d" />
    </svg>
);

const CANDY_COLORS = ["#e8452f", "#f28c1b", "#8e44ad", "#2ecc71", "#f1c40f", "#ff6fa8"];

// Дощ із цукерок, поки відкрите вікно: випадкові місце, затримка, швидкість і обертання.
const CandyRain = () => {
    const pieces = useMemo(
        () =>
            Array.from({ length: 32 }, (_, i) => ({
                left: 6 + Math.random() * 88,
                dx: (50 - (6 + Math.random() * 88)) * 0.5,
                delay: Math.random() * 2.4,
                dur: 1.8 + Math.random() * 1.2,
                spin: (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 360),
                kind: i % 3,
                color: CANDY_COLORS[i % CANDY_COLORS.length],
            })),
        []
    );
    return (
        <Stage $tint="radial-gradient(circle at 50% 40%, rgba(255, 170, 60, 0.18), rgba(40, 14, 60, 0.45))">
            {pieces.map((p, i) => (
                <Candy
                    key={i}
                    style={{ left: `${p.left}%`, ["--dx" as string]: `${p.dx}vw`, ["--delay" as string]: `${p.delay}s`, ["--dur" as string]: `${p.dur}s`, ["--spin" as string]: `${p.spin}deg` }}
                >
                    {p.kind === 0 ? <WrappedCandy color={p.color} /> : p.kind === 1 ? <Lollipop color={p.color} /> : <CandyCorn />}
                </Candy>
            ))}
            <Bucket>
                <PumpkinBucket />
            </Bucket>
        </Stage>
    );
};

// Капость за програш: павук спускається на павутинці, привид пролітає й краде цукерку, кажани.
const Prank = () => {
    const bats = useMemo(
        () =>
            Array.from({ length: 5 }, (_, i) => ({
                x0: `${-10 + Math.random() * 20}vw`,
                y0: `${60 + Math.random() * 30}vh`,
                x1: `${70 + Math.random() * 40}vw`,
                y1: `${-10 + Math.random() * 20}vh`,
                delay: 0.4 + i * 0.35,
                dur: 2.2 + Math.random(),
            })),
        []
    );
    return (
        <Stage $tint="radial-gradient(circle at 50% 35%, rgba(90, 40, 140, 0.25), rgba(15, 5, 30, 0.7))">
            {bats.map((b, i) => (
                <Bat
                    key={i}
                    style={{ ["--x0" as string]: b.x0, ["--y0" as string]: b.y0, ["--x1" as string]: b.x1, ["--y1" as string]: b.y1, ["--delay" as string]: `${b.delay}s`, ["--dur" as string]: `${b.dur}s` }}
                >
                    <BatSvg />
                </Bat>
            ))}
            <Ghost>
                <div>
                    <GhostSvg />
                </div>
            </Ghost>
            <Spider>
                <div>
                    <SpiderSvg />
                </div>
            </Spider>
        </Stage>
    );
};

type EmbedResultProps = { result: Result; onClose: () => void; onRestart: () => void };

export const EmbedResult: React.FC<EmbedResultProps> = ({ result, onClose, onRestart }) => {
    const t = useT();
    const spooky = isHalloweenEmbed() && result !== "draw";
    const heading = spooky
        ? result === "win"
            ? t("halloweenWin")
            : t("halloweenLose")
        : result === "win"
          ? t("resultWin")
          : result === "lose"
            ? t("resultLose")
            : t("resultDraw");
    return (
        <>
            {spooky ? result === "win" ? <CandyRain /> : <Prank /> : <Overlay onClick={onClose} style={{ zIndex: 1600 }} />}
            <Card $low={spooky} role="dialog" aria-modal="true" aria-labelledby="result-title" onClick={(e) => e.stopPropagation()} style={{ zIndex: 1601 }}>
                <ModalCloseButton type="button" onClick={onClose} aria-label={t("close")}>
                    <IconClose size={16} />
                </ModalCloseButton>
                <Title id="result-title" $result={result} $spooky={spooky}>
                    {heading}
                </Title>
                <PrimaryButton type="button" onClick={onRestart}>
                    {t("playAgain")}
                </PrimaryButton>
            </Card>
        </>
    );
};
