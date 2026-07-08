import React from "react";
import { GameLayout, BoardContainer, Cell, borderStyles, ButtonContainer, Button, RestartIcon, TraditionalIcon, DifficultIcon} from "@/app/components/gameStyles";

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
                <Button onClick={restartGame}>
                    <RestartIcon src="/images/reload.png" alt="Restart" />
                </Button>
                <Button onClick={() => setGameMode("traditional")}>
                    <TraditionalIcon src="/images/traditional.png" alt="Traditional" />
                </Button>
                <Button onClick={() => setGameMode("difficult")}>
                    <DifficultIcon src="/images/difficult.png" alt="Difficult" />
                </Button>
            </ButtonContainer>
        </GameLayout>
    );
};
