import React from "react";
import { GameLayout, BoardContainer, Cell, borderStyles, ButtonContainer, Button } from "@/app/components/gameStyles";
import { RestartIcon, EasyModeIcon, HardModeIcon } from "@/app/components/icons";

type BoardProps = {
    board: (string | null)[][];
    handleClick: (row: number, col: number) => void;
    restartGame: () => void;  // Додаємо пропс для перезапуску гри
    setGameMode: (mode: "traditional" | "difficult") => void;
};

export const Board: React.FC<BoardProps> = ({ board, handleClick, restartGame, setGameMode   }) => {

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
                    <RestartIcon />
                </Button>
                <Button onClick={() => setGameMode("traditional")} aria-label="Easy">
                    <EasyModeIcon />
                </Button>
                <Button onClick={() => setGameMode("difficult")} aria-label="Hard">
                    <HardModeIcon />
                </Button>
            </ButtonContainer>
        </GameLayout>
    );
};
