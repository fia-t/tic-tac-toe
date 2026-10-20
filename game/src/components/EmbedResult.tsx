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
// в гарбуз-кошик сиплються цукерки, за програш привид з павуком влаштовують капость, за нічию
// два усміхнені гарбузи перекидають одне одному цукерку.

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
    color: ${({ $result, $spooky }) =>
        $spooky ? ($result === "lose" ? "#5b2a86" : "#d9620f") : $result === "win" ? "#0f6f8c" : $result === "lose" ? "#b32f1c" : "#49301f"};
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
    left: calc(50% - 80px);
    bottom: calc(220px + env(safe-area-inset-bottom, 0px));
    width: 160px;
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

// Павук на павутинці: $top - наскільки нижче звисає (павутинка добудовується до верху екрана).
const Spider = styled.div<{ $side: "left" | "right"; $top: number; $delay: number; $size: number }>`
    position: absolute;
    top: ${({ $top }) => $top}px;
    ${({ $side }) => ($side === "left" ? "left: 12%;" : "right: 14%;")}
    width: ${({ $size }) => $size}px;
    animation: ${drop} 1.6s ease-out ${({ $delay }) => $delay}s both;
    ${reduced}

    &::before {
        content: "";
        position: absolute;
        left: calc(50% - 0.75px);
        bottom: 100%;
        width: 1.5px;
        height: 100vh;
        background: #d8d0e6;
    }

    & > div {
        transform-origin: 50% 0;
        animation: ${wiggle} ${({ $delay }) => 1.2 + $delay * 0.3}s ease-in-out ${({ $delay }) => 1.6 + $delay}s infinite;
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
    0% { transform: translate(var(--x0), var(--y0)) scale(0.2); opacity: 0; }
    15% { opacity: 0.85; }
    85% { opacity: 1; }
    100% { transform: translate(var(--x1), var(--y1)) scale(var(--s1)); opacity: 0; }
`;

const Bat = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 42px;
    margin: -16px 0 0 -21px;
    animation: ${batPath} var(--dur) cubic-bezier(0.55, 0, 0.9, 0.6) var(--delay) infinite both;
    ${reduced}

    svg {
        animation: ${flap} 0.25s linear infinite;
        ${reduced}
    }
`;

// --- картинки (SVG) ---

const CANDY_COLORS = ["#e8452f", "#f28c1b", "#8e44ad", "#2ecc71", "#f1c40f", "#ff6fa8"];

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

// Гірка цукерок у кошику: виростає з отвору, поки сиплються цукерки (обрізана по краю отвору).
const fillUp = keyframes`
    from { transform: translateY(40px); }
    to { transform: translateY(0); }
`;

const Pile = styled.g`
    animation: ${fillUp} 4.2s cubic-bezier(0.3, 0.6, 0.4, 1) 0.5s both;
    ${reduced}
`;

// Гірка в кошику - справжні цукерки: загорнуті з хвостиками, кукурудзяні, льодяники й батончики.
type PileCandy = { kind: "wrap" | "corn" | "lolli" | "bar"; x: number; y: number; rot: number; color: string };
const PILE: PileCandy[] = [
    // нижній ряд (біля краю кошика)
    { kind: "wrap", x: 27, y: 40, rot: -15, color: "#8e44ad" },
    { kind: "bar", x: 42, y: 41, rot: 8, color: "#e8452f" },
    { kind: "corn", x: 55, y: 39, rot: -20, color: "" },
    { kind: "wrap", x: 68, y: 41, rot: 20, color: "#2ecc71" },
    { kind: "bar", x: 81, y: 40, rot: -10, color: "#f1c40f" },
    { kind: "wrap", x: 93, y: 40, rot: 10, color: "#ff6fa8" },
    // середній ряд
    { kind: "corn", x: 34, y: 31, rot: 15, color: "" },
    { kind: "wrap", x: 47, y: 30, rot: 30, color: "#f28c1b" },
    { kind: "lolli", x: 60, y: 27, rot: -10, color: "#e8452f" },
    { kind: "wrap", x: 73, y: 31, rot: -25, color: "#8e44ad" },
    { kind: "corn", x: 86, y: 30, rot: -15, color: "" },
    // верх гірки
    { kind: "bar", x: 43, y: 21, rot: -18, color: "#2ecc71" },
    { kind: "wrap", x: 56, y: 18, rot: 5, color: "#f1c40f" },
    { kind: "corn", x: 68, y: 19, rot: 25, color: "" },
    { kind: "wrap", x: 79, y: 22, rot: -30, color: "#ff6fa8" },
    { kind: "lolli", x: 62, y: 8, rot: 12, color: "#8e44ad" },
];

const PileCandyShape = ({ kind, color }: Pick<PileCandy, "kind" | "color">) => {
    if (kind === "wrap")
        return (
            <>
                <path d="M-6 0-12-5-11 0-12 5zM6 0 12-5 11 0 12 5z" fill={color} opacity="0.8" />
                <ellipse rx="7" ry="5" fill={color} />
                <path d="M-4-2c2-1.5 6-1.5 8 0" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7" />
            </>
        );
    if (kind === "corn")
        return (
            <>
                <path d="M0-9C3-4 6 3 6 6s-12 3-12 0 3-10 6-15z" fill="#fff4dc" />
                <path d="M-4.6 0C-5.5 2-6 4-6 6c0 3 12 3 12 0 0-2-.5-4-1.4-6z" fill="#f28c1b" />
                <path d="M-6 5c0 2.5 12 2.5 12 0v1.2c0 3-12 3-12 0z" fill="#f6c443" />
            </>
        );
    if (kind === "lolli")
        return (
            <>
                <rect x="-1.2" y="2" width="2.4" height="12" rx="1.2" fill="#f4ead8" />
                <circle r="7" fill={color} />
                <path d="M0 0m-4 0a4 4 0 1 0 4-4a2.5 2.5 0 1 1-2.5 2.5" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            </>
        );
    return (
        <>
            <rect x="-8" y="-4.5" width="16" height="9" rx="1.5" fill="#6b3a1f" />
            <rect x="-8" y="-4.5" width="9" height="9" rx="1.5" fill={color} />
            <path d="M1-4.5v9" stroke="#fff" strokeWidth="1" opacity="0.5" />
        </>
    );
};

const PumpkinBucket = () => (
    <svg viewBox="0 -10 120 130" aria-hidden="true">
        <defs>
            <clipPath id="bucket-pile">
                <rect x="14" y="-20" width="92" height="64" />
            </clipPath>
        </defs>
        <path d="M18 44C18 20 102 20 102 44" stroke="#3b2a1a" strokeWidth="5" fill="none" strokeLinecap="round" />
        <ellipse cx="60" cy="76" rx="52" ry="40" fill="#f07a14" />
        <path d="M60 36c-8 12-8 68 0 80M60 36c8 12 8 68 0 80M36 40c-12 14-12 60 0 74M84 40c12 14 12 60 0 74" stroke="#c95a0a" strokeWidth="3" fill="none" />
        <ellipse cx="60" cy="40" rx="40" ry="8" fill="#5a2c08" />
        <g clipPath="url(#bucket-pile)">
            <Pile>
                <path d="M86 26l10-20" stroke="#f4ead8" strokeWidth="3" strokeLinecap="round" />
                <circle cx="96" cy="6" r="7" fill="#ff6fa8" />
                <path d="M92 6a4 4 0 1 0 4-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
                {PILE.map((candy, i) => (
                    <g key={i} transform={`translate(${candy.x} ${candy.y}) rotate(${candy.rot}) scale(1.25)`}>
                        <PileCandyShape kind={candy.kind} color={candy.color} />
                    </g>
                ))}
            </Pile>
        </g>
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

// Дощ із цукерок, поки відкрите вікно: випадкові місце, затримка, швидкість і обертання;
// кошик-гарбуз тим часом наповнюється.
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

// Капость за програш: два павуки спускаються на павутинках, привид пролітає й краде цукерку,
// кажани повільно летять на гравця.
const Prank = () => {
    const bats = useMemo(
        () =>
            Array.from({ length: 6 }, (_, i) => {
                // Вилітають з глибини (центр угорі) і повільно летять на глядача - до країв екрана.
                const x0 = 38 + Math.random() * 24;
                const toLeft = i % 2 === 0;
                return {
                    x0: `${x0}vw`,
                    y0: `${18 + Math.random() * 16}vh`,
                    x1: `${toLeft ? -15 + Math.random() * 25 : 90 + Math.random() * 25}vw`,
                    y1: `${45 + Math.random() * 45}vh`,
                    s1: (2.2 + Math.random()).toFixed(2),
                    delay: 0.3 + i * 0.85,
                    dur: 4.6 + Math.random() * 1.6,
                };
            }),
        []
    );
    return (
        <Stage $tint="radial-gradient(circle at 50% 35%, rgba(90, 40, 140, 0.25), rgba(15, 5, 30, 0.7))">
            {bats.map((b, i) => (
                <Bat
                    key={i}
                    style={{ ["--x0" as string]: b.x0, ["--y0" as string]: b.y0, ["--x1" as string]: b.x1, ["--y1" as string]: b.y1, ["--s1" as string]: b.s1, ["--delay" as string]: `${b.delay}s`, ["--dur" as string]: `${b.dur}s` }}
                >
                    <BatSvg />
                </Bat>
            ))}
            <Ghost>
                <div>
                    <GhostSvg />
                </div>
            </Ghost>
            <Spider $side="right" $top={0} $delay={0} $size={64}>
                <div>
                    <SpiderSvg />
                </div>
            </Spider>
            <Spider $side="left" $top={96} $delay={0.7} $size={54}>
                <div>
                    <SpiderSvg />
                </div>
            </Spider>
        </Stage>
    );
};

// --- нічия: гарбузи-друзі по боках над вікном і цукерка, що перелітає між ними ---

const hop = keyframes`
    0%, 100% { transform: translateY(0) scaleY(1); }
    40% { transform: translateY(-18px) scaleY(1.04); }
    55% { transform: translateY(0) scaleY(0.92); }
`;

const Buddy = styled.div<{ $side: "left" | "right" }>`
    position: absolute;
    bottom: calc(214px + env(safe-area-inset-bottom, 0px));
    ${({ $side }) => ($side === "left" ? "left: 10%;" : "right: 10%;")}
    width: 92px;
    animation: ${hop} 1.4s ease-in-out ${({ $side }) => ($side === "left" ? "0s" : "0.7s")} infinite;
    ${reduced}
`;

// Цукерка летить по дузі: зовнішній шар - рух уздовж (туди-назад), внутрішній - вгору-вниз удвічі
// частіше, тож разом виходить параболя від гарбуза до гарбуза.
const across = keyframes`
    from { transform: translateX(0); }
    to { transform: translateX(calc(80vw - 92px)); }
`;

const arc = keyframes`
    from { transform: translateY(0) rotate(0deg); }
    to { transform: translateY(-130px) rotate(200deg); }
`;

const Toss = styled.div`
    position: absolute;
    left: calc(10% + 24px);
    bottom: calc(290px + env(safe-area-inset-bottom, 0px));
    width: 44px;
    animation: ${across} 1.4s linear infinite alternate;
    ${reduced}

    & > div {
        animation: ${arc} 0.7s ease-out infinite alternate;
        ${reduced}
    }
`;

const FriendlyPumpkin = () => (
    <svg viewBox="0 0 100 92" aria-hidden="true">
        <path d="M50 14c2-8 8-12 14-12" stroke="#4d7a2a" strokeWidth="6" fill="none" strokeLinecap="round" />
        <ellipse cx="50" cy="56" rx="46" ry="34" fill="#f07a14" />
        <path d="M50 22c-7 10-7 58 0 68M50 22c7 10 7 58 0 68M28 26c-10 12-10 48 0 60M72 26c10 12 10 48 0 60" stroke="#c95a0a" strokeWidth="3" fill="none" />
        <ellipse cx="35" cy="50" rx="6" ry="8" fill="#3b1a05" />
        <ellipse cx="65" cy="50" rx="6" ry="8" fill="#3b1a05" />
        <circle cx="37" cy="47" r="2" fill="#fff4dc" />
        <circle cx="67" cy="47" r="2" fill="#fff4dc" />
        <path d="M34 66c8 10 24 10 32 0" stroke="#3b1a05" strokeWidth="5" fill="none" strokeLinecap="round" />
        <ellipse cx="24" cy="64" rx="6" ry="4" fill="#ff9f6b" opacity="0.7" />
        <ellipse cx="76" cy="64" rx="6" ry="4" fill="#ff9f6b" opacity="0.7" />
    </svg>
);

const CandyShare = () => (
    <Stage $tint="radial-gradient(circle at 50% 45%, rgba(255, 190, 90, 0.2), rgba(60, 25, 70, 0.4))">
        <Buddy $side="left">
            <FriendlyPumpkin />
        </Buddy>
        <Buddy $side="right">
            <FriendlyPumpkin />
        </Buddy>
        <Toss>
            <div>
                <WrappedCandy color="#8e44ad" />
            </div>
        </Toss>
    </Stage>
);

type EmbedResultProps = { result: Result; onClose: () => void; onRestart: () => void };

export const EmbedResult: React.FC<EmbedResultProps> = ({ result, onClose, onRestart }) => {
    const t = useT();
    const spooky = isHalloweenEmbed();
    const heading = spooky
        ? result === "win"
            ? t("halloweenWin")
            : result === "lose"
              ? t("halloweenLose")
              : t("halloweenDraw")
        : result === "win"
          ? t("resultWin")
          : result === "lose"
            ? t("resultLose")
            : t("resultDraw");
    return (
        <>
            {!spooky ? (
                <Overlay onClick={onClose} style={{ zIndex: 1600 }} />
            ) : result === "win" ? (
                <CandyRain />
            ) : result === "lose" ? (
                <Prank />
            ) : (
                <CandyShare />
            )}
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
