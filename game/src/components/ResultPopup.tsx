"use client";
import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Overlay } from "@game/components/gameStyles";
import { ModalCard, PillButton } from "@game/components/onlineStyles";
import { buttonTone } from "@game/components/GameButton";
import { Coin } from "@game/components/SkinShop";
import { useWallet } from "@game/lib/wallet";
import { useProfile } from "@game/lib/profile";
import { useT } from "@game/lib/i18n";

// Вікно після партії проти ШІ (як у прототипі): режим і результат по центру, нагороди -
// іконки з числами (не кнопки), далі "Ще раз" і "До меню". Клік поза вікном лише ховає його.

export type RoundSummary = { coins: number; xp: number; moves: number };

// Підсумок поточної партії: скільки ходів зробив гравець і скільки монет/досвіду додалось.
// Нагороди нараховують обробники ігрових подій (wallet.ts, profile.ts) - тут різниця між
// станом на початку партії і зараз; поки гравець не походив, точка відліку оновлюється.
export const useRoundSummary = (cells: unknown[], playerMarker: string): RoundSummary => {
    const wallet = useWallet();
    const profile = useProfile();
    const base = useRef({ coins: wallet.coins, xp: profile.xp });
    const prev = useRef<unknown[]>(cells);
    const [moves, setMoves] = useState(0);

    useEffect(() => {
        const before = prev.current;
        prev.current = cells;
        const playerCells = cells.filter((cell) => cell === playerMarker).length;
        if (playerCells === 0) {
            // Нова партія (або ще не походили) - відлік з нуля.
            setMoves(0);
            base.current = { coins: wallet.coins, xp: profile.xp };
            return;
        }
        const placed = cells.filter((cell, i) => cell === playerMarker && before[i] !== playerMarker).length;
        if (placed > 0) setMoves((m) => m + placed);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- рахуємо лише зміни дошки
    }, [cells, playerMarker]);

    return {
        coins: Math.max(0, wallet.coins - base.current.coins),
        xp: Math.max(0, profile.xp - base.current.xp),
        moves,
    };
};

const Card = styled(ModalCard)`
    text-align: center;
`;

const Eyebrow = styled.div`
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #7a5a35;
`;

const Title = styled.h2<{ $result: "win" | "lose" | "draw" }>`
    margin: 4px 0 10px;
    font-size: clamp(26px, 7vw, 32px);
    font-weight: 900;
    color: ${({ $result }) => ($result === "win" ? "#0f6f8c" : $result === "lose" ? "#b32f1c" : "#49301f")};
`;

const Rewards = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin: 0 0 8px;
    padding: 10px 4px;
    border-top: 1px dashed rgba(139, 101, 60, 0.3);
    border-bottom: 1px dashed rgba(139, 101, 60, 0.3);
`;

// Нагорода: іконка зліва від числа в одному рядку, підпис під ними.
const Stat = styled.div`
    display: grid;
    grid-template-columns: auto auto;
    justify-content: center;
    align-items: center;
    column-gap: 6px;
    row-gap: 2px;
    padding: 8px 4px;
    border-radius: 14px;
    background: rgba(255, 238, 205, 0.7);

    b {
        font-size: 20px;
        font-weight: 900;
        color: #49301f;
        font-variant-numeric: tabular-nums;
    }

    small {
        grid-column: 1 / -1;
        font-size: 12px;
        font-weight: 700;
        color: #7a5a35;
    }
`;

const XpStar = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5l2.6 6.1 6.6.5-5 4.3 1.6 6.4L12 16.4 6.2 19.8l1.6-6.4-5-4.3 6.6-.5z" fill="#1fb3d9" stroke="#0f6f8c" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
);

// Ходи - сліди: два відбитки ступні.
const Steps = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
        <g fill="#9a6232">
            <ellipse cx="6.8" cy="16.8" rx="3.3" ry="5.2" transform="rotate(-10 6.8 16.8)" />
            <circle cx="4.2" cy="9.6" r="1.3" />
            <circle cx="6.6" cy="8.8" r="1.4" />
            <circle cx="9" cy="9.4" r="1.2" />
            <ellipse cx="17.2" cy="10" rx="3.3" ry="5.2" transform="rotate(10 17.2 10)" />
            <circle cx="15" cy="2.9" r="1.2" />
            <circle cx="17.4" cy="2.4" r="1.4" />
            <circle cx="19.8" cy="3.2" r="1.3" />
        </g>
    </svg>
);

const PrimaryButton = styled(PillButton)`
    ${buttonTone("primary")}
`;

type ResultPopupProps = {
    result: "win" | "lose" | "draw";
    summary: RoundSummary;
    onClose: () => void;
    onRestart: () => void;
    onMenu?: () => void;
};

export const ResultPopup: React.FC<ResultPopupProps> = ({ result, summary, onClose, onRestart, onMenu }) => {
    const t = useT();
    const title = result === "win" ? t("resultWin") : result === "lose" ? t("resultLose") : t("resultDraw");
    return (
        <>
            <Overlay onClick={onClose} style={{ zIndex: 1600 }} />
            <Card role="dialog" aria-modal="true" aria-labelledby="result-title" onClick={(e) => e.stopPropagation()} style={{ zIndex: 1601 }}>
                <Eyebrow>{t("homeQuick")}</Eyebrow>
                <Title id="result-title" $result={result}>
                    {title}
                </Title>
                <Rewards role="list">
                    <Stat role="listitem">
                        <Coin size={26} />
                        <b>+{summary.coins}</b>
                        <small>{t("resultCoins")}</small>
                    </Stat>
                    <Stat role="listitem">
                        <XpStar />
                        <b>+{summary.xp}</b>
                        <small>{t("resultXp")}</small>
                    </Stat>
                    <Stat role="listitem">
                        <Steps />
                        <b>{summary.moves}</b>
                        <small>{t("resultMoves")}</small>
                    </Stat>
                </Rewards>
                <PrimaryButton type="button" onClick={onRestart}>
                    {t("playAgain")}
                </PrimaryButton>
                {onMenu && (
                    <PillButton type="button" $variant="ghost" onClick={onMenu}>
                        {t("backToMenu")}
                    </PillButton>
                )}
            </Card>
        </>
    );
};
