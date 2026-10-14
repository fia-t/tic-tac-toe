// Алгоритми ШІ для рівнів складності поверх базової евристики з gameLogic.ts.
// Легкий = базовий ШІ + випадкові "помилки" (lib/difficulty.ts), Середній = базовий,
// Майстер = функції нижче.
import {
    Grid3,
    getGridWinner,
    isGridFull,
    findWinningCell,
    getGenericWinner,
    findWinningCellGeneric,
    pickHeuristicCellGeneric,
} from "@game/components/gameLogic";

const freeCells = (grid: Grid3): [number, number][] => {
    const cells: [number, number][] = [];
    grid.forEach((row, r) => row.forEach((cell, c) => cell === null && cells.push([r, c])));
    return cells;
};

const pickRandom = <T>(items: T[]): T | null => (items.length ? items[Math.floor(Math.random() * items.length)] : null);

export const randomFreeCell = (grid: Grid3): [number, number] | null => pickRandom(freeCells(grid));

// --- 3×3: повний мінімакс - Майстра неможливо перемогти, найкраще для гравця - нічия.
// Швидша перемога / пізніша поразка важать більше (depth); серед рівноцінних
// найкращих ходів - випадковий, щоб партії не повторювались хід у хід.
const minimax = (grid: Grid3, ai: string, player: string, aiTurn: boolean, depth: number): number => {
    const winner = getGridWinner(grid);
    if (winner === ai) return 10 - depth;
    if (winner === player) return depth - 10;
    if (isGridFull(grid)) return 0;

    let best = aiTurn ? -Infinity : Infinity;
    for (const [r, c] of freeCells(grid)) {
        grid[r][c] = aiTurn ? ai : player;
        const score = minimax(grid, ai, player, !aiTurn, depth + 1);
        grid[r][c] = null;
        best = aiTurn ? Math.max(best, score) : Math.min(best, score);
    }
    return best;
};

export const pickMasterMove3 = (board: Grid3, ai: string, player: string): [number, number] | null => {
    const grid = board.map((row) => [...row]);
    let bestScore = -Infinity;
    let bestMoves: [number, number][] = [];
    for (const [r, c] of freeCells(grid)) {
        grid[r][c] = ai;
        const score = minimax(grid, ai, player, false, 1);
        grid[r][c] = null;
        if (score > bestScore) {
            bestScore = score;
            bestMoves = [[r, c]];
        } else if (score === bestScore) {
            bestMoves.push([r, c]);
        }
    }
    return pickRandom(bestMoves);
};

// --- 5×5 (і будь-яке поле з winLength): ШІ, що бачить "вилки" - ходи, після яких
// у гравця дві виграшні клітинки одночасно (одну заблокувати можна, дві - ні).
const countWinningCells = (grid: Grid3, symbol: string, winLength: number): number => {
    let count = 0;
    for (const [r, c] of freeCells(grid)) {
        grid[r][c] = symbol;
        if (getGenericWinner(grid, winLength) === symbol) count++;
        grid[r][c] = null;
    }
    return count;
};

const findForkCell = (grid: Grid3, symbol: string, winLength: number): [number, number] | null => {
    for (const [r, c] of freeCells(grid)) {
        grid[r][c] = symbol;
        const forks = countWinningCells(grid, symbol, winLength) >= 2;
        grid[r][c] = null;
        if (forks) return [r, c];
    }
    return null;
};

export const pickMasterMoveN = (
    board: Grid3,
    ai: string,
    player: string,
    winLength: number
): [number, number] | null => {
    const grid = board.map((row) => [...row]);
    return (
        findWinningCellGeneric(grid, ai, winLength) ??
        findWinningCellGeneric(grid, player, winLength) ??
        // Власна вилка - гарантована перемога наступним ходом.
        findForkCell(grid, ai, winLength) ??
        // Вилка гравця - займаємо цю клітинку раніше за нього.
        findForkCell(grid, player, winLength) ??
        pickHeuristicCellGeneric(grid, ai, player, winLength)
    );
};

// --- Ultimate: наскільки хід ШІ (у клітинку cell) "дарує" гравцю наступний хід.
// 2 - гравця відправлено в мале поле, яке він виграє одним ходом;
// 1 - поле вже вирішене/заповнене, тож гравець ходить куди завгодно;
// 0 - безпечно.
export const ultimateMoveDanger = (
    boards: Grid3[],
    resultsAfterMove: (string | null)[],
    boardIndex: number,
    cell: [number, number],
    ai: string,
    player: string
): number => {
    const target = cell[0] * 3 + cell[1];
    const targetGrid =
        target === boardIndex
            ? boards[boardIndex].map((row, r) => row.map((v, c) => (r === cell[0] && c === cell[1] ? ai : v)))
            : boards[target];
    if (resultsAfterMove[target] !== null || isGridFull(targetGrid)) return 1;
    return findWinningCell(targetGrid, player) ? 2 : 0;
};

// Позиційний хід Майстра в Ultimate (замість "перше поле за пріоритетом"): перебирає
// всі доступні клітинки й обирає ту, що найменше "дарує" гравцю, а серед безпечних -
// центр/кути малого поля і сильніші великі поля.
const CELL_WEIGHT = [2, 1, 2, 1, 3, 1, 2, 1, 2];

export const pickMasterUltimatePositional = (
    boards: Grid3[],
    miniResults: (string | null)[],
    candidateBoards: number[],
    ai: string,
    player: string
): [number, number, number] | null => {
    let best: [number, number, number] | null = null;
    let bestScore = -Infinity;
    for (const boardIndex of candidateBoards) {
        for (const [r, c] of freeCells(boards[boardIndex])) {
            const after = boards[boardIndex].map((row, ri) => row.map((v, ci) => (ri === r && ci === c ? ai : v)));
            const resultAfter = getGridWinner(after) === ai ? "O" : isGridFull(after) ? "draw" : null;
            const resultsAfterMove = miniResults.map((v, i) => (i === boardIndex ? resultAfter ?? v : v));
            const danger = ultimateMoveDanger(boards, resultsAfterMove, boardIndex, [r, c], ai, player);
            const score = -danger * 10 + CELL_WEIGHT[r * 3 + c] + CELL_WEIGHT[boardIndex] * 0.5 + Math.random() * 0.3;
            if (score > bestScore) {
                bestScore = score;
                best = [boardIndex, r, c];
            }
        }
    }
    return best;
};
