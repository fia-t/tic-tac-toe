import React, { useState } from "react";
import { GameLayout, BoardContainer, Cell, borderStyles, ButtonContainer, Button, ControlIcon, ButtonWithTooltip, Tooltip } from "@/app/components/gameStyles";
import { FriendGameModal } from "@/app/components/FriendGameModal";

type BoardProps = {
    board: (string | null)[][];
    handleClick: (row: number, col: number) => void;
    restartGame: () => void;  // Додаємо пропс для перезапуску гри
    setGameMode: (mode: "traditional" | "difficult") => void;
};

export const Board: React.FC<BoardProps> = ({ board, handleClick, restartGame, setGameMode   }) => {
    const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);

    return (
        <GameLayout>
            <BoardContainer>
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
                            {cell && <img src={cell} alt="marker" style={{ width: "70%", height: "70%", objectFit: "contain" }} />}
                        </Cell>
                    );
                })}
            </BoardContainer>

            {/* Кнопка перезапуску тепер отримує restartGame з пропсів */}
            <ButtonContainer>
                <Button onClick={restartGame} aria-label="Restart">
                    <ControlIcon src="/images/reload.png" alt="Restart" />
                </Button>
                <ButtonWithTooltip>
                    <Button onClick={() => setGameMode("traditional")} aria-label="Easy">
                        <ControlIcon src="/images/traditional.png" alt="Easy" />
                    </Button>
                    <Tooltip>Easy</Tooltip>
                </ButtonWithTooltip>
                <ButtonWithTooltip>
                    <Button onClick={() => setGameMode("difficult")} aria-label="Hard">
                        <ControlIcon src="/images/difficult.png" alt="Hard" />
                    </Button>
                    <Tooltip>Hard</Tooltip>
                </ButtonWithTooltip>
                <ButtonWithTooltip>
                    <Button onClick={() => setIsFriendModalOpen(true)} aria-label="Play with a friend">
                        <ControlIcon src="/images/game_with_friends.png" alt="Play with a friend" />
                    </Button>
                    <Tooltip>Friend</Tooltip>
                </ButtonWithTooltip>
            </ButtonContainer>

            {isFriendModalOpen && <FriendGameModal onClose={() => setIsFriendModalOpen(false)} />}
        </GameLayout>
    );
};
