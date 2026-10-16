"use client";
import React, { useEffect, useRef, useState, useMemo } from "react";

import { Board } from "./board";
import { ResultPopup, useRoundSummary } from "@game/components/ResultPopup";
import { GameLoader } from "@game/components/GameLoader";
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
import { CLASSIC_THEME, Theme, getActiveThemes, preloadThemeImages } from "@game/lib/themes";
import { getEquippedSkinId, useWallet } from "@game/lib/wallet";
import { ShopPage } from "@game/components/SkinShop";
import { CampaignPage, CampaignResults } from "@game/components/CampaignMap";
import { HomeScreen } from "@game/components/HomeScreen";
import { AwardsPage, ProfilePage, ProfilePanels } from "@game/components/ProfilePanels";
import { TopBar } from "@game/components/TopBar";
import { AppColumn, ShellVars } from "@game/components/pageStyles";
import { BottomNav, NavItem } from "@game/components/BottomNav";
import { GameScreen, RewardedAdContext } from "@game/components/GameScreen";
import { MatchInvite } from "@game/components/MatchInvite";
import { Tutorial, isTutorialDone } from "@game/components/Tutorial";
import { setPresence, startPresence } from "@game/lib/presence";
import { setPlayerFallbackName, startPlayerTracking } from "@game/lib/players";
import { endDailyRun } from "@game/lib/daily";
import { getProfile, useProfile } from "@game/lib/profile";
import { closePanel, setScreenState, useOpenPanel, scrollGameTo } from "@game/lib/ui";
import { getActiveNames, pickRandomName } from "@game/lib/names";
import { logGameResult } from "@game/lib/gameLog";
import { useT } from "@game/lib/i18n";
import { Difficulty, getDifficulty, hasStoredDifficulty, setDifficulty, shouldBlunder, useDifficulty } from "@game/lib/difficulty";
import { DailyChallenge } from "@game/components/DailyChallenge";
import { EMPTY_HISTORY, ModHistory, TurnResult, fadingCells, playTurn, randomLegalCell } from "@game/components/modEngine";
import { TIMER_SECONDS, effectiveModifier, useModifierChoice } from "@game/lib/modifiers";
import { useMoveTimer } from "@game/components/MoveTimer";
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

// Розділи меню - окремі екрани (як у прототипі); "game" - саме поле.
type Screen = "home" | "game" | Exclude<NavItem, "home">;
const PAGES: Screen[] = ["campaign", "shop", "awards", "profile"];

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
    // Rewarded-реклама агрегатора - примірка скіна на 24 год, бустери після безкоштовної спроби,
    // подвоєння монет.
    onRewardedAd?: () => Promise<boolean>;
};

type Snapshot = { board: Grid3; hist: ModHistory };

export const TicTacToe = ({ onRoomReady, onBeforeFriendOpen, onReady, getShareLink, onRewardedAd }: TicTacToeProps) => {
    const t = useT();
    const [board, setBoard] = useState<Grid3>(createEmptyGrid());
    const [winner, setWinner] = useState<string | null>(null);
    const [isNoWinner, setIsNoWinner] = useState<boolean>(false);
    const [isAiTurn, setIsAiTurn] = useState<boolean>(false);
    const [showResultPopup, setShowResultPopup] = useState<boolean>(false);
    const [gameMode, setGameMode] = useState<"traditional" | "difficult" | "five">("traditional");
    const [themeReady, setThemeReady] = useState(false);
    const [availableThemes, setAvailableThemes] = useState<Theme[]>([]);
    // Тема партії = обраний у магазині скін (вбудована "Класика" або тема з адмінки).
    const equippedSkinId = getEquippedSkinId(useWallet());
    const theme: Theme = availableThemes.find((item) => item.id === equippedSkinId) ?? CLASSIC_THEME;
    const [humanName, setHumanName] = useState<string | null>(null);
    const [score, setScore] = useState({ ai: 0, human: 0 });
    // Бустери 3×3: позиції перед ходами гравця (для "Скасувати хід") і клітинка-підказка.
    const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
    const [hintCell, setHintCell] = useState<number | null>(null);
    // Номер партії 3×3 - нова партія знову дає безкоштовні бустери.
    const [round, setRound] = useState(0);
    // Гра відкривається на головному меню; "game" - саме поле, решта - розділи нижнього меню.
    const [screen, setScreen] = useState<Screen>("home");
    // Вогник серії в шапці - прокрутити головну до картки виклику дня.
    const [focusDaily, setFocusDaily] = useState(0);
    const topRef = useRef<HTMLDivElement>(null);
    const profile = useProfile();
    const profileName = profile.name;
    // Новачок (ще жодної партії) - одразу на полі "Класика 3×3", а не в меню: так не треба
    // шукати, як почати гру. Меню - логотип у шапці.
    const isNewPlayer = profile.stats.games === 0;
    // Перша партія новачка - на рівні "Легкий" (якщо він ще сам не обирав рівень),
    // щоб перша гра частіше закінчувалась перемогою.
    useEffect(() => {
        if (getProfile().stats.games !== 0) return;
        setScreen("game");
        if (!hasStoredDifficulty()) setDifficulty("easy");
    }, []);
    const shownName = profileName ?? humanName;

    // Облік часу гри на порталі: геймплей - лише на полі, меню й розділи - пауза (App слухає ці події).
    const onGameScreen = screen === "game";
    // Туторіал новачка - на першій партії, поки його не закрили (далі не показується).
    const [tutorialOpen, setTutorialOpen] = useState(false);
    useEffect(() => {
        if (onGameScreen && themeReady && isNewPlayer && !isTutorialDone()) setTutorialOpen(true);
    }, [onGameScreen, themeReady, isNewPlayer]);

    // Присутність: хто зараз у грі й чи в партії (лічильник "онлайн" і запрошення в меню).
    useEffect(() => {
        void startPresence();
        startPlayerTracking();
    }, []);
    // Ім'я для картки гравця в адмінці, якщо свого немає, - наше випадкове.
    useEffect(() => setPlayerFallbackName(shownName), [shownName]);
    useEffect(() => {
        setPresence({ screen: onGameScreen ? "game" : "menu", name: shownName ?? "" });
    }, [onGameScreen, shownName]);

    useEffect(() => {
        setScreenState(onGameScreen ? "game" : "home");
        trackEvent(onGameScreen ? "open_game" : "open_menu");
    }, [onGameScreen]);

    // Новий екран - з початку сторінки.
    useEffect(() => {
        scrollGameTo(topRef.current);
    }, [screen]);

    // Кнопки, що відкривають розділи (зірки й монети в шапці, "До карти" тощо), кличуть
    // openPanel - розділи тут окремі екрани, тож панель перемикає екран.
    const panel = useOpenPanel();
    useEffect(() => {
        if (!panel || !PAGES.includes(panel as Screen)) return;
        closePanel();
        endDailyRun();
        setScreen(panel as Screen);
    }, [panel]);

    const [hist, setHist] = useState<ModHistory>(EMPTY_HISTORY);
    const difficulty = useDifficulty();
    const modifierChoice = useModifierChoice();
    const modifier3 = effectiveModifier("traditional", modifierChoice);
    const dailyRun = useDailyRun();
    // Старт і кінець виклику дня - завжди чиста дошка (у т.ч. для 5×5/Ultimate через key),
    // навіть якщо рівень бота виклику збігається з обраним гравцем. Завершення партії
    // виклику (finished) дошку НЕ скидає - щоб було видно фінальну позицію.
    const [runKey, setRunKey] = useState(0);
    const dailyActive = dailyRun !== null;
    const runId = dailyRun?.id ?? 0;

    // Нова партія 3×3: чиста (або задана) дошка, без бустерів і результату.
    const resetRound = (grid: Grid3 = createEmptyGrid()) => {
        setBoard(grid);
        setHist(EMPTY_HISTORY);
        setWinner(null);
        setIsNoWinner(false);
        setIsAiTurn(false);
        setShowResultPopup(false);
        setUndoStack([]);
        setHintCell(null);
        setRound((r) => r + 1);
    };

    // Новий рівень бота - нова партія і новий рахунок (рахунок "проти Майстра" не
    // змішується з рахунком проти легкого бота). 5×5/Ultimate скидаються через key нижче.
    const prevDifficulty = useRef(difficulty);
    useEffect(() => {
        if (prevDifficulty.current === difficulty) return;
        prevDifficulty.current = difficulty;
        resetRound();
        setScore({ ai: 0, human: 0 });
    }, [difficulty]);

    // Новий модифікатор або скін - так само нова партія (5×5/Ultimate - через key нижче).
    // Скін теж: фішки на дошці зберігаються як URL картинок теми, тож старі не "перефарбуються".
    const settingsKey = `${modifierChoice}|${equippedSkinId}`;
    const prevModifier = useRef(settingsKey);
    useEffect(() => {
        if (prevModifier.current === settingsKey) return;
        prevModifier.current = settingsKey;
        resetRound();
        setScore({ ai: 0, human: 0 });
    }, [settingsKey]);

    // Старт виклику/рівня - останнім із ефектів скидання: зміна рівня бота чи модифікатора
    // в тому ж кадрі інакше стерла б стартову позицію головоломки.
    const prevRunId = useRef(runId);
    useEffect(() => {
        if (prevRunId.current === runId) return;
        prevRunId.current = runId;
        // Головоломка кампанії стартує із заданої позиції (лише 3×3).
        const preset = dailyRun?.template.mode === "traditional" ? dailyRun.template.preset : undefined;
        const grid = createEmptyGrid();
        preset?.X.forEach((i) => (grid[Math.floor(i / 3)][i % 3] = theme.xMarkerUrl));
        preset?.O.forEach((i) => (grid[Math.floor(i / 3)][i % 3] = theme.oMarkerUrl));
        resetRound(grid);
        setRunKey((k) => k + 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- скидаємо лише на новий старт
    }, [runId]);

    // Модифікатор "таймер" для 3×3 (5×5 і Ultimate мають власні). Хук - до раннього
    // return нижче; сам випадковий хід підставляється пізніше через ref.
    const timeoutMoveRef = useRef<() => void>(() => {});
    const timerLeft = useMoveTimer(
        gameMode === "traditional" && onGameScreen && modifier3 === "timer" && themeReady && !isAiTurn && winner === null && !isNoWinner,
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
    // До моменту завантаження замість дошки - спінер, кліки ігноруються (themeReady нижче),
    // щоб не вийшло гри з "напівзмішаними" скінами.
    useEffect(() => {
        let cancelled = false;
        getActiveThemes().then(async (themes) => {
            if (cancelled) return;
            // Підвантажуємо картинки всіх тем заздалегідь (не лише обраної) - скін можна
            // змінити в магазині, і на той момент картинки вже мають бути в кеші браузера.
            await preloadThemeImages([CLASSIC_THEME, ...themes]);
            if (cancelled) return;
            setAvailableThemes(themes);
            setThemeReady(true);
            onReady?.();
        });
        return () => {
            cancelled = true;
        };
    }, []);

    // Підсумок партії для вікна результату - до раннього return нижче (порядок хуків незмінний).
    const roundCells = useMemo(() => board.flat(), [board]);
    const roundSummary = useRoundSummary(roundCells, theme.xMarkerUrl);

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

    // Позиція перед ходом гравця - для бустера "Скасувати хід".
    const pushUndo = () => {
        setUndoStack((stack) => [...stack, { board, hist }]);
        setHintCell(null);
    };

    const handleRuleClick = (row: number, col: number) => {
        const turn = playTurn(board, hist, rules3, 3, markers, "X", { index: row * 3 + col });
        if (!turn) return;
        pushUndo();
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

        pushUndo();
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

        // Блокуємо клітинки на час "ходу" бота, щоб гравець не встиг клікнути двічі поспіль.
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

    // Бустер "Скасувати хід": позиція перед останнім ходом гравця (разом із відповіддю бота).
    const undoMove = () => {
        const last = undoStack[undoStack.length - 1];
        if (!last) return;
        setUndoStack((stack) => stack.slice(0, -1));
        setBoard(last.board);
        setHist(last.hist);
        setHintCell(null);
    };

    // Бустер "Підказка": найкращий хід гравця (як порадив би Майстер).
    const showHint = () => {
        if (ruleMode) {
            const turn = playTurn(board, hist, rules3, 3, markers, "X", { difficulty: "master" });
            if (!turn) return;
            const index = turn.grid.flat().findIndex((cell, i) => cell === playerMarker && board.flat()[i] !== playerMarker);
            setHintCell(index >= 0 ? index : null);
            return;
        }
        const cell = pickMasterMove3(board, playerMarker, aiMarker);
        setHintCell(cell ? cell[0] * 3 + cell[1] : null);
    };

    const restartGame = () => {
        resetRound();
        trackEvent("game_restart", { mode: "easy" });
    };

    // 3×3-гілка рендериться прямо тут, у TicTacToe, і при перемиканні режиму не розмонтовується
    // (на відміну від 5×5/Ultimate) - тож дошку скидаємо вручну, інакше при поверненні сюди на
    // ній лишились би фішки старої партії.
    const handleSetGameMode = (mode: "traditional" | "difficult" | "five") => {
        resetRound();
        setGameMode(mode);
    };

    const goToGame = (mode: "traditional" | "difficult" | "five") => {
        handleSetGameMode(mode);
        setScreen("game");
    };

    const goToMenu = () => {
        endDailyRun();
        setScreen("home");
    };

    const navigate = (item: NavItem) => {
        if (item === "home") {
            if (screen === "home") scrollGameTo(topRef.current, { smooth: true });
            else goToMenu();
            return;
        }
        setScreen(item);
    };

    const openDaily = () => {
        goToMenu();
        setFocusDaily((n) => n + 1);
    };

    let content: React.ReactNode;
    if (!themeReady) {
        // Поки тема не підвантажилась - тематичний лоадер замість дошки з тимчасовим скіном.
        content = <GameLoader />;
    } else if (screen === "home") {
        content = (
            <HomeScreen
                name={shownName}
                initialMode={gameMode}
                onPlay={goToGame}
                onRoomReady={onRoomReady}
                onBeforeFriendOpen={onBeforeFriendOpen}
                focusDaily={focusDaily}
            />
        );
    } else if (screen === "campaign") {
        content = <CampaignPage onStart={goToGame} />;
    } else if (screen === "shop") {
        content = <ShopPage themes={availableThemes} onRewardedAd={onRewardedAd} onPlay={() => goToGame(gameMode)} />;
    } else if (screen === "awards") {
        content = <AwardsPage />;
    } else if (screen === "profile") {
        content = <ProfilePage fallbackName={humanName} />;
    } else if (gameMode === "difficult") {
        content = (
            <DifficultTicTacToe
                key={`${difficulty}:${modifierChoice}:${equippedSkinId}:${runKey}`}
                hideResultPopup={dailyActive}
                setGameMode={handleSetGameMode}
                theme={theme}
                themeReady={themeReady}
                humanName={shownName}
                onRoomReady={onRoomReady}
                onBeforeFriendOpen={onBeforeFriendOpen}
                onMenu={goToMenu}
            />
        );
    } else if (gameMode === "five") {
        content = (
            <FiveByFiveTicTacToe
                key={`${difficulty}:${modifierChoice}:${equippedSkinId}:${runKey}`}
                hideResultPopup={dailyActive}
                setGameMode={handleSetGameMode}
                theme={theme}
                themeReady={themeReady}
                humanName={shownName}
                onRoomReady={onRoomReady}
                onBeforeFriendOpen={onBeforeFriendOpen}
                onMenu={goToMenu}
            />
        );
    } else {
        const statusText = isGameOver
            ? winner === "X" ? t("resultWin") : winner ? t("resultLose") : t("resultDraw")
            : isAiTurn ? t("aiThinking") : t("yourTurn");
        const playerTurn = !isGameOver && !isAiTurn;
        content = (
            <>
                {/* Вікно результату. Закриття лише ховає його - дошка лишається заблокованою до рестарту. */}
                {(winner || isNoWinner) && showResultPopup && !dailyActive && (
                    <ResultPopup
                        result={winner === "X" ? "win" : winner ? "lose" : "draw"}
                        summary={roundSummary}
                        onClose={() => setShowResultPopup(false)}
                        onRestart={restartGame}
                        onMenu={goToMenu}
                    />
                )}
                <GameScreen
                    mode="traditional"
                    onSetMode={handleSetGameMode}
                    onRestart={restartGame}
                    onRoomReady={onRoomReady}
                    onBeforeFriendOpen={onBeforeFriendOpen}
                    score={score}
                    humanName={shownName}
                    status={statusText}
                    firstHint={isNewPlayer && !isGameOver && board.every((row) => row.every((cell) => cell === null))}
                    over={isGameOver}
                    timer={modifier3 === "timer" ? timerLeft : null}
                    onShowResult={() => setShowResultPopup(true)}
                    boosters={{
                        canUndo: playerTurn && undoStack.length > 0,
                        canHint: playerTurn,
                        onUndo: undoMove,
                        onHint: showHint,
                        resetKey: round,
                    }}
                    board={
                        <Board
                            board={board}
                            handleClick={handleOnClick}
                            backgroundUrl={theme.backgroundUrl}
                            winningCells={winner ? winningIndexSet(board, 3) : undefined}
                            fadingCells={isGameOver ? undefined : fadingCells(hist, rules3)}
                            hintCell={hintCell}
                        />
                    }
                />
            </>
        );
    }

    return (
        <RewardedAdContext.Provider value={onRewardedAd}>
            <ShellVars />
            <AppColumn ref={topRef}>
                <TopBar onHome={() => navigate("home")} onDaily={openDaily} />
                {content}
            </AppColumn>
            {/* На екрані партії нижнього меню немає: вихід у меню - логотип у шапці. */}
            {screen !== "game" && <BottomNav current={screen} onNavigate={navigate} />}
            <DailyChallenge onStart={goToGame} getShareLink={getShareLink} onMenu={goToMenu} />
            <CampaignResults onStart={goToGame} onMenu={goToMenu} />
            <ProfilePanels />
            <MatchInvite hidden={onGameScreen} />
            {tutorialOpen && onGameScreen && <Tutorial onDone={() => setTutorialOpen(false)} />}
        </RewardedAdContext.Provider>
    );
};
