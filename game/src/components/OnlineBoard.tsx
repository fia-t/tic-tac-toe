"use client";
import React, { useEffect, useRef, useState } from "react";
import { OnlineBoardContainer, OnlineCell, WaitingText } from "@game/components/onlineStyles";
import { BoardHolder, GameRoot, ResultLink, ScorePill, ScoreTop, TurnLine } from "@game/components/GameScreen";
import { ResultPopup } from "@game/components/ResultPopup";
import { useWallet } from "@game/lib/wallet";
import { useProfile } from "@game/lib/profile";
import { openPanel } from "@game/lib/ui";
import { RoomDoc, PlayerSymbol, makeMove, requestRematch } from "@game/lib/onlineGame";
import { BOARD_SIZE, WIN_LENGTH } from "@game/components/onlineGameLogic";
import { winningIndexSet } from "@game/components/gameLogic";
import { trackEvent } from "@game/lib/firebase";
import { DEFAULT_THEME } from "@game/lib/themes";
import { GamePiece } from "@game/components/GamePiece";
import { useT } from "@game/lib/i18n";
import { playSound } from "@game/lib/sound";
import { ratedMove, rememberRating } from "@game/lib/matchmaking";
import { TurnAlert, formatClock, useRatedTurnClock } from "@game/components/RatedTurnTimer";

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
    const handleCellClick = (index: number) => {
        if (!myTurn || room.board[index] !== null) return;
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
    const myRematchReady = room.rematch[mySymbol];
    const opponentRematchReady = room.rematch[opponentSymbol];

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
    const rematch = () => requestRematch(roomId, mySymbol);
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
                    extra={ratingLine}
                    onClose={() => setPopupOpen(false)}
                    onRestart={room.rated ? () => { openPanel("match"); onExit(); } : rematch}
                    restartLabel={room.rated ? t("homeMatch") : myRematchReady ? t("waitingRematch") : t("playAgain")}
                    restartDisabled={!room.rated && myRematchReady}
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
                    (room.rated ? (
                        <ResultLink type="button" onClick={() => setPopupOpen(true)}>
                            {t("showResult")}
                        </ResultLink>
                    ) : myRematchReady ? (
                        <WaitingText style={{ margin: 0, flexShrink: 0 }}>{t("waitingRematch")}</WaitingText>
                    ) : (
                        <ResultLink type="button" onClick={rematch}>
                            {t("playAgain")}
                        </ResultLink>
                    ))}
            </ScoreTop>

            {isFinished && !room.rated && opponentRematchReady && !myRematchReady && (
                <div style={{ width: "var(--board-w)", fontSize: 13, fontWeight: 700, color: "#7a5a35" }}>{t("opponentWantsRematch")}</div>
            )}

            <TurnAlert room={room} mySymbol={mySymbol} remaining={turnRemaining} />

            <BoardHolder>
                <OnlineBoardContainer $size={size} $backgroundUrl={theme.backgroundUrl}>
                    {room.board.map((cell, index) => {
                        const disabled = !myTurn || cell !== null || isFinished;
                        return (
                            <OnlineCell key={index} $disabled={disabled} onClick={() => handleCellClick(index)}>
                                {cell && <GamePiece src={markerSrc[cell as PlayerSymbol]} alt={cell} winning={winningCells?.has(index)} />}
                            </OnlineCell>
                        );
                    })}
                </OnlineBoardContainer>
            </BoardHolder>

            {moveError && <div style={{ color: "#b8382a", fontWeight: 700 }}>{t("matchMoveError")}</div>}
        </GameRoot>
    );
};
