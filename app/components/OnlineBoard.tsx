"use client";
import React from "react";
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

const MARKER_SRC: Record<PlayerSymbol, string> = {
    X: "/images/x-marker-2.png",
    O: "/images/o-marker-2.png",
};

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

    return (
        <OnlineLayout>
            <TurnBanner $myTurn={isFinished ? false : myTurn}>
                {isFinished ? resultLabel : myTurn ? "Ваш хід" : "Хід суперника"}
            </TurnBanner>

            <OnlineBoardContainer $size={size}>
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
                                    src={MARKER_SRC[cell as PlayerSymbol]}
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
