"use client";
import React, { useEffect, useRef, useState } from "react";
import { Board } from "./board";
import { Popup, ResultOverlay, ScoreBoard, ScoreName, ScoreValue, ScoreDivider, ThemeLoadingBox, Spinner } from "@game/components/gameStyles";
import { trackEvent } from "@game/lib/firebase";
import {
    Grid3,
    createEmptyGrid,
    getGridWinner,
    isGridFull,
    findWinningCell,
    pickHeuristicCell,
    countMarker,
    encodeGrid,
    winningIndexSet,
} from "@game/components/gameLogic";
import { DifficultTicTacToe } from "@game/components/DifficultTicTacToe";
import { FiveByFiveTicTacToe } from "@game/components/FiveByFiveTicTacToe";
import { DEFAULT_THEME, Theme, getActiveThemes, pickRandomTheme, preloadThemeImages } from "@game/lib/themes";
import { getActiveNames, pickRandomName } from "@game/lib/names";
import { logGameResult } from "@game/lib/gameLog";
import { useT } from "@game/lib/i18n";
import { Difficulty, getDifficulty, shouldBlunder, useDifficulty } from "@game/lib/difficulty";
import { DifficultyPicker } from "@game/components/DifficultyPicker";
import { DailyChallenge } from "@game/components/DailyChallenge";
import { EMPTY_HISTORY, ModHistory, TurnResult, fadingCells, playTurn, randomLegalCell } from "@game/components/modEngine";
import { TIMER_SECONDS, effectiveModifier, useModifierChoice } from "@game/lib/modifiers";
import { MoveTimerBar, useMoveTimer } from "@game/components/MoveTimer";
import { useDailyRun } from "@game/lib/daily";
import { pickMasterMove3, randomFreeCell } from "@game/components/aiLevels";
import { playSound } from "@game/lib/sound";

const makeComputerMove = (board: Grid3, playerMarker: string, aiMarker: string, difficulty: Difficulty): [number, number] => {
    // Легкий: інколи просто випадковий хід. Майстер: мінімакс (непереможний).
    if (shouldBlunder(difficulty)) {
        const randomCell = randomFreeCell(board);
        if (randomCell) return randomCell;
    }
    if (difficulty === "master") return pickMasterMove3(board, aiMarker, playerMarker) ?? [-1, -1];

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

type TicTacToeProps = {
    // Куди перейти після створення/приєднання до онлайн-кімнати "Гра з другом" - на сайті
    // це router.push(`/play/${roomId}`), у standalone-білді для агрегаторів - локальний стан.
    // Немає next/navigation усередині цього дерева компонентів саме тому, що це рішення
    // приймає викликач (TicTacToeEntry на сайті, App.tsx у Vite-білді), а не сам компонент.
    onRoomReady: (roomId: string) => void;
    // Якщо передано - викликається перед відкриттям "Гра з другом"; модалка відкривається
    // лише коли проміс резолвиться true. Використовується для rewarded-ad гейта на
    // агрегаторах - на сайті не передається, і поведінка лишається безкоштовною як раніше.
    onBeforeFriendOpen?: () => Promise<boolean>;
    // Викликається, коли теми й картинки підвантажені і дошка стає клікабельною
    // (сигнал loadingStop для SDK агрегатора/порталу).
    onReady?: () => void;
    // Посилання для шерингу результату виклику дня (портал: game.shareLink() SDK).
    getShareLink?: () => Promise<string | null>;
};

export const TicTacToe = ({ onRoomReady, onBeforeFriendOpen, onReady, getShareLink }: TicTacToeProps) => {
    const t = useT();
    const [board, setBoard] = useState<Grid3>(createEmptyGrid());
    const [winner, setWinner] = useState<string | null>(null);
    const [isNoWinner, setIsNoWinner] = useState<boolean>(false);
    const [isAiTurn, setIsAiTurn] = useState<boolean>(false);
    const [showResultPopup, setShowResultPopup] = useState<boolean>(false);
    const [gameMode, setGameMode] = useState<"traditional" | "difficult" | "five">("traditional");
    const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
    const [themeReady, setThemeReady] = useState(false);
    const [availableThemes, setAvailableThemes] = useState<Theme[]>([]);
    const [humanName, setHumanName] = useState<string | null>(null);
    const [score, setScore] = useState({ ai: 0, human: 0 });
    const [hist, setHist] = useState<ModHistory>(EMPTY_HISTORY);
    const difficulty = useDifficulty();
    const modifierChoice = useModifierChoice();
    const modifier3 = effectiveModifier("traditional", modifierChoice);
    const dailyRun = useDailyRun();
    // Старт і кінець виклику дня - завжди чиста дошка (у т.ч. для 5×5/Ultimate через key),
    // навіть якщо рівень ШІ виклику збігається з обраним гравцем. Завершення партії
    // виклику (finished) дошку НЕ скидає - щоб було видно фінальну позицію.
    const [runKey, setRunKey] = useState(0);
    const dailyActive = dailyRun !== null;
    const prevDailyActive = useRef(dailyActive);
    useEffect(() => {
        if (prevDailyActive.current === dailyActive) return;
        prevDailyActive.current = dailyActive;
        setBoard(createEmptyGrid());
        setHist(EMPTY_HISTORY);
        setWinner(null);
        setIsNoWinner(false);
        setIsAiTurn(false);
        setShowResultPopup(false);
        setRunKey((k) => k + 1);
    }, [dailyActive]);

    // Новий рівень ШІ - нова партія і новий рахунок (рахунок "проти Майстра" не
    // змішується з рахунком проти легкого ШІ). 5×5/Ultimate скидаються через key нижче.
    const prevDifficulty = useRef(difficulty);
    useEffect(() => {
        if (prevDifficulty.current === difficulty) return;
        prevDifficulty.current = difficulty;
        setBoard(createEmptyGrid());
        setHist(EMPTY_HISTORY);
        setWinner(null);
        setIsNoWinner(false);
        setIsAiTurn(false);
        setShowResultPopup(false);
        setScore({ ai: 0, human: 0 });
    }, [difficulty]);

    // Новий модифікатор - так само нова партія (5×5/Ultimate - через key нижче).
    const prevModifier = useRef(modifierChoice);
    useEffect(() => {
        if (prevModifier.current === modifierChoice) return;
        prevModifier.current = modifierChoice;
        setBoard(createEmptyGrid());
        setHist(EMPTY_HISTORY);
        setWinner(null);
        setIsNoWinner(false);
        setIsAiTurn(false);
        setShowResultPopup(false);
        setScore({ ai: 0, human: 0 });
    }, [modifierChoice]);

    // Модифікатор "таймер" для 3×3 (5×5 і Ultimate мають власні). Хук - до раннього
    // return нижче; сам випадковий хід підставляється пізніше через ref.
    const timeoutMoveRef = useRef<() => void>(() => {});
    const timerLeft = useMoveTimer(
        gameMode === "traditional" && modifier3 === "timer" && themeReady && !isAiTurn && winner === null && !isNoWinner,
        board,
        TIMER_SECONDS,
        () => timeoutMoveRef.current()
    );

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
        getActiveThemes().then(async (themes) => {
            if (cancelled) return;
            // Підвантажуємо картинки всіх тем заздалегідь (не лише обраної) -
            // рестарт (pickNewTheme) може вибрати будь-яку з них, і на той момент
            // вона вже має бути в кеші браузера.
            await preloadThemeImages(themes.length > 0 ? themes : [DEFAULT_THEME]);
            if (cancelled) return;
            setAvailableThemes(themes);
            setTheme(pickRandomTheme(themes));
            setThemeReady(true);
            onReady?.();
        });
        return () => {
            cancelled = true;
        };
    }, []);

    // Поки тема ще не підвантажилась з Firestore, замість дошки з фейковим
    // DEFAULT_THEME (фон/фішки, які за секунду підміняться на реальні) -
    // показуємо нейтральний спінер. Це стосується всіх трьох режимів, бо
    // gameMode завжди стартує з "traditional" ще до першого рендеру теми.
    if (!themeReady) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <ThemeLoadingBox>
                    <Spinner />
                </ThemeLoadingBox>
            </div>
        );
    }

    // Виключаємо поточну тему з вибірки, щоб рестарт ніколи не показував
    // ту саму тему двічі поспіль (коли активних тем 2+).
    const pickNewTheme = () => setTheme((current) => pickRandomTheme(availableThemes, current.id));

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

    // --- партія з модифікатором правил (зникаючі фішки, мізер): хід через modEngine ---
    const rules3 = { vanish: modifier3 === "vanish", misere: modifier3 === "misere" };
    const ruleMode = rules3.vanish || rules3.misere;
    const markers = { player: playerMarker, ai: aiMarker };

    const finishRuleGame = (turn: TurnResult) => {
        const outcome = turn.outcome?.winner ?? "draw";
        const result = outcome === "draw" ? "draw" : outcome === "X" ? "win" : "lose";
        if (outcome === "draw") setIsNoWinner(true);
        else setWinner(outcome);
        setShowResultPopup(true);
        trackEvent("game_finished", {
            mode: "easy",
            result,
            modifier: modifier3,
            moves: Math.ceil(turn.hist.moves / 2),
            grid: encodeGrid(turn.grid, playerMarker, aiMarker),
        });
        recordResult(result);
    };

    const handleRuleClick = (row: number, col: number) => {
        const turn = playTurn(board, hist, rules3, 3, markers, "X", { index: row * 3 + col });
        if (!turn) return;
        setBoard(turn.grid);
        setHist(turn.hist);
        playSound("move");
        if (turn.outcome) return finishRuleGame(turn);

        setIsAiTurn(true);
        setTimeout(() => {
            const reply = playTurn(turn.grid, turn.hist, rules3, 3, markers, "O", { difficulty: getDifficulty() });
            setIsAiTurn(false);
            if (!reply) return;
            setBoard(reply.grid);
            setHist(reply.hist);
            playSound("reply");
            if (reply.outcome) finishRuleGame(reply);
        }, 500);
    };

    const handleOnClick = (row: number, col: number) => {
        if (!themeReady || board[row][col] || isGameOver || isAiTurn) return;
        if (ruleMode) {
            handleRuleClick(row, col);
            return;
        }

        const updatedPlayerBoard = board.map((newRow, rowIndex) =>
            newRow.map((cell, cellIndex) =>
                rowIndex === row && cellIndex === col ? playerMarker : cell
            )
        );

        setBoard(updatedPlayerBoard);
        playSound("move");

        const newWinner = checkWinner(updatedPlayerBoard, playerMarker, aiMarker);
        if (newWinner) {
            setWinner(newWinner);
            setShowResultPopup(true);
            const result = newWinner === "X" ? "win" : "lose";
            trackEvent("game_finished", { mode: "easy", result, moves: countMarker(updatedPlayerBoard, playerMarker), grid: encodeGrid(updatedPlayerBoard, playerMarker, aiMarker) });
            recordResult(result);
            return;
        }

        if (isGridFull(updatedPlayerBoard)) {
            setIsNoWinner(true);
            setShowResultPopup(true);
            trackEvent("game_finished", { mode: "easy", result: "draw", moves: countMarker(updatedPlayerBoard, playerMarker), grid: encodeGrid(updatedPlayerBoard, playerMarker, aiMarker) });
            recordResult("draw");
            return;
        }

        // Блокуємо клітинки на час "ходу" ШІ, щоб гравець не встиг клікнути двічі поспіль.
        setIsAiTurn(true);
        setTimeout(() => {
            const [computerRow, computerCol] = makeComputerMove(updatedPlayerBoard, playerMarker, aiMarker, getDifficulty());
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
            playSound("reply");
            setIsAiTurn(false);

            const winnerAfterAI = checkWinner(updatedBoardAfterAI, playerMarker, aiMarker);
            if (winnerAfterAI) {
                setWinner(winnerAfterAI);
                setShowResultPopup(true);
                const result = winnerAfterAI === "X" ? "win" : "lose";
                trackEvent("game_finished", { mode: "easy", result, moves: countMarker(updatedBoardAfterAI, playerMarker), grid: encodeGrid(updatedBoardAfterAI, playerMarker, aiMarker) });
                recordResult(result);
            } else if (isGridFull(updatedBoardAfterAI)) {
                setIsNoWinner(true);
                setShowResultPopup(true);
                trackEvent("game_finished", { mode: "easy", result: "draw", moves: countMarker(updatedBoardAfterAI, playerMarker), grid: encodeGrid(updatedBoardAfterAI, playerMarker, aiMarker) });
                recordResult("draw");
            }
        }, 500);
    };

    // Час вийшов - випадковий дозволений хід за гравця.
    timeoutMoveRef.current = () => {
        const empty = board.flat().flatMap((cell, i) => (cell === null ? [i] : []));
        const index = ruleMode ? randomLegalCell(board, rules3, markers) : empty[Math.floor(Math.random() * empty.length)];
        if (index === null || index === undefined) return;
        handleOnClick(Math.floor(index / 3), index % 3);
    };

    const restartGame = () => {
        setBoard(createEmptyGrid());
        setHist(EMPTY_HISTORY);
        setWinner(null);
        setIsNoWinner(false);
        setIsAiTurn(false);
        setShowResultPopup(false);
        pickNewTheme();
        trackEvent("game_restart", { mode: "easy" });
    };

    // На відміну від DifficultTicTacToe/FiveByFiveTicTacToe (які повністю
    // розмонтовуються при зміні gameMode і тому завжди монтуються заново з
    // чистою дошкою), 3x3-гілка рендериться прямо тут, у TicTacToe - а сам
    // TicTacToe при перемиканні режиму НЕ розмонтовується. Тож board/winner
    // цього режиму лишались би зі старими URL фішок (записаними в клітинки
    // під час ходів), навіть якщо тим часом у іншому режимі був рестарт і
    // pickNewTheme() змінила спільний theme - при поверненні сюди фон був би
    // вже новий, а фішки на дошці - зі старої теми. Тому перед переходом в
    // інший режим скидаємо дошку 3x3 так само, як це відбувається "безкоштовно"
    // для difficult/five через розмонтування.
    const handleSetGameMode = (mode: "traditional" | "difficult" | "five") => {
        setBoard(createEmptyGrid());
        setHist(EMPTY_HISTORY);
        setWinner(null);
        setIsNoWinner(false);
        setIsAiTurn(false);
        setShowResultPopup(false);
        setGameMode(mode);
    };

    const daily = <DailyChallenge onStart={handleSetGameMode} getShareLink={getShareLink} />;

    if (gameMode === "difficult") {
        return (
            <>
            {daily}
            <DifficultTicTacToe
                key={`${difficulty}:${modifierChoice}:${runKey}`}
                hideResultPopup={dailyActive}
                setGameMode={setGameMode}
                theme={theme}
                themeReady={themeReady}
                onRestart={pickNewTheme}
                humanName={humanName}
                onRoomReady={onRoomReady}
                onBeforeFriendOpen={onBeforeFriendOpen}
            />
            </>
        );
    }

    if (gameMode === "five") {
        return (
            <>
            {daily}
            <FiveByFiveTicTacToe
                key={`${difficulty}:${modifierChoice}:${runKey}`}
                hideResultPopup={dailyActive}
                setGameMode={setGameMode}
                theme={theme}
                themeReady={themeReady}
                onRestart={pickNewTheme}
                humanName={humanName}
                onRoomReady={onRoomReady}
                onBeforeFriendOpen={onBeforeFriendOpen}
            />
            </>
        );
    }

    const scoreBoard = (
        <ScoreBoard>
            <ScoreName>{t("ai")}</ScoreName>
            <ScoreValue>{score.ai}</ScoreValue>
            <ScoreDivider>—</ScoreDivider>
            <ScoreValue>{score.human}</ScoreValue>
            <ScoreName>{humanName ?? t("player")}</ScoreName>
        </ScoreBoard>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {daily}
            {/* Попап для перемоги/поразки. Закриття попапу лише ховає його - дошка лишається заблокованою до рестарту. */}
            {winner && showResultPopup && !dailyActive && (
                <>
                    <ResultOverlay onClick={() => setShowResultPopup(false)} />
                    <Popup $result={winner === "X" ? "win" : "lose"} onClick={() => setShowResultPopup(false)}>
                        {winner === "X" ? t("resultWin") : t("resultLose")}
                    </Popup>
                </>
            )}

            {/* Попап для нічиєї */}
            {isNoWinner && !winner && showResultPopup && !dailyActive && (
                <>
                    <ResultOverlay onClick={() => setShowResultPopup(false)} />
                    <Popup $result="draw" onClick={(e) => { e.stopPropagation(); setShowResultPopup(false); }}>
                        {t("resultDraw")}
                    </Popup>
                </>
            )}

            <Board
                board={board}
                handleClick={handleOnClick}
                restartGame={restartGame}
                setGameMode={handleSetGameMode}
                backgroundUrl={theme.backgroundUrl}
                scoreBoard={
                    <>
                        {scoreBoard}
                        <DifficultyPicker mode="traditional" />
                        {modifier3 === "timer" && !isGameOver && <MoveTimerBar fraction={timerLeft} />}
                    </>
                }
                winningCells={winner ? winningIndexSet(board, 3) : undefined}
                fadingCells={isGameOver ? undefined : fadingCells(hist, rules3)}
                onRoomReady={onRoomReady}
                onBeforeFriendOpen={onBeforeFriendOpen}
            />
        </div>
    );
};
