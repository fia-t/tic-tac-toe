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
    UltimateBoardContainer,
    MiniBoardWrapper,
    MiniCell,
    MiniBoardDimOverlay,
    MiniBoardResultOverlay,
    MiniBoardDrawLabel,
    ScoreBoard,
    ScoreName,
    ScoreValue,
    ScoreDivider,
} from "@/app/components/gameStyles";
import { FriendGameModal } from "@/app/components/FriendGameModal";
import { GamePiece } from "@/app/components/GamePiece";
import { trackEvent } from "@/app/lib/firebase";
import { Theme } from "@/app/lib/themes";
import { logGameResult } from "@/app/lib/gameLog";
import {
    Grid3,
    createEmptyGrid,
    getGridWinner,
    isGridFull,
    findWinningCell,
    pickHeuristicCell,
} from "@/app/components/gameLogic";

// Результат кожного з 9 малих полів: хто його забрав, чи нічия, чи гра в ньому ще триває.
type MetaResult = "X" | "O" | "draw" | null;

type DifficultProps = {
    setGameMode: (mode: "traditional" | "difficult") => void;
    theme: Theme;
    themeReady: boolean;
    onRestart: () => void;
    humanName: string | null;
};

// Перетворює 9 результатів малих полів у "велику" сітку 3x3,
// щоб перевіряти перемогу на великому полі тими самими функціями, що й на малому.
const toMetaGrid = (results: MetaResult[], playerMarker: string, aiMarker: string): Grid3 => {
    const grid = createEmptyGrid();
    results.forEach((result, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;
        grid[row][col] = result === "X" ? playerMarker : result === "O" ? aiMarker : null;
    });
    return grid;
};

// Порядок переваги при виборі малого поля, коли гравець може ходити куди завгодно:
// центральне поле найсильніше, потім кути, потім краї.
const boardOrderPreference = [4, 0, 2, 6, 8, 1, 3, 5, 7];

const pickAiMove = (
    boards: Grid3[],
    miniResults: MetaResult[],
    activeBoard: number | null,
    playerMarker: string,
    aiMarker: string
): [number, number, number] | null => {
    const candidateBoards =
        activeBoard !== null
            ? [activeBoard]
            : miniResults.reduce<number[]>((acc, result, index) => {
                  if (result === null) acc.push(index);
                  return acc;
              }, []);

    if (candidateBoards.length === 0) return null;

    // 1. Хід, який одразу вирішує всю гру на користь ШІ
    for (const boardIndex of candidateBoards) {
        const cell = findWinningCell(boards[boardIndex], aiMarker);
        if (!cell) continue;
        const hypothetical = miniResults.map((result, index): MetaResult => (index === boardIndex ? "O" : result));
        if (getGridWinner(toMetaGrid(hypothetical, playerMarker, aiMarker)) === aiMarker) {
            return [boardIndex, cell[0], cell[1]];
        }
    }

    // 2. Виграти будь-яке мале поле
    for (const boardIndex of candidateBoards) {
        const cell = findWinningCell(boards[boardIndex], aiMarker);
        if (cell) return [boardIndex, cell[0], cell[1]];
    }

    // 3. Заблокувати перемогу гравця в малому полі
    for (const boardIndex of candidateBoards) {
        const cell = findWinningCell(boards[boardIndex], playerMarker);
        if (cell) return [boardIndex, cell[0], cell[1]];
    }

    // 4. Заблокувати перемогу гравця на великому полі (у гравця 2 поля в лінії з 3)
    const metaThreat = findWinningCell(toMetaGrid(miniResults, playerMarker, aiMarker), playerMarker);
    if (metaThreat) {
        const threatIndex = metaThreat[0] * 3 + metaThreat[1];
        if (candidateBoards.includes(threatIndex)) {
            const cell = pickHeuristicCell(boards[threatIndex]);
            if (cell) return [threatIndex, cell[0], cell[1]];
        }
    }

    // 5. Позиційний вибір: центральне поле, потім кутові, потім будь-яке доступне
    const orderedCandidates = boardOrderPreference.filter((index) => candidateBoards.includes(index));
    for (const boardIndex of orderedCandidates) {
        const cell = pickHeuristicCell(boards[boardIndex]);
        if (cell) return [boardIndex, cell[0], cell[1]];
    }

    return null;
};

export const DifficultTicTacToe: React.FC<DifficultProps> = ({ setGameMode, theme, themeReady, onRestart, humanName }) => {
    const [boards, setBoards] = useState<Grid3[]>(() => Array.from({ length: 9 }, createEmptyGrid));
    const [miniResults, setMiniResults] = useState<MetaResult[]>(() => Array(9).fill(null));
    const [activeBoard, setActiveBoard] = useState<number | null>(null);
    const [currentTurn, setCurrentTurn] = useState<"player" | "ai">("player");
    const [winner, setWinner] = useState<"X" | "O" | null>(null);
    const [isDraw, setIsDraw] = useState<boolean>(false);
    const [showResultPopup, setShowResultPopup] = useState<boolean>(false);
    const [isFriendModalOpen, setIsFriendModalOpen] = useState<boolean>(false);
    const [score, setScore] = useState({ ai: 0, human: 0 });

    const playerMarker = theme.xMarkerUrl;
    const aiMarker = theme.oMarkerUrl;

    const isGameOver = winner !== null || isDraw;

    // Спільна логіка завершення ходу - викликається і для ходу гравця, і для ходу ШІ,
    // щоб не дублювати перевірку перемоги/нічиєї та визначення наступного активного поля.
    const finishMove = (
        boardsAfterMove: Grid3[],
        miniResultsBeforeMove: MetaResult[],
        boardIndex: number,
        row: number,
        col: number,
        mover: "player" | "ai"
    ) => {
        const miniGrid = boardsAfterMove[boardIndex];
        const miniWinnerMarker = getGridWinner(miniGrid);

        let miniResult: MetaResult = miniResultsBeforeMove[boardIndex];
        if (miniWinnerMarker === playerMarker) miniResult = "X";
        else if (miniWinnerMarker === aiMarker) miniResult = "O";
        else if (isGridFull(miniGrid)) miniResult = "draw";

        const updatedMiniResults = miniResultsBeforeMove.map((result, index) =>
            index === boardIndex ? miniResult : result
        );

        const metaWinnerMarker = getGridWinner(toMetaGrid(updatedMiniResults, playerMarker, aiMarker));
        const metaWinner: "X" | "O" | null =
            metaWinnerMarker === playerMarker ? "X" : metaWinnerMarker === aiMarker ? "O" : null;
        const metaDraw = !metaWinner && updatedMiniResults.every((result) => result !== null);

        // Наступний хід має бути в полі з таким же індексом, як клітинка щойного ходу.
        // Якщо те поле вже вирішене (виграно/нічия) - суперник обирає будь-яке відкрите поле.
        const targetIndex = row * 3 + col;
        const nextActiveBoard = updatedMiniResults[targetIndex] !== null ? null : targetIndex;

        setBoards(boardsAfterMove);
        setMiniResults(updatedMiniResults);

        if (metaWinner) {
            setWinner(metaWinner);
            setShowResultPopup(true);
            const result = metaWinner === "X" ? "win" : "lose";
            trackEvent("game_finished", { mode: "hard", result });
            setScore((s) => (result === "win" ? { ...s, human: s.human + 1 } : { ...s, ai: s.ai + 1 }));
            logGameResult("ai-hard", result);
            return;
        }

        if (metaDraw) {
            setIsDraw(true);
            setShowResultPopup(true);
            trackEvent("game_finished", { mode: "hard", result: "draw" });
            logGameResult("ai-hard", "draw");
            return;
        }

        setActiveBoard(nextActiveBoard);

        if (mover === "player") {
            setCurrentTurn("ai");
            setTimeout(() => {
                const aiMove = pickAiMove(boardsAfterMove, updatedMiniResults, nextActiveBoard, playerMarker, aiMarker);
                if (!aiMove) return;
                const [aiBoardIndex, aiRow, aiCol] = aiMove;

                const boardsAfterAiMove = boardsAfterMove.map((mini, index) =>
                    index === aiBoardIndex
                        ? mini.map((r, ri) => r.map((cell, ci) => (ri === aiRow && ci === aiCol ? aiMarker : cell)))
                        : mini
                );

                finishMove(boardsAfterAiMove, updatedMiniResults, aiBoardIndex, aiRow, aiCol, "ai");
            }, 500);
        } else {
            setCurrentTurn("player");
        }
    };

    const handleCellClick = (boardIndex: number, row: number, col: number) => {
        if (!themeReady || isGameOver || currentTurn !== "player") return;
        if (miniResults[boardIndex] !== null) return;
        if (activeBoard !== null && activeBoard !== boardIndex) return;
        if (boards[boardIndex][row][col] !== null) return;

        const updatedBoards = boards.map((mini, index) =>
            index === boardIndex
                ? mini.map((r, ri) => r.map((cell, ci) => (ri === row && ci === col ? playerMarker : cell)))
                : mini
        );

        finishMove(updatedBoards, miniResults, boardIndex, row, col, "player");
    };

    const restartUltimateGame = () => {
        setBoards(Array.from({ length: 9 }, createEmptyGrid));
        setMiniResults(Array(9).fill(null));
        setActiveBoard(null);
        setCurrentTurn("player");
        setWinner(null);
        setIsDraw(false);
        setShowResultPopup(false);
        onRestart();
        trackEvent("game_restart", { mode: "hard" });
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

            {isDraw && !winner && showResultPopup && (
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
                    <UltimateBoardContainer $backgroundUrl={theme.backgroundUrl}>
                    {boards.map((miniGrid, boardIndex) => {
                        const result = miniResults[boardIndex];
                        const isActive =
                            !isGameOver &&
                            currentTurn === "player" &&
                            result === null &&
                            (activeBoard === null || activeBoard === boardIndex);

                        return (
                            <MiniBoardWrapper key={boardIndex} $isActive={isActive}>
                                {miniGrid.flat().map((cell, cellIndex) => {
                                    const row = Math.floor(cellIndex / 3);
                                    const col = cellIndex % 3;
                                    return (
                                        <MiniCell
                                            key={cellIndex}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCellClick(boardIndex, row, col);
                                            }}
                                        >
                                            {cell && <GamePiece src={cell} />}
                                        </MiniCell>
                                    );
                                })}
                                {result && (
                                    <>
                                        <MiniBoardDimOverlay />
                                        <MiniBoardResultOverlay>
                                            {result === "draw" ? (
                                                <MiniBoardDrawLabel>—</MiniBoardDrawLabel>
                                            ) : (
                                                <img
                                                    src={result === "X" ? playerMarker : aiMarker}
                                                    alt={result}
                                                    style={{ width: "55%", height: "55%", objectFit: "contain" }}
                                                />
                                            )}
                                        </MiniBoardResultOverlay>
                                    </>
                                )}
                            </MiniBoardWrapper>
                        );
                    })}
                    </UltimateBoardContainer>
                </BoardColumn>

                <ButtonContainer>
                    <Button onClick={restartUltimateGame} aria-label="Restart">
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
                        <Button
                            onClick={() => {
                                trackEvent("friend_modal_open", { from: "hard" });
                                setIsFriendModalOpen(true);
                            }}
                            aria-label="Play with a friend"
                        >
                            <ControlIcon src="/images/game_with_friends.png" alt="Play with a friend" />
                        </Button>
                        <Tooltip>Friend</Tooltip>
                    </ButtonWithTooltip>
                </ButtonContainer>

                {isFriendModalOpen && <FriendGameModal onClose={() => setIsFriendModalOpen(false)} />}
            </GameLayout>
        </div>
    );
};

export default DifficultTicTacToe;
