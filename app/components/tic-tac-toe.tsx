"use client";
import React, { useEffect, useState } from "react";
import { Board } from "./board";
import { Popup, Overlay, ScoreBoard, ScoreName, ScoreValue, ScoreDivider } from "@/app/components/gameStyles";
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
import { getActiveNames, pickRandomName } from "@/app/lib/names";
import { logGameResult } from "@/app/lib/gameLog";

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
    const [humanName, setHumanName] = useState<string | null>(null);
    const [score, setScore] = useState({ ai: 0, human: 0 });

    // Ім'я гравця для табло рахунку - обирається один раз на все ігрове
    // завантаження (не на кожну партію), щоб рахунок під час гри лишався
    // прив'язаним до того самого "імені".
    useEffect(() => {
        let cancelled = false;
        getActiveNames().then((names) => {
            if (!cancelled) setHumanName(pickRandomName(names));
        });
        return () => {
            cancelled = true;
        };
    }, []);

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

    // Оновлює табло рахунку (лише перемоги - нічия рахунок не змінює) і шле
    // подію в gameLogs для адмінського дашборду.
    const recordResult = (result: "win" | "lose" | "draw") => {
        if (result === "win") setScore((s) => ({ ...s, human: s.human + 1 }));
        if (result === "lose") setScore((s) => ({ ...s, ai: s.ai + 1 }));
        logGameResult("ai-easy", result);
    };

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
            const result = newWinner === "X" ? "win" : "lose";
            trackEvent("game_finished", { mode: "easy", result });
            recordResult(result);
            return;
        }

        if (isGridFull(updatedPlayerBoard)) {
            setIsNoWinner(true);
            setShowResultPopup(true);
            trackEvent("game_finished", { mode: "easy", result: "draw" });
            recordResult("draw");
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
                const result = winnerAfterAI === "X" ? "win" : "lose";
                trackEvent("game_finished", { mode: "easy", result });
                recordResult(result);
            } else if (isGridFull(updatedBoardAfterAI)) {
                setIsNoWinner(true);
                setShowResultPopup(true);
                trackEvent("game_finished", { mode: "easy", result: "draw" });
                recordResult("draw");
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
                humanName={humanName}
            />
        );
    }

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
                scoreBoard={scoreBoard}
            />
        </div>
    );
};
