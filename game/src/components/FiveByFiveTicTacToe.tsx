"use client";
import { IconFriends, IconMode3, IconMode5, IconModeUltimate, IconRestart } from "@game/components/GameIcons";
import React, { useState } from "react";
import styled from "styled-components";
import {
    Popup,
    ResultOverlay,
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
} from "@game/components/gameStyles";
import { OnlineBoardContainer, OnlineCell } from "@game/components/onlineStyles";
import { FriendGameModal } from "@game/components/FriendGameModal";
import { GamePiece } from "@game/components/GamePiece";
import { trackEvent } from "@game/lib/firebase";
import { Theme } from "@game/lib/themes";
import { logGameResult } from "@game/lib/gameLog";
import {
    Grid3,
    createEmptyGridN,
    getGenericWinner,
    isGridFull,
    findWinningCellGeneric,
    pickHeuristicCellGeneric,
    countMarker,
    encodeGrid,
    winningIndexSet,
} from "@game/components/gameLogic";
import { assetUrl } from "@game/lib/assets";
import { useT } from "@game/lib/i18n";
import { Difficulty, getDifficulty, shouldBlunder } from "@game/lib/difficulty";
import { pickMasterMoveN, randomFreeCell } from "@game/components/aiLevels";
import { DifficultyPicker } from "@game/components/DifficultyPicker";
import { playSound } from "@game/lib/sound";
import { EMPTY_HISTORY, ModHistory, STONE, TurnResult, createBoard, playTurn, randomLegalCell } from "@game/components/modEngine";
import { STONES_COUNT, TIMER_SECONDS, effectiveModifier, useModifierChoice } from "@game/lib/modifiers";
import { MoveTimerBar, useMoveTimer } from "@game/components/MoveTimer";

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

export const FiveByFiveTicTacToe: React.FC<FiveByFiveProps> = ({
    setGameMode,
    theme,
    themeReady,
    onRestart,
    humanName,
    onRoomReady,
    onBeforeFriendOpen,
    hideResultPopup = false,
}) => {
    const t = useT();
    // Модифікатор фіксується на всю партію: його зміна перемонтовує компонент (key у TicTacToe).
    const modifier = effectiveModifier("five", useModifierChoice());
    const stones = modifier === "stones" ? STONES_COUNT : 0;
    const [board, setBoard] = useState<Grid3>(() => createBoard(SIZE, stones));
    const [hist, setHist] = useState<ModHistory>(EMPTY_HISTORY);
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

    // --- партія з модифікатором правил (гравітація, каміння, мізер): хід через modEngine ---
    const rules = { gravity: modifier === "gravity", misere: modifier === "misere" };
    const ruleMode = rules.gravity || rules.misere || modifier === "stones";
    const markers = { player: playerMarker, ai: aiMarker };

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

    const handleRuleClick = (row: number, col: number) => {
        const turn = playTurn(board, hist, rules, WIN_LENGTH, markers, "X", { index: row * SIZE + col });
        if (!turn) return;
        setBoard(turn.grid);
        setHist(turn.hist);
        playSound("move");
        if (turn.outcome) return finishRuleGame(turn);

        setIsAiTurn(true);
        setTimeout(() => {
            const reply = playTurn(turn.grid, turn.hist, rules, WIN_LENGTH, markers, "O", { difficulty: getDifficulty() });
            setIsAiTurn(false);
            if (!reply) return;
            setBoard(reply.grid);
            setHist(reply.hist);
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
        }
    );

    const restartGame = () => {
        setBoard(createBoard(SIZE, stones));
        setHist(EMPTY_HISTORY);
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
            <ScoreName>{t("ai")}</ScoreName>
            <ScoreValue>{score.ai}</ScoreValue>
            <ScoreDivider>—</ScoreDivider>
            <ScoreValue>{score.human}</ScoreValue>
            <ScoreName>{humanName ?? t("player")}</ScoreName>
        </ScoreBoard>
    );

    const winningCells = winner ? winningIndexSet(board, WIN_LENGTH) : undefined;

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {winner && showResultPopup && !hideResultPopup && (
                <>
                    <ResultOverlay onClick={() => setShowResultPopup(false)} />
                    <Popup $result={winner === "X" ? "win" : "lose"} onClick={() => setShowResultPopup(false)}>
                        {winner === "X" ? t("resultWin") : t("resultLose")}
                    </Popup>
                </>
            )}

            {isNoWinner && !winner && showResultPopup && !hideResultPopup && (
                <>
                    <ResultOverlay onClick={() => setShowResultPopup(false)} />
                    <Popup $result="draw" onClick={(e) => { e.stopPropagation(); setShowResultPopup(false); }}>
                        {t("resultDraw")}
                    </Popup>
                </>
            )}

            <GameLayout>
                <BoardColumn>
                    {scoreBoard}
                    <DifficultyPicker mode="five" />
                    {modifier === "timer" && !isGameOver && <MoveTimerBar fraction={timerLeft} />}
                    <OnlineBoardContainer $size={SIZE} $backgroundUrl={theme.backgroundUrl} $maxWidth={480}>
                        {board.flat().map((cell, index) => {
                            const row = Math.floor(index / SIZE);
                            const col = index % SIZE;
                            return (
                                <OnlineCell
                                    key={index}
                                    $disabled={!themeReady || isGameOver || isAiTurn || (cell !== null && !rules.gravity)}
                                    onClick={() => handleCellClick(row, col)}
                                >
                                    {cell === STONE ? (
                                        <StoneTile role="img" aria-label={t("modifier_stones")} />
                                    ) : (
                                        cell && <GamePiece src={cell} winning={winningCells?.has(index)} />
                                    )}
                                </OnlineCell>
                            );
                        })}
                    </OnlineBoardContainer>
                </BoardColumn>

                <ButtonContainer>
                    <Button onClick={restartGame} aria-label={t("restart")}>
                        <IconRestart size={30} />
                    </Button>
                    <ButtonWithTooltip>
                        <Button
                            onClick={() => {
                                trackEvent("select_mode", { mode: "easy" });
                                setGameMode("traditional");
                            }}
                            aria-label={t("modeClassic")}
                        >
                            <IconMode3 size={42} />
                        </Button>
                        <Tooltip>3×3</Tooltip>
                    </ButtonWithTooltip>
                    <ButtonWithTooltip>
                        <Button
                            onClick={() => {
                                trackEvent("select_mode", { mode: "five" });
                                setGameMode("five");
                            }}
                            aria-label={t("modeFive")}
                        >
                            <IconMode5 size={42} />
                        </Button>
                        <Tooltip>5×5</Tooltip>
                    </ButtonWithTooltip>
                    <ButtonWithTooltip>
                        <Button
                            onClick={() => {
                                trackEvent("select_mode", { mode: "hard" });
                                setGameMode("difficult");
                            }}
                            aria-label={t("modeHard")}
                        >
                            <IconModeUltimate size={42} />
                        </Button>
                        <Tooltip>{t("tooltipHard")}</Tooltip>
                    </ButtonWithTooltip>
                    <ButtonWithTooltip>
                        <Button onClick={handleFriendClick} aria-label={t("playWithFriend")}>
                            <IconFriends size={44} />
                        </Button>
                        <Tooltip>{t("tooltipFriend")}</Tooltip>
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
