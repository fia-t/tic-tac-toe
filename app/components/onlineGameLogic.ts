// Логіка для онлайн-режиму "Гра з другом": на відміну від gameLogic.ts (фіксовані
// 3x3-лінії), тут поле може бути 3x3 або 5x5, тож лінії перемоги рахуються
// узагальнено - для будь-якого розміру поля й довжини виграшної лінії.
export type OnlineGrid = (string | null)[][];
export type OnlineGameMode = "3x3" | "5x5";

export const BOARD_SIZE: Record<OnlineGameMode, number> = {
    "3x3": 3,
    "5x5": 5,
};

// На 5x5 три-в-ряд збирається за пару ходів і робить гру занадто короткою,
// тому там перемога - це чотири фішки поспіль (звичне розширення правил).
export const WIN_LENGTH: Record<OnlineGameMode, number> = {
    "3x3": 3,
    "5x5": 4,
};

export const createEmptyOnlineGrid = (mode: OnlineGameMode): OnlineGrid => {
    const size = BOARD_SIZE[mode];
    return Array.from({ length: size }, () => Array(size).fill(null));
};

const DIRECTIONS: [number, number][] = [
    [0, 1], // горизонталь
    [1, 0], // вертикаль
    [1, 1], // діагональ ↘
    [1, -1], // діагональ ↙
];

export const getOnlineGridWinner = (grid: OnlineGrid, mode: OnlineGameMode): string | null => {
    const size = BOARD_SIZE[mode];
    const winLength = WIN_LENGTH[mode];

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const symbol = grid[row][col];
            if (!symbol) continue;

            for (const [dr, dc] of DIRECTIONS) {
                let count = 1;
                for (let step = 1; step < winLength; step++) {
                    const r = row + dr * step;
                    const c = col + dc * step;
                    if (r < 0 || r >= size || c < 0 || c >= size || grid[r][c] !== symbol) break;
                    count++;
                }
                if (count >= winLength) return symbol;
            }
        }
    }

    return null;
};

export const isOnlineGridFull = (grid: OnlineGrid): boolean =>
    grid.every((row) => row.every((cell) => cell !== null));
