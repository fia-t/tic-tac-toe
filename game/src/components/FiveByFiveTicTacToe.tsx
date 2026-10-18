"use client";
import { ResultPopup, useRoundSummary } from "@game/components/ResultPopup";
import React, { useState, useMemo } from "react";
import styled from "styled-components";
import { MoundTile, moleWarnCss } from "@game/components/MoleTiles";
import { hintedCell } from "@game/components/gameStyles";
import { OnlineBoardContainer, OnlineCell } from "@game/components/onlineStyles";
import { GameScreen } from "@game/components/GameScreen";
import { GamePiece } from "@game/components/GamePiece";
import { trackEvent } from "@game/lib/firebase";
import { Theme } from "@game/lib/themes";
import { logGameResult } from "@game/lib/gameLog";
import {
    Grid3,
    getGenericWinner,
    isGridFull,
    findWinningCellGeneric,
    pickHeuristicCellGeneric,
    countMarker,
    encodeGrid,
    winningIndexSet,
} from "@game/components/gameLogic";
import { useT } from "@game/lib/i18n";
import { Difficulty, getDifficulty, shouldBlunder } from "@game/lib/difficulty";
import { pickMasterMoveN, randomFreeCell } from "@game/components/aiLevels";
import { playSound } from "@game/lib/sound";
import { EMPTY_HISTORY, EMPTY_MOLE, MOUND, MoleState, ModHistory, STONE, TurnResult, createBoard, moleStep, playTurn, randomLegalCell } from "@game/components/modEngine";
import { STONES_COUNT, TIMER_SECONDS, effectiveModifier, useModifierChoice } from "@game/lib/modifiers";
import { useMoveTimer } from "@game/components/MoveTimer";

// Камінь (модифікатор "каміння") - нейтральна клітинка, яку не можна зайняти.
const StoneTile = styled.div`
    width: 70%;
    height: 70%;
    border-radius: 32%;
    background: radial-gradient(circle at 35% 30%, #c2b6a4, #7f7465 70%);
    box-shadow:
        inset 0 -5px 0 rgba(0, 0, 0, 0.25),
        inset 0 3px 4px rgba(255, 255, 255, 0.3),
        0 4px 6px rgba(0, 0, 0, 0.2);
`;

const Cell = styled(OnlineCell)<{ $hint: boolean; $warn?: boolean }>`
    ${({ $hint }) => ($hint ? hintedCell : "")}
    ${({ $warn }) => ($warn ? moleWarnCss : "")}
`;

// 5x5 - поле більше за класичне, тож перемога - 4 фішки поспіль, а не 3 (інакше на такому
// полі майже завжди виграє перший гравець за 2-3 ходи). Ділить генеричну win-логіку з
// gameLogic.ts і той самий параметризований $size-борд, що й онлайн-режими (onlineStyles.ts).
const SIZE = 5;
const WIN_LENGTH = 4;

type FiveByFiveProps = {
    setGameMode: (mode: "traditional" | "difficult" | "five") => void;
    theme: Theme;
    themeReady: boolean;
    humanName: string | null;
    onRoomReady: (roomId: string) => void;
    onBeforeFriendOpen?: () => Promise<boolean>;
    // "До меню" у вікні результату.
    onMenu?: () => void;
    // Виклик дня показує власну картку результату замість звичайного попапу.
    hideResultPopup?: boolean;
};

const makeComputerMove = (board: Grid3, playerMarker: string, aiMarker: string, difficulty: Difficulty): [number, number] => {
    // Легкий: інколи просто випадковий хід. Майстер: бачить і будує "вилки".
    if (shouldBlunder(difficulty)) {
        const randomCell = randomFreeCell(board);
        if (randomCell) return randomCell;
    }
    if (difficulty === "master") return pickMasterMoveN(board, aiMarker, playerMarker, WIN_LENGTH) ?? [-1, -1];

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

type Snapshot = { board: Grid3; hist: ModHistory; mole: MoleState };

export const FiveByFiveTicTacToe: React.FC<FiveByFiveProps> = ({
    setGameMode,
    theme,
    themeReady,
    humanName,
    onRoomReady,
    onBeforeFriendOpen,
    onMenu,
    hideResultPopup = false,
}) => {
    const t = useT();
    // Модифікатор фіксується на всю партію: його зміна перемонтовує компонент (key у TicTacToe).
    const modifier = effectiveModifier("five", useModifierChoice());
    const stones = modifier === "stones" ? STONES_COUNT : 0;
    const [board, setBoard] = useState<Grid3>(() => createBoard(SIZE, stones));
    const [hist, setHist] = useState<ModHistory>(EMPTY_HISTORY);
    const [mole, setMole] = useState<MoleState>(EMPTY_MOLE);
    const [winner, setWinner] = useState<string | null>(null);
    const [isNoWinner, setIsNoWinner] = useState<boolean>(false);
    const [isAiTurn, setIsAiTurn] = useState<boolean>(false);
    const [showResultPopup, setShowResultPopup] = useState<boolean>(false);
    const [score, setScore] = useState({ ai: 0, human: 0 });
    // Бустери: позиції перед ходами гравця і клітинка-підказка; round - номер партії.
    const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
    const [hintCell, setHintCell] = useState<number | null>(null);
    const [round, setRound] = useState(0);

    const playerMarker = theme.xMarkerUrl;
    const aiMarker = theme.oMarkerUrl;

    const isGameOver = winner !== null || isNoWinner;
    const roundCells = useMemo(() => board.flat(), [board]);
    const roundSummary = useRoundSummary(roundCells, playerMarker);

    const recordResult = (result: "win" | "lose" | "draw") => {
        if (result === "win") setScore((s) => ({ ...s, human: s.human + 1 }));
        if (result === "lose") setScore((s) => ({ ...s, ai: s.ai + 1 }));
        logGameResult("ai-5x5", result);
    };

    // --- партія з модифікатором правил (гравітація, каміння, мізер): хід через modEngine ---
    const rules = { gravity: modifier === "gravity", misere: modifier === "misere" };
    const isMole = modifier === "mole";
    const ruleMode = rules.gravity || rules.misere || modifier === "stones" || isMole;
    const markers = { player: playerMarker, ai: aiMarker };

    const pushUndo = () => {
        setUndoStack((stack) => [...stack, { board, hist, mole }]);
        setHintCell(null);
    };

    const finishRuleGame = (turn: TurnResult) => {
        const outcome = turn.outcome?.winner ?? "draw";
        const result = outcome === "draw" ? "draw" : outcome === "X" ? "win" : "lose";
        if (outcome === "draw") setIsNoWinner(true);
        else setWinner(outcome);
        setShowResultPopup(true);
        trackEvent("game_finished", {
            mode: "five",
            result,
            modifier,
            moves: Math.ceil(turn.hist.moves / 2),
            grid: encodeGrid(turn.grid, playerMarker, aiMarker),
        });
        recordResult(result);
    };

    // Після справжнього ходу (не в переборі ШІ) - крок крота, якщо грає модифікатор "кріт".
    const afterMove = (turn: TurnResult, state: MoleState): { turn: TurnResult; mole: MoleState } => {
        if (!isMole || turn.outcome) return { turn, mole: state };
        const step = moleStep(turn.grid, state, WIN_LENGTH, markers);
        return { turn: { ...turn, grid: step.grid }, mole: step.mole };
    };

    const handleRuleClick = (row: number, col: number) => {
        const played = playTurn(board, hist, rules, WIN_LENGTH, markers, "X", { index: row * SIZE + col });
        if (!played) return;
        pushUndo();
        const { turn, mole: moleAfter } = afterMove(played, mole);
        setBoard(turn.grid);
        setHist(turn.hist);
        setMole(moleAfter);
        playSound("move");
        if (turn.outcome) return finishRuleGame(turn);

        setIsAiTurn(true);
        setTimeout(() => {
            const replied = playTurn(turn.grid, turn.hist, rules, WIN_LENGTH, markers, "O", { difficulty: getDifficulty() });
            setIsAiTurn(false);
            if (!replied) return;
            const { turn: reply, mole: moleReply } = afterMove(replied, moleAfter);
            setBoard(reply.grid);
            setHist(reply.hist);
            setMole(moleReply);
            playSound("reply");
            if (reply.outcome) finishRuleGame(reply);
        }, 500);
    };

    const handleCellClick = (row: number, col: number) => {
        if (!themeReady || isGameOver || isAiTurn) return;
        // З гравітацією натискання будь-якої клітинки стовпця кидає фішку в нього.
        if (ruleMode) {
            handleRuleClick(row, col);
            return;
        }
        if (board[row][col]) return;

        const updatedPlayerBoard = board.map((r, rowIndex) =>
            r.map((cell, cellIndex) => (rowIndex === row && cellIndex === col ? playerMarker : cell))
        );
        pushUndo();
        setBoard(updatedPlayerBoard);
        playSound("move");

        const newWinner = checkWinner(updatedPlayerBoard, playerMarker, aiMarker);
        if (newWinner) {
            setWinner(newWinner);
            setShowResultPopup(true);
            const result = newWinner === "X" ? "win" : "lose";
            trackEvent("game_finished", { mode: "five", result, moves: countMarker(updatedPlayerBoard, playerMarker), grid: encodeGrid(updatedPlayerBoard, playerMarker, aiMarker) });
            recordResult(result);
            return;
        }

        if (isGridFull(updatedPlayerBoard)) {
            setIsNoWinner(true);
            setShowResultPopup(true);
            trackEvent("game_finished", { mode: "five", result: "draw", moves: countMarker(updatedPlayerBoard, playerMarker), grid: encodeGrid(updatedPlayerBoard, playerMarker, aiMarker) });
            recordResult("draw");
            return;
        }

        setIsAiTurn(true);
        setTimeout(() => {
            const [aiRow, aiCol] = makeComputerMove(updatedPlayerBoard, playerMarker, aiMarker, getDifficulty());
            if (aiRow === -1 || aiCol === -1) {
                setIsAiTurn(false);
                return;
            }

            const updatedBoardAfterAI = updatedPlayerBoard.map((r, rowIndex) =>
                r.map((cell, cellIndex) => (rowIndex === aiRow && cellIndex === aiCol ? aiMarker : cell))
            );
            setBoard(updatedBoardAfterAI);
            playSound("reply");
            setIsAiTurn(false);

            const winnerAfterAI = checkWinner(updatedBoardAfterAI, playerMarker, aiMarker);
            if (winnerAfterAI) {
                setWinner(winnerAfterAI);
                setShowResultPopup(true);
                const result = winnerAfterAI === "X" ? "win" : "lose";
                trackEvent("game_finished", { mode: "five", result, moves: countMarker(updatedBoardAfterAI, playerMarker), grid: encodeGrid(updatedBoardAfterAI, playerMarker, aiMarker) });
                recordResult(result);
            } else if (isGridFull(updatedBoardAfterAI)) {
                setIsNoWinner(true);
                setShowResultPopup(true);
                trackEvent("game_finished", { mode: "five", result: "draw", moves: countMarker(updatedBoardAfterAI, playerMarker), grid: encodeGrid(updatedBoardAfterAI, playerMarker, aiMarker) });
                recordResult("draw");
            }
        }, 500);
    };

    const timerLeft = useMoveTimer(
        modifier === "timer" && themeReady && !isAiTurn && !isGameOver,
        board,
        TIMER_SECONDS,
        () => {
            const empty = board.flat().flatMap((cell, i) => (cell === null ? [i] : []));
            const index = ruleMode ? randomLegalCell(board, rules, markers) : empty[Math.floor(Math.random() * empty.length)];
            if (index === null || index === undefined) return;
            handleCellClick(Math.floor(index / SIZE), index % SIZE);
        },
        round
    );

    const restartGame = () => {
        setBoard(createBoard(SIZE, stones));
        setHist(EMPTY_HISTORY);
        setMole(EMPTY_MOLE);
        setWinner(null);
        setIsNoWinner(false);
        setIsAiTurn(false);
        setShowResultPopup(false);
        setUndoStack([]);
        setHintCell(null);
        setRound((r) => r + 1);
        trackEvent("game_restart", { mode: "five" });
    };

    // Бустер "Скасувати хід": позиція перед останнім ходом гравця (разом із відповіддю бота).
    const undoMove = () => {
        const last = undoStack[undoStack.length - 1];
        if (!last) return;
        setUndoStack((stack) => stack.slice(0, -1));
        setBoard(last.board);
        setHist(last.hist);
        setMole(last.mole);
        setHintCell(null);
    };

    // Бустер "Підказка": найкращий хід гравця (як порадив би Майстер).
    const showHint = () => {
        if (ruleMode) {
            const turn = playTurn(board, hist, rules, WIN_LENGTH, markers, "X", { difficulty: "master" });
            if (!turn) return;
            const flat = board.flat();
            const index = turn.grid.flat().findIndex((cell, i) => cell === playerMarker && flat[i] !== playerMarker);
            setHintCell(index >= 0 ? index : null);
            return;
        }
        const cell = pickMasterMoveN(board, playerMarker, aiMarker, WIN_LENGTH);
        setHintCell(cell ? cell[0] * SIZE + cell[1] : null);
    };

    const statusText = isGameOver
        ? winner === "X" ? t("resultWin") : winner ? t("resultLose") : t("resultDraw")
        : isAiTurn ? t("aiThinking") : t("yourTurn");

    const winningCells = winner ? winningIndexSet(board, WIN_LENGTH) : undefined;
    const playerTurn = !isGameOver && !isAiTurn;

    return (
        <>
            {/* Вікно результату. Закриття лише ховає його - дошка лишається заблокованою до рестарту. */}
            {(winner || isNoWinner) && showResultPopup && !hideResultPopup && (
                <ResultPopup
                    result={winner === "X" ? "win" : winner ? "lose" : "draw"}
                    summary={roundSummary}
                    onClose={() => setShowResultPopup(false)}
                    onRestart={restartGame}
                    onMenu={onMenu}
                />
            )}

            <GameScreen
                mode="five"
                onSetMode={setGameMode}
                onRestart={restartGame}
                onRoomReady={onRoomReady}
                onBeforeFriendOpen={onBeforeFriendOpen}
                score={score}
                humanName={humanName}
                status={statusText}
                over={isGameOver}
                timer={modifier === "timer" ? timerLeft : null}
                onShowResult={() => setShowResultPopup(true)}
                boosters={{
                    canUndo: playerTurn && undoStack.length > 0,
                    canHint: playerTurn,
                    onUndo: undoMove,
                    onHint: showHint,
                    resetKey: round,
                }}
                board={
                    <OnlineBoardContainer $size={SIZE} $backgroundUrl={theme.backgroundUrl} $maxWidth={628}>
                        {board.flat().map((cell, index) => {
                            const row = Math.floor(index / SIZE);
                            const col = index % SIZE;
                            return (
                                <Cell
                                    key={index}
                                    $hint={hintCell === index}
                                    $warn={isMole && !isGameOver && mole.warn === index}
                                    $disabled={!themeReady || isGameOver || isAiTurn || (cell !== null && !rules.gravity)}
                                    onClick={() => handleCellClick(row, col)}
                                >
                                    {cell === STONE ? (
                                        <StoneTile role="img" aria-label={t("modifier_stones")} />
                                    ) : cell === MOUND ? (
                                        <MoundTile role="img" aria-label={t("moleMound", { n: String(mole.mounds.find((m) => m.index === index)?.ttl ?? 0) })}>
                                            <b>{mole.mounds.find((m) => m.index === index)?.ttl}</b>
                                        </MoundTile>
                                    ) : (
                                        cell && <GamePiece src={cell} winning={winningCells?.has(index)} />
                                    )}
                                </Cell>
                            );
                        })}
                    </OnlineBoardContainer>
                }
            />
        </>
    );
};

export default FiveByFiveTicTacToe;
