"use client";
import React, { useEffect, useRef, useState } from "react";
import { OnlineBoardContainer, OnlineCell, WaitingText } from "@game/components/onlineStyles";
import { BoardHolder, GameRoot, ResultLink, ScorePill, ScoreTop, TurnLine } from "@game/components/GameScreen";
import { ResultPopup } from "@game/components/ResultPopup";
import { useWallet } from "@game/lib/wallet";
import { useProfile } from "@game/lib/profile";
import { openPanel } from "@game/lib/ui";
import styled from "styled-components";
import { RoomDoc, PlayerSymbol, ROOM_STONE, makeMove, requestRematch, roomGrid, roomRules } from "@game/lib/onlineGame";
import { EMPTY_HISTORY, fadingCells, randomLegalCell } from "@game/components/modEngine";
import { MoveTimerBar, useMoveTimer } from "@game/components/MoveTimer";
import { TIMER_SECONDS } from "@game/lib/modifiers";
import { BOARD_SIZE, WIN_LENGTH } from "@game/components/onlineGameLogic";
import { winningIndexSet } from "@game/components/gameLogic";
import { trackEvent } from "@game/lib/firebase";
import { DEFAULT_THEME } from "@game/lib/themes";
import { GamePiece } from "@game/components/GamePiece";
import { useT } from "@game/lib/i18n";
import { playSound } from "@game/lib/sound";
import { ratedMove, ratedRematch, rememberRating } from "@game/lib/matchmaking";
import { REMATCH_WAIT_MS } from "@game/lib/rating";
import { TurnAlert, formatClock, useRatedTurnClock } from "@game/components/RatedTurnTimer";

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

// Модифікатор кімнати - під рядком рахунку.
const ModLine = styled.div`
    width: var(--board-w);
    color: #7a5530;
    font-size: 13px;
    line-height: 1.35;

    strong {
        color: #49301f;
    }
`;

type OnlineBoardProps = {
    roomId: string;
    room: RoomDoc;
    mySymbol: PlayerSymbol;
    uid: string;
    // Вихід із кімнати в меню (кнопка у вікні результату).
    onExit: () => void;
};

export const OnlineBoard: React.FC<OnlineBoardProps> = ({ roomId, room, mySymbol, uid, onExit }) => {
    const t = useT();
    const size = BOARD_SIZE[room.gameMode];
    const isFinished = room.status === "finished";
    const myTurn = room.status === "playing" && room.currentPlayer === mySymbol;
    // Захист для кімнат, створених до появи тем (theme могло не бути в документі).
    const theme = room.theme ?? DEFAULT_THEME;
    const markerSrc: Record<PlayerSymbol, string> = {
        X: theme.xMarkerUrl,
        O: theme.oMarkerUrl,
    };

    // Захист для кімнат, створених до появи імен/рахунку в документі.
    const names = room.names ?? { X: t("playerX"), O: t("playerO") };
    const score = room.score ?? { X: 0, O: 0 };

    const winningCells =
        room.winner && room.winner !== "draw"
            ? winningIndexSet(
                  Array.from({ length: size }, (_, r) => room.board.slice(r * size, (r + 1) * size)),
                  WIN_LENGTH[room.gameMode]
              )
            : undefined;

    const [moveError, setMoveError] = useState(false);
    // Модифікатор кімнати (як проти бота): правила рушія, зникаючі фішки, гравітація, таймер.
    const rules = roomRules(room.modifier);
    const gravity = Boolean(rules?.gravity);
    const fading = rules && !isFinished ? fadingCells(room.hist ?? EMPTY_HISTORY, rules) : undefined;

    const handleCellClick = (index: number) => {
        // З гравітацією натискання будь-якої клітинки стовпця кидає фішку вниз.
        if (!myTurn || (room.board[index] !== null && !gravity)) return;
        // Рейтинговий матч: хід перевіряє й записує сервер (клієнту rules дошку міняти не дають).
        if (room.rated) {
            setMoveError(false);
            void ratedMove(roomId, index).catch(() => setMoveError(true));
            return;
        }
        void makeMove(roomId, index, mySymbol, uid);
    };

    // Після рейтингової партії - запам'ятати новий рейтинг (для профілю й черги).
    useEffect(() => {
        if (room.rated && isFinished && room.playerIds && room.ratingsAfter) rememberRating(room.playerIds[mySymbol], room.ratingsAfter[mySymbol], true);
    }, [room.rated, isFinished, room.playerIds, room.ratingsAfter, mySymbol]);

    // Рейтинговий матч: час на хід і технічна перемога, якщо хтось не встиг.
    const turnRemaining = useRatedTurnClock(roomId, room);

    // Модифікатор "таймер": на свій хід - TIMER_SECONDS секунд, інакше випадковий дозволений хід.
    const timerLeft = useMoveTimer(room.modifier === "timer" && myTurn && !isFinished, room.board, TIMER_SECONDS, () => {
        const grid = roomGrid(room.board, size);
        const index = rules
            ? randomLegalCell(grid, rules, { player: "X", ai: "O" })
            : (() => {
                  const free = room.board.flatMap((cell, i) => (cell === null ? [i] : []));
                  return free.length ? free[Math.floor(Math.random() * free.length)] : null;
              })();
        if (index !== null) handleCellClick(index);
    });

    const resultLabel =
        room.forfeit && room.winner && room.winner !== "draw"
            ? room.forfeit === mySymbol
                ? t("forfeitLoss")
                : t("forfeitWin")
            : room.winner === "draw"
            ? t("onlineDraw")
            : room.winner === mySymbol
            ? t("onlineWin")
            : room.winner
            ? t("onlineLose")
            : null;

    // Підсумок партії для вікна результату: монети й досвід - різниця зі станом до кінця партії,
    // ходи - скільки фішок поставив цей гравець.
    const wallet = useWallet();
    const profile = useProfile();
    const base = useRef({ coins: wallet.coins, xp: profile.xp });
    if (!isFinished) base.current = { coins: wallet.coins, xp: profile.xp };
    const summary = {
        coins: Math.max(0, wallet.coins - base.current.coins),
        xp: Math.max(0, profile.xp - base.current.xp),
        moves: room.board.filter((cell) => cell === mySymbol).length,
    };

    const opponentSymbol: PlayerSymbol = mySymbol === "X" ? "O" : "X";
    // Реванш: у рейтинговому матчі запит живе REMATCH_WAIT_MS (далі - пропонуємо нового суперника).
    const [now, setNow] = useState(() => Date.now());
    const rematchAt = room.rematchAt?.toMillis?.() ?? null;
    const rematchFresh = !room.rated || (rematchAt !== null && now - rematchAt < REMATCH_WAIT_MS);
    useEffect(() => {
        if (!room.rated || rematchAt === null) return;
        const left = rematchAt + REMATCH_WAIT_MS - Date.now();
        if (left <= 0) return;
        const timer = setTimeout(() => setNow(Date.now()), left + 50);
        return () => clearTimeout(timer);
    }, [room.rated, rematchAt]);
    const myRematchReady = room.rematch[mySymbol] && rematchFresh;
    const opponentRematchReady = room.rematch[opponentSymbol] && rematchFresh;
    // Суперник вийшов із кімнати або не відповів на реванш вчасно.
    const opponentGone = Boolean(room.rated) && (room.leftPlayer === opponentSymbol || (room.rematch[mySymbol] && !rematchFresh));

    // Звук на кожну нову фішку - і свою, і суперника (вона приходить зі снапшоту
    // Firestore). Перший рендер лише запамʼятовує дошку, щоб вхід у кімнату з уже
    // зробленими ходами не відіграв їх усі разом.
    const prevBoardRef = useRef<(string | null)[] | null>(null);
    useEffect(() => {
        const prev = prevBoardRef.current;
        prevBoardRef.current = room.board;
        if (!prev) return;
        const placed = room.board.findIndex((cell, i) => cell !== null && prev[i] === null);
        if (placed !== -1) playSound(room.board[placed] === mySymbol ? "move" : "reply");
    }, [room.board, mySymbol]);

    // Трек завершення партії - лише один раз за перехід у "finished"
    // (сам room.status може ще кілька разів оновитись, поки триває реванш-очікування).
    const trackedFinishRef = useRef(false);
    useEffect(() => {
        if (isFinished && !trackedFinishRef.current) {
            trackedFinishRef.current = true;
            trackEvent("online_game_finished", {
                gameMode: room.gameMode,
                result: room.winner === "draw" ? "draw" : room.winner === mySymbol ? "win" : "loss",
            });
        }
        if (!isFinished) trackedFinishRef.current = false;
    }, [isFinished, room.gameMode, room.winner, mySymbol]);

    // Вікно результату - кожному гравцю своє (нагороди нараховує його ж клієнт, wallet/profile
    // слухають online_game_finished). Відкривається після паузи, щоб спершу було видно лінію.
    const [popupOpen, setPopupOpen] = useState(false);
    useEffect(() => {
        if (!isFinished) {
            setPopupOpen(false);
            return;
        }
        const timer = setTimeout(() => setPopupOpen(true), 900);
        return () => clearTimeout(timer);
    }, [isFinished]);

    const myResult: "win" | "lose" | "draw" = room.winner === "draw" ? "draw" : room.winner === mySymbol ? "win" : "lose";
    const [rematchError, setRematchError] = useState(false);
    const rematch = () => {
        if (!room.rated) return void requestRematch(roomId, mySymbol);
        setNow(Date.now());
        setRematchError(false);
        void ratedRematch(roomId).then((res) => res.error && setRematchError(true), () => setRematchError(true));
    };
    // Новий суперник: вийти з кімнати й одразу почати пошук швидкого матчу.
    const newOpponent = () => {
        openPanel("match");
        onExit();
    };
    const status = isFinished
        ? resultLabel ?? ""
        : turnRemaining !== null
        ? t(myTurn ? "turnClockMine" : "turnClockTheirs", { t: formatClock(turnRemaining) })
        : myTurn
        ? t("yourTurn")
        : t("opponentTurn");
    const ratingLine =
        room.rated && room.ratingDelta && room.ratingsAfter
            ? t("matchRatingChange", {
                  delta: `${room.ratingDelta[mySymbol] > 0 ? "+" : ""}${room.ratingDelta[mySymbol]}`,
                  rating: String(room.ratingsAfter[mySymbol]),
              })
            : room.rated
            ? t("matchRated")
            : undefined;

    // Як у партії з ботом: рахунок ліворуч над полем, у тому ж рядку - підказка, а після кінця
    // партії праворуч - "Грати ще раз" (рейтинговий матч - "Результат").
    return (
        <GameRoot>
            {popupOpen && (
                <ResultPopup
                    result={myResult}
                    summary={summary}
                    eyebrow={room.rated ? t("homeMatch") : t("homeFriend")}
                    title={resultLabel ?? undefined}
                    extra={
                        <>
                            {ratingLine}
                            {opponentGone ? (
                                <div>{t("opponentGone")}</div>
                            ) : opponentRematchReady && !myRematchReady ? (
                                <div>{t("opponentWantsRematch")}</div>
                            ) : null}
                            {rematchError && <div>{t("rematchFailed")}</div>}
                        </>
                    }
                    onClose={() => setPopupOpen(false)}
                    onRestart={opponentGone ? newOpponent : rematch}
                    restartLabel={
                        opponentGone ? t("newOpponent") : myRematchReady ? t("waitingRematch") : room.rated ? t("rematchButton") : t("playAgain")
                    }
                    restartDisabled={!opponentGone && myRematchReady}
                    secondary={room.rated && !opponentGone ? { label: t("newOpponent"), onClick: newOpponent } : undefined}
                    onMenu={onExit}
                />
            )}

            <ScoreTop>
                <ScorePill>
                    <span>{names.X}</span>
                    <b>{score.X}</b>
                    <span>—</span>
                    <b>{score.O}</b>
                    <span>{names.O}</span>
                </ScorePill>
                <TurnLine key={status} role="status" aria-live="polite">
                    {status}
                </TurnLine>
                {isFinished &&
                    (opponentGone ? (
                        <ResultLink type="button" onClick={newOpponent}>
                            {t("newOpponent")}
                        </ResultLink>
                    ) : myRematchReady ? (
                        <WaitingText style={{ margin: 0, flexShrink: 0 }}>{t("waitingRematch")}</WaitingText>
                    ) : (
                        <ResultLink type="button" onClick={rematch}>
                            {t("playAgain")}
                        </ResultLink>
                    ))}
            </ScoreTop>

            {room.modifier && (
                <ModLine>
                    <strong>{t(`modifier_${room.modifier}`)}</strong> · {t(`modifierDesc_${room.modifier}`)}
                </ModLine>
            )}
            {room.modifier === "timer" && myTurn && !isFinished && (
                <div style={{ width: "var(--board-w)" }}>
                    <MoveTimerBar fraction={timerLeft} />
                </div>
            )}

            {isFinished && !opponentGone && opponentRematchReady && !myRematchReady && (
                <div style={{ width: "var(--board-w)", fontSize: 13, fontWeight: 700, color: "#7a5a35" }}>{t("opponentWantsRematch")}</div>
            )}

            <TurnAlert room={room} mySymbol={mySymbol} remaining={turnRemaining} />

            <BoardHolder>
                <OnlineBoardContainer $size={size} $backgroundUrl={theme.backgroundUrl}>
                    {room.board.map((cell, index) => {
                        const disabled = !myTurn || isFinished || (cell !== null && !gravity);
                        return (
                            <OnlineCell key={index} $disabled={disabled} onClick={() => handleCellClick(index)}>
                                {cell === ROOM_STONE ? (
                                    <StoneTile role="img" aria-label={t("modifier_stones")} />
                                ) : (
                                    cell && <GamePiece src={markerSrc[cell as PlayerSymbol]} alt={cell} winning={winningCells?.has(index)} fading={fading?.has(index)} />
                                )}
                            </OnlineCell>
                        );
                    })}
                </OnlineBoardContainer>
            </BoardHolder>

            {moveError && <div style={{ color: "#b8382a", fontWeight: 700 }}>{t("matchMoveError")}</div>}
        </GameRoot>
    );
};
