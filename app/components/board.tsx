import React, { useState } from "react";
import { GameLayout, BoardColumn, BoardContainer, Cell, borderStyles, ButtonContainer, Button, ControlIcon, ButtonWithTooltip, Tooltip } from "@/app/components/gameStyles";
import { FriendGameModal } from "@/app/components/FriendGameModal";
import { GamePiece } from "@/app/components/GamePiece";
import { trackEvent } from "@/app/lib/firebase";

type BoardProps = {
    board: (string | null)[][];
    handleClick: (row: number, col: number) => void;
    restartGame: () => void;  // Додаємо пропс для перезапуску гри
    setGameMode: (mode: "traditional" | "difficult" | "five") => void;
    backgroundUrl?: string;
    scoreBoard?: React.ReactNode;
    onRoomReady: (roomId: string) => void;
    onBeforeFriendOpen?: () => Promise<boolean>;
};

export const Board: React.FC<BoardProps> = ({
    board,
    handleClick,
    restartGame,
    setGameMode,
    backgroundUrl,
    scoreBoard,
    onRoomReady,
    onBeforeFriendOpen,
}) => {
    const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);

    const handleFriendClick = async () => {
        trackEvent("friend_modal_open", { from: "easy" });
        if (onBeforeFriendOpen) {
            const allowed = await onBeforeFriendOpen();
            if (!allowed) return;
        }
        setIsFriendModalOpen(true);
    };

    return (
        <GameLayout>
            <BoardColumn>
                {scoreBoard}
                <BoardContainer $backgroundUrl={backgroundUrl}>
                    {/* Ячейки */}
                    {board.flat().map((cell, index) => {
                        const rowIndex = Math.floor(index / 3);
                        const cellIndex = index % 3;
                        return (
                            <Cell
                                key={index}
                                $borderStyle={borderStyles[index]}
                                onClick={(e) => { e.stopPropagation(); handleClick(rowIndex, cellIndex); }}
                            >
                                {cell && <GamePiece src={cell} />}
                            </Cell>
                        );
                    })}
                </BoardContainer>
            </BoardColumn>

            {/* Кнопка перезапуску тепер отримує restartGame з пропсів */}
            <ButtonContainer>
                <Button onClick={restartGame} aria-label="Restart">
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
                            trackEvent("select_mode", { mode: "five" });
                            setGameMode("five");
                        }}
                        aria-label="5x5"
                    >
                        <ControlIcon src="/images/game-5x5.png" alt="5x5" />
                    </Button>
                    <Tooltip>5×5</Tooltip>
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
                    <Button onClick={handleFriendClick} aria-label="Play with a friend">
                        <ControlIcon src="/images/game_with_friends.png" alt="Play with a friend" />
                    </Button>
                    <Tooltip>Friend</Tooltip>
                </ButtonWithTooltip>
            </ButtonContainer>

            {isFriendModalOpen && (
                <FriendGameModal
                    onClose={() => setIsFriendModalOpen(false)}
                    onRoomReady={onRoomReady}
                    defaultMode="3x3"
                />
            )}
        </GameLayout>
    );
};
