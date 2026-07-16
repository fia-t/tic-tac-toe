"use client";
import React, { useEffect, useRef } from "react";
import {
    OnlineLayout,
    OnlineBoardContainer,
    OnlineCell,
    TurnBanner,
    PillButton,
    WaitingText,
} from "@/app/components/onlineStyles";
import { RoomDoc, PlayerSymbol, makeMove, requestRematch } from "@/app/lib/onlineGame";
import { BOARD_SIZE } from "@/app/components/onlineGameLogic";
import { trackEvent } from "@/app/lib/firebase";
import { DEFAULT_THEME } from "@/app/lib/themes";

type OnlineBoardProps = {
    roomId: string;
    room: RoomDoc;
    mySymbol: PlayerSymbol;
    uid: string;
};

export const OnlineBoard: React.FC<OnlineBoardProps> = ({ roomId, room, mySymbol, uid }) => {
    const size = BOARD_SIZE[room.gameMode];
    const isFinished = room.status === "finished";
    const myTurn = room.status === "playing" && room.currentPlayer === mySymbol;
    // Захист для кімнат, створених до появи тем (theme могло не бути в документі).
    const theme = room.theme ?? DEFAULT_THEME;
    const markerSrc: Record<PlayerSymbol, string> = {
        X: theme.xMarkerUrl,
        O: theme.oMarkerUrl,
    };

    const handleCellClick = (index: number) => {
        if (!myTurn || room.board[index] !== null) return;
        void makeMove(roomId, index, mySymbol, uid);
    };

    const resultLabel =
        room.winner === "draw"
            ? "Нічия!"
            : room.winner === mySymbol
            ? "Ви перемогли!"
            : room.winner
            ? "Суперник переміг!"
            : null;

    const opponentSymbol: PlayerSymbol = mySymbol === "X" ? "O" : "X";
    const myRematchReady = room.rematch[mySymbol];
    const opponentRematchReady = room.rematch[opponentSymbol];

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

    return (
        <OnlineLayout>
            <TurnBanner $myTurn={isFinished ? false : myTurn}>
                {isFinished ? resultLabel : myTurn ? "Ваш хід" : "Хід суперника"}
            </TurnBanner>

            <OnlineBoardContainer $size={size} $backgroundUrl={theme.backgroundUrl}>
                {room.board.map((cell, index) => {
                    const row = Math.floor(index / size);
                    const col = index % size;
                    const disabled = !myTurn || cell !== null || isFinished;
                    return (
                        <OnlineCell
                            key={index}
                            $borderRight={col < size - 1}
                            $borderBottom={row < size - 1}
                            $disabled={disabled}
                            onClick={() => handleCellClick(index)}
                        >
                            {cell && (
                                <img
                                    src={markerSrc[cell as PlayerSymbol]}
                                    alt={cell}
                                    style={{ width: "70%", height: "70%", objectFit: "contain" }}
                                />
                            )}
                        </OnlineCell>
                    );
                })}
            </OnlineBoardContainer>

            {isFinished && (
                <div style={{ marginTop: 14, width: "min(92vw, 420px)", textAlign: "center" }}>
                    {myRematchReady ? (
                        <WaitingText>Очікуємо, поки суперник погодиться...</WaitingText>
                    ) : (
                        <PillButton type="button" onClick={() => requestRematch(roomId, mySymbol)}>
                            Грати ще раз
                        </PillButton>
                    )}
                    {opponentRematchReady && !myRematchReady && (
                        <div style={{ marginTop: 6, fontSize: 13, color: "#7a5a35" }}>Суперник хоче реванш!</div>
                    )}
                </div>
            )}
        </OnlineLayout>
    );
};
