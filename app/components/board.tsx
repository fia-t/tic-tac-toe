import React from "react";
import { BoardContainer, Cell, borderStyles, ButtonContainer, Button, RestartIcon, TraditionalIcon, DifficultIcon} from "@/app/components/gameStyles";

type BoardProps = {
    board: (string | null)[][];
    handleClick: (row: number, col: number) => void;
    restartGame: () => void;  // Додаємо пропс для перезапуску гри
    // setGameMode: (mode: string) => void;
    setGameMode: (mode: "traditional" | "difficult") => void;
};

export const Board: React.FC<BoardProps> = ({ board, handleClick, restartGame, setGameMode   }) => {

    return (
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
                        {cell && <img src={cell} alt="marker" style={{ width: "110px", height: "110px" }} />}
                    </Cell>
                );
            })}
            {/* Кнопка перезапуску тепер отримує restartGame з пропсів */}
            <ButtonContainer style={{ position: "absolute", top: "10px", right: "10px" }}>
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
        </BoardContainer>
    );
};