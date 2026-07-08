"use client";
import React, { useState } from "react";
import { Board } from "./board";
import { Title, Popup, Overlay } from "@/app/components/gameStyles";
import { PLAYER_MARKER, AI_MARKER } from "@/app/components/markers";
import {
    Grid3,
    createEmptyGrid,
    getGridWinner,
    isGridFull,
    findWinningCell,
    pickHeuristicCell,
} from "@/app/components/gameLogic";
import { DifficultTicTacToe } from "@/app/components/DifficultTicTacToe";

const makeComputerMove = (board: Grid3): [number, number] => {
    // 1. Виграти, якщо є можливість
    const winningCell = findWinningCell(board, AI_MARKER);
    if (winningCell) return winningCell;

    // 2. Заблокувати перемогу гравця
    const blockingCell = findWinningCell(board, PLAYER_MARKER);
    if (blockingCell) return blockingCell;

    // 3. Позиційний вибір: центр > кут > край
    const heuristicCell = pickHeuristicCell(board);
    if (heuristicCell) return heuristicCell;

    return [-1, -1]; // вільних клітинок немає
};

const checkWinner = (board: Grid3): string | null => {
    const marker = getGridWinner(board);
    if (marker === PLAYER_MARKER) return "X";
    if (marker === AI_MARKER) return "O";
    return null;
};

export const TicTacToe = () => {
    const [board, setBoard] = useState<Grid3>(createEmptyGrid());
    const [winner, setWinner] = useState<string | null>(null);
    const [isNoWinner, setIsNoWinner] = useState<boolean>(false);
    const [isAiTurn, setIsAiTurn] = useState<boolean>(false);
    const [showResultPopup, setShowResultPopup] = useState<boolean>(false);
    const [gameMode, setGameMode] = useState<"traditional" | "difficult">("traditional");

    // Гра вважається завершеною, коли є переможець або нічия.
    // Це окремий від showResultPopup стан: закриття попапу більше НЕ розблоковує дошку.
    const isGameOver = winner !== null || isNoWinner;

    const handleOnClick = (row: number, col: number) => {
        if (board[row][col] || isGameOver || isAiTurn) return;

        const updatedPlayerBoard = board.map((newRow, rowIndex) =>
            newRow.map((cell, cellIndex) =>
                rowIndex === row && cellIndex === col ? PLAYER_MARKER : cell
            )
        );

        setBoard(updatedPlayerBoard);

        const newWinner = checkWinner(updatedPlayerBoard);
        if (newWinner) {
            setWinner(newWinner);
            setShowResultPopup(true);
            return;
        }

        if (isGridFull(updatedPlayerBoard)) {
            setIsNoWinner(true);
            setShowResultPopup(true);
            return;
        }

        // Блокуємо клітинки на час "ходу" ШІ, щоб гравець не встиг клікнути двічі поспіль.
        setIsAiTurn(true);
        setTimeout(() => {
            const [computerRow, computerCol] = makeComputerMove(updatedPlayerBoard);
            if (computerRow === -1 || computerCol === -1) {
                setIsAiTurn(false);
                return;
            }

            const updatedBoardAfterAI = updatedPlayerBoard.map((newRow, rowIndex) =>
                newRow.map((cell, cellIndex) =>
                    rowIndex === computerRow && cellIndex === computerCol ? AI_MARKER : cell
                )
            );

            setBoard(updatedBoardAfterAI);
            setIsAiTurn(false);

            const winnerAfterAI = checkWinner(updatedBoardAfterAI);
            if (winnerAfterAI) {
                setWinner(winnerAfterAI);
                setShowResultPopup(true);
            } else if (isGridFull(updatedBoardAfterAI)) {
                setIsNoWinner(true);
                setShowResultPopup(true);
            }
        }, 500);
    };

    const restartGame = () => {
        setBoard(createEmptyGrid());
        setWinner(null);
        setIsNoWinner(false);
        setIsAiTurn(false);
        setShowResultPopup(false);
    };

    if (gameMode === "difficult") {
        return <DifficultTicTacToe setGameMode={setGameMode} />;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Title>Tic-Tac-Toe</Title>

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

            <Board board={board} handleClick={handleOnClick} restartGame={restartGame} setGameMode={setGameMode} />
        </div>
    );
};
