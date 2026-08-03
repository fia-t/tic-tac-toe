"use client";
import React, { useState } from "react";
import {
    Popup,
    Overlay,
    GameLayout,
    BoardColumn,
    ButtonContainer,
    Button,
    ControlIcon,
    ButtonWithTooltip,
    Tooltip,
    ScoreBoard,
    ScoreName,
    ScoreValue,
    ScoreDivider,
} from "@/app/components/gameStyles";
import { OnlineBoardContainer, OnlineCell } from "@/app/components/onlineStyles";
import { FriendGameModal } from "@/app/components/FriendGameModal";
import { GamePiece } from "@/app/components/GamePiece";
import { trackEvent } from "@/app/lib/firebase";
import { Theme } from "@/app/lib/themes";
import { logGameResult } from "@/app/lib/gameLog";
import {
    Grid3,
    createEmptyGridN,
    getGenericWinner,
    isGridFull,
    findWinningCellGeneric,
    pickHeuristicCellGeneric,
} from "@/app/components/gameLogic";

// 5x5 - новий режим (не перейменування наявних): поле більше за класичне, тож
// перемога - 4 фішки поспіль, а не 3 (інакше на такому полі майже завжди
// виграє перший гравець за 2-3 ходи). Ділить генеричну win-логіку з gameLogic.ts
// (та сама, що дозволяє довільний winLength) і той самий параметризований
// $size-борд, що й онлайн-режими (onlineStyles.ts) - замість ще одного
// захардкодженого 3x3 CSS-грида.
const SIZE = 5;
const WIN_LENGTH = 4;

type FiveByFiveProps = {
    setGameMode: (mode: "traditional" | "difficult" | "five") => void;
    theme: Theme;
    themeReady: boolean;
    onRestart: () => void;
    humanName: string | null;
    onRoomReady: (roomId: string) => void;
    onBeforeFriendOpen?: () => Promise<boolean>;
};

const makeComputerMove = (board: Grid3, playerMarker: string, aiMarker: string): [number, number] => {
    const winningCell = findWinningCellGeneric(board, aiMarker, WIN_LENGTH);
    if (winningCell) return winningCell;

    const blockingCell = findWinningCellGeneric(board, playerMarker, WIN_LENGTH);
    if (blockingCell) return blockingCell;

    const heuristicCell = pickHeuristicCellGeneric(board, aiMarker, playerMarker, WIN_LENGTH);
    if (heuristicCell) return heuristicCell;

    return [-1, -1];
};

const checkWinner = (board: Grid3, playerMarker: string, aiMarker: string): string | null => {
    const marker = getGenericWinner(board, WIN_LENGTH);
    if (marker === playerMarker) return "X";
    if (marker === aiMarker) return "O";
    return null;
};

export const FiveByFiveTicTacToe: React.FC<FiveByFiveProps> = ({
    setGameMode,
    theme,
    themeReady,
    onRestart,
    humanName,
    onRoomReady,
    onBeforeFriendOpen,
}) => {
    const [board, setBoard] = useState<Grid3>(() => createEmptyGridN(SIZE));
    const [winner, setWinner] = useState<string | null>(null);
    const [isNoWinner, setIsNoWinner] = useState<boolean>(false);
    const [isAiTurn, setIsAiTurn] = useState<boolean>(false);
    const [showResultPopup, setShowResultPopup] = useState<boolean>(false);
    const [isFriendModalOpen, setIsFriendModalOpen] = useState<boolean>(false);
    const [score, setScore] = useState({ ai: 0, human: 0 });

    const playerMarker = theme.xMarkerUrl;
    const aiMarker = theme.oMarkerUrl;

    const isGameOver = winner !== null || isNoWinner;

    const recordResult = (result: "win" | "lose" | "draw") => {
        if (result === "win") setScore((s) => ({ ...s, human: s.human + 1 }));
        if (result === "lose") setScore((s) => ({ ...s, ai: s.ai + 1 }));
        logGameResult("ai-5x5", result);
    };

    const handleCellClick = (row: number, col: number) => {
        if (!themeReady || board[row][col] || isGameOver || isAiTurn) return;

        const updatedPlayerBoard = board.map((r, rowIndex) =>
            r.map((cell, cellIndex) => (rowIndex === row && cellIndex === col ? playerMarker : cell))
        );
        setBoard(updatedPlayerBoard);

        const newWinner = checkWinner(updatedPlayerBoard, playerMarker, aiMarker);
        if (newWinner) {
            setWinner(newWinner);
            setShowResultPopup(true);
            const result = newWinner === "X" ? "win" : "lose";
            trackEvent("game_finished", { mode: "five", result });
            recordResult(result);
            return;
        }

        if (isGridFull(updatedPlayerBoard)) {
            setIsNoWinner(true);
            setShowResultPopup(true);
            trackEvent("game_finished", { mode: "five", result: "draw" });
            recordResult("draw");
            return;
        }

        setIsAiTurn(true);
        setTimeout(() => {
            const [aiRow, aiCol] = makeComputerMove(updatedPlayerBoard, playerMarker, aiMarker);
            if (aiRow === -1 || aiCol === -1) {
                setIsAiTurn(false);
                return;
            }

            const updatedBoardAfterAI = updatedPlayerBoard.map((r, rowIndex) =>
                r.map((cell, cellIndex) => (rowIndex === aiRow && cellIndex === aiCol ? aiMarker : cell))
            );
            setBoard(updatedBoardAfterAI);
            setIsAiTurn(false);

            const winnerAfterAI = checkWinner(updatedBoardAfterAI, playerMarker, aiMarker);
            if (winnerAfterAI) {
                setWinner(winnerAfterAI);
                setShowResultPopup(true);
                const result = winnerAfterAI === "X" ? "win" : "lose";
                trackEvent("game_finished", { mode: "five", result });
                recordResult(result);
            } else if (isGridFull(updatedBoardAfterAI)) {
                setIsNoWinner(true);
                setShowResultPopup(true);
                trackEvent("game_finished", { mode: "five", result: "draw" });
                recordResult("draw");
            }
        }, 500);
    };

    const restartGame = () => {
        setBoard(createEmptyGridN(SIZE));
        setWinner(null);
        setIsNoWinner(false);
        setIsAiTurn(false);
        setShowResultPopup(false);
        onRestart();
        trackEvent("game_restart", { mode: "five" });
    };

    const handleFriendClick = async () => {
        trackEvent("friend_modal_open", { from: "five" });
        if (onBeforeFriendOpen) {
            const allowed = await onBeforeFriendOpen();
            if (!allowed) return;
        }
        setIsFriendModalOpen(true);
    };

    const scoreBoard = (
        <ScoreBoard>
            <ScoreName>🤖 ШІ</ScoreName>
            <ScoreValue>{score.ai}</ScoreValue>
            <ScoreDivider>—</ScoreDivider>
            <ScoreValue>{score.human}</ScoreValue>
            <ScoreName>{humanName ?? "Гравець"}</ScoreName>
        </ScoreBoard>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {winner && showResultPopup && (
                <>
                    <Overlay onClick={() => setShowResultPopup(false)} />
                    <Popup $result={winner === "X" ? "win" : "lose"} onClick={() => setShowResultPopup(false)}>
                        {winner === "X" ? "You Win!" : "AI Wins!"}
                    </Popup>
                </>
            )}

            {isNoWinner && !winner && showResultPopup && (
                <>
                    <Overlay onClick={() => setShowResultPopup(false)} />
                    <Popup $result="draw" onClick={(e) => { e.stopPropagation(); setShowResultPopup(false); }}>
                        No one wins
                    </Popup>
                </>
            )}

            <GameLayout>
                <BoardColumn>
                    {scoreBoard}
                    <OnlineBoardContainer $size={SIZE} $backgroundUrl={theme.backgroundUrl}>
                        {board.flat().map((cell, index) => {
                            const row = Math.floor(index / SIZE);
                            const col = index % SIZE;
                            return (
                                <OnlineCell
                                    key={index}
                                    $borderRight={col < SIZE - 1}
                                    $borderBottom={row < SIZE - 1}
                                    $disabled={!themeReady || isGameOver || isAiTurn || cell !== null}
                                    onClick={() => handleCellClick(row, col)}
                                >
                                    {cell && <GamePiece src={cell} />}
                                </OnlineCell>
                            );
                        })}
                    </OnlineBoardContainer>
                </BoardColumn>

                <ButtonContainer>
                    <Button onClick={restartGame} aria-label="Restart">
                        <ControlIcon src="/images/reload.png" alt="Restart" />
                    </Button>
                    <ButtonWithTooltip>
                        <Button
                            onClick={() => {
                                trackEvent("select_mode", { mode: "easy" });
                                setGameMode("traditional");
                            }}
                            aria-label="Easy"
                        >
                            <ControlIcon src="/images/traditional.png" alt="Easy" />
                        </Button>
                        <Tooltip>Easy</Tooltip>
                    </ButtonWithTooltip>
                    <ButtonWithTooltip>
                        <Button
                            onClick={() => {
                                trackEvent("select_mode", { mode: "five" });
                                setGameMode("five");
                            }}
                            aria-label="5x5"
                        >
                            <ControlIcon src="/images/game-5x5.png" alt="5x5" />
                        </Button>
                        <Tooltip>5×5</Tooltip>
                    </ButtonWithTooltip>
                    <ButtonWithTooltip>
                        <Button
                            onClick={() => {
                                trackEvent("select_mode", { mode: "hard" });
                                setGameMode("difficult");
                            }}
                            aria-label="Hard"
                        >
                            <ControlIcon src="/images/difficult.png" alt="Hard" />
                        </Button>
                        <Tooltip>Hard</Tooltip>
                    </ButtonWithTooltip>
                    <ButtonWithTooltip>
                        <Button onClick={handleFriendClick} aria-label="Play with a friend">
                            <ControlIcon src="/images/game_with_friends.png" alt="Play with a friend" />
                        </Button>
                        <Tooltip>Friend</Tooltip>
                    </ButtonWithTooltip>
                </ButtonContainer>

                {isFriendModalOpen && (
                    <FriendGameModal
                        onClose={() => setIsFriendModalOpen(false)}
                        onRoomReady={onRoomReady}
                        defaultMode="5x5"
                    />
                )}
            </GameLayout>
        </div>
    );
};

export default FiveByFiveTicTacToe;
