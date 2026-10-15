import React from "react";
import styled from "styled-components";
import { BoardContainer, Cell, hintedCell } from "@game/components/gameStyles";
import { GamePiece } from "@game/components/GamePiece";

// Поле 3×3. Смуга кнопок над ним, рахунок і бустери - у GameScreen.

const HintCell = styled(Cell)<{ $hint: boolean }>`
    ${({ $hint }) => ($hint ? hintedCell : "")}
`;

type BoardProps = {
    board: (string | null)[][];
    handleClick: (row: number, col: number) => void;
    backgroundUrl?: string;
    // Плоскі індекси клітинок переможної лінії - підсвічуються після кінця партії.
    winningCells?: Set<number>;
    // Зникаючі фішки: клітинки з фішками, що зникнуть наступним ходом.
    fadingCells?: Set<number>;
    // Клітинка, яку радить бустер "Підказка".
    hintCell?: number | null;
};

export const Board: React.FC<BoardProps> = ({ board, handleClick, backgroundUrl, winningCells, fadingCells, hintCell }) => (
    <BoardContainer $backgroundUrl={backgroundUrl}>
        {board.flat().map((cell, index) => {
            const rowIndex = Math.floor(index / 3);
            const cellIndex = index % 3;
            return (
                <HintCell
                    key={index}
                    $hint={hintCell === index}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleClick(rowIndex, cellIndex);
                    }}
                >
                    {cell && <GamePiece src={cell} winning={winningCells?.has(index)} fading={fadingCells?.has(index)} />}
                </HintCell>
            );
        })}
    </BoardContainer>
);
