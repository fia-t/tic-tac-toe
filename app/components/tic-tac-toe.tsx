"use client";
import React, { useEffect, useState } from "react";
import { Board } from "./board";
import { Popup, Overlay } from "@/app/components/gameStyles";
import { trackEvent } from "@/app/lib/firebase";
import {
    Grid3,
    createEmptyGrid,
    getGridWinner,
    isGridFull,
    findWinningCell,
    pickHeuristicCell,
} from "@/app/components/gameLogic";
import { DifficultTicTacToe } from "@/app/components/DifficultTicTacToe";
import { DEFAULT_THEME, Theme, getActiveThemes, pickRandomTheme } from "@/app/lib/themes";

const makeComputerMove = (board: Grid3, playerMarker: string, aiMarker: string): [number, number] => {
    // 1. Виграти, якщо є можливість
    const winningCell = findWinningCell(board, aiMarker);
    if (winningCell) return winningCell;

    // 2. Заблокувати перемогу гравця
    const blockingCell = findWinningCell(board, playerMarker);
    if (blockingCell) return blockingCell;

    // 3. Позиційний вибір: центр > кут > край
    const heuristicCell = pickHeuristicCell(board);
    if (heuristicCell) return heuristicCell;

    return [-1, -1]; // вільних клітинок немає
};

const checkWinner = (board: Grid3, playerMarker: string, aiMarker: string): string | null => {
    const marker = getGridWinner(board);
    if (marker === playerMarker) return "X";
    if (marker === aiMarker) return "O";
    return null;
};

export const TicTacToe = () => {
    const [board, setBoard] = useState<Grid3>(createEmptyGrid());
    const [winner, setWinner] = useState<string | null>(null);
    const [isNoWinner, setIsNoWinner] = useState<boolean>(false);
    const [isAiTurn, setIsAiTurn] = useState<boolean>(false);
    const [showResultPopup, setShowResultPopup] = useState<boolean>(false);
    const [gameMode, setGameMode] = useState<"traditional" | "difficult">("traditional");
    const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
    const [themeReady, setThemeReady] = useState(false);
    const [availableThemes, setAvailableThemes] = useState<Theme[]>([]);

    // Список активних тем завантажується один раз на все ігрове завантаження.
    // Сама тема лишається сталою, поки триває партія - інакше вже виставлені
    // фішки могли б лишитись зі старим скіном - але при рестарті (pickNewTheme)
    // обирається наново з цього ж списку, без повторного походу у Firestore.
    // До моменту завантаження дошка рендериться з DEFAULT_THEME і кліки
    // ігноруються (themeReady нижче), щоб не вийшло гри з "напівзмішаними" скінами.
    useEffect(() => {
        let cancelled = false;
        getActiveThemes().then((themes) => {
            if (cancelled) return;
            setAvailableThemes(themes);
            setTheme(pickRandomTheme(themes));
            setThemeReady(true);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const pickNewTheme = () => setTheme(pickRandomTheme(availableThemes));

    const playerMarker = theme.xMarkerUrl;
    const aiMarker = theme.oMarkerUrl;

    // Гра вважається завершеною, коли є переможець або нічия.
    // Це окремий від showResultPopup стан: закриття попапу більше НЕ розблоковує дошку.
    const isGameOver = winner !== null || isNoWinner;

    const handleOnClick = (row: number, col: number) => {
        if (!themeReady || board[row][col] || isGameOver || isAiTurn) return;

        const updatedPlayerBoard = board.map((newRow, rowIndex) =>
            newRow.map((cell, cellIndex) =>
                rowIndex === row && cellIndex === col ? playerMarker : cell
            )
        );

        setBoard(updatedPlayerBoard);

        const newWinner = checkWinner(updatedPlayerBoard, playerMarker, aiMarker);
        if (newWinner) {
            setWinner(newWinner);
            setShowResultPopup(true);
            trackEvent("game_finished", { mode: "easy", result: newWinner === "X" ? "win" : "lose" });
            return;
        }

        if (isGridFull(updatedPlayerBoard)) {
            setIsNoWinner(true);
            setShowResultPopup(true);
            trackEvent("game_finished", { mode: "easy", result: "draw" });
            return;
        }

        // Блокуємо клітинки на час "ходу" ШІ, щоб гравець не встиг клікнути двічі поспіль.
        setIsAiTurn(true);
        setTimeout(() => {
            const [computerRow, computerCol] = makeComputerMove(updatedPlayerBoard, playerMarker, aiMarker);
            if (computerRow === -1 || computerCol === -1) {
                setIsAiTurn(false);
                return;
            }

            const updatedBoardAfterAI = updatedPlayerBoard.map((newRow, rowIndex) =>
                newRow.map((cell, cellIndex) =>
                    rowIndex === computerRow && cellIndex === computerCol ? aiMarker : cell
                )
            );

            setBoard(updatedBoardAfterAI);
            setIsAiTurn(false);

            const winnerAfterAI = checkWinner(updatedBoardAfterAI, playerMarker, aiMarker);
            if (winnerAfterAI) {
                setWinner(winnerAfterAI);
                setShowResultPopup(true);
                trackEvent("game_finished", { mode: "easy", result: winnerAfterAI === "X" ? "win" : "lose" });
            } else if (isGridFull(updatedBoardAfterAI)) {
                setIsNoWinner(true);
                setShowResultPopup(true);
                trackEvent("game_finished", { mode: "easy", result: "draw" });
            }
        }, 500);
    };

    const restartGame = () => {
        setBoard(createEmptyGrid());
        setWinner(null);
        setIsNoWinner(false);
        setIsAiTurn(false);
        setShowResultPopup(false);
        pickNewTheme();
        trackEvent("game_restart", { mode: "easy" });
    };

    if (gameMode === "difficult") {
        return (
            <DifficultTicTacToe
                setGameMode={setGameMode}
                theme={theme}
                themeReady={themeReady}
                onRestart={pickNewTheme}
            />
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Попап для перемоги/поразки. Закриття попапу лише ховає його - дошка лишається заблокованою до рестарту. */}
            {winner && showResultPopup && (
                <>
                    <Overlay onClick={() => setShowResultPopup(false)} />
                    <Popup $result={winner === "X" ? "win" : "lose"} onClick={() => setShowResultPopup(false)}>
                        {winner === "X" ? "You Win!" : "AI Wins!"}
                    </Popup>
                </>
            )}

            {/* Попап для нічиєї */}
            {isNoWinner && !winner && showResultPopup && (
                <>
                    <Overlay onClick={() => setShowResultPopup(false)} />
                    <Popup $result="draw" onClick={(e) => { e.stopPropagation(); setShowResultPopup(false); }}>
                        No one wins
                    </Popup>
                </>
            )}

            <Board
                board={board}
                handleClick={handleOnClick}
                restartGame={restartGame}
                setGameMode={setGameMode}
                backgroundUrl={theme.backgroundUrl}
            />
        </div>
    );
};
