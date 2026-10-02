// Спільна логіка для перевірки виграшних ліній 3x3.
// Використовується і класичним режимом, і кожним малим полем в Ultimate-режимі,
// а також для перевірки перемоги на "великому" полі (там мала поля виступають клітинками).
export type Grid3 = (string | null)[][];

export const gridLines: [number, number][][] = [
    [[0, 0], [0, 1], [0, 2]],
    [[1, 0], [1, 1], [1, 2]],
    [[2, 0], [2, 1], [2, 2]],
    [[0, 0], [1, 0], [2, 0]],
    [[0, 1], [1, 1], [2, 1]],
    [[0, 2], [1, 2], [2, 2]],
    [[0, 0], [1, 1], [2, 2]],
    [[0, 2], [1, 1], [2, 0]],
];

export const createEmptyGrid = (): Grid3 => Array(3).fill(null).map(() => Array(3).fill(null));

export const getGridWinner = (grid: Grid3): string | null => {
    for (const line of gridLines) {
        const [a, b, c] = line;
        const va = grid[a[0]][a[1]];
        const vb = grid[b[0]][b[1]];
        const vc = grid[c[0]][c[1]];
        if (va && va === vb && vb === vc) return va;
    }
    return null;
};

export const isGridFull = (grid: Grid3): boolean =>
    grid.every((row) => row.every((cell) => cell !== null));

// Знаходить клітинку, яка завершує лінію з двома фішками symbol (виграш або блок).
export const findWinningCell = (grid: Grid3, symbol: string): [number, number] | null => {
    for (const line of gridLines) {
        const [a, b, c] = line;
        const values = [grid[a[0]][a[1]], grid[b[0]][b[1]], grid[c[0]][c[1]]];
        if (values.filter((v) => v === symbol).length === 2 && values.includes(null)) {
            return line[values.indexOf(null)];
        }
    }
    return null;
};

// Позиційний вибір клітинки, коли немає негайного виграшу чи блоку: центр > кут > край.
// Коли доступні і центр, і кут - обираємо випадково між ними, а не завжди центр,
// інакше ШІ щоразу відкриває порожнє поле однаково й стає передбачуваним.
export const pickHeuristicCell = (grid: Grid3): [number, number] | null => {
    const corners: [number, number][] = [[0, 0], [0, 2], [2, 0], [2, 2]];
    const openCorners = corners.filter(([r, c]) => grid[r][c] === null);
    const isCenterOpen = grid[1][1] === null;

    if (isCenterOpen && openCorners.length > 0) {
        return Math.random() < 0.5
            ? [1, 1]
            : openCorners[Math.floor(Math.random() * openCorners.length)];
    }

    if (isCenterOpen) return [1, 1];

    if (openCorners.length > 0) {
        return openCorners[Math.floor(Math.random() * openCorners.length)];
    }

    const edges: [number, number][] = [[0, 1], [1, 0], [1, 2], [2, 1]];
    const openEdges = edges.filter(([r, c]) => grid[r][c] === null);
    if (openEdges.length > 0) {
        return openEdges[Math.floor(Math.random() * openEdges.length)];
    }

    return null;
};

// --- Generic (arbitrary size + winLength) варіант вище - для режимів на кшталт 5x5,
// де 8 захардкоджених gridLines не підходять. Не чіпає нічого з 3x3-специфічного вище.

// Перевіряє, чи є winLength фішок symbol поспіль у будь-якому з 4 напрямків
// (горизонталь/вертикаль/2 діагоналі), скануючи кожну клітинку як можливий старт лінії.
export const getGenericWinner = (grid: Grid3, winLength: number): string | null => {
    const size = grid.length;
    const directions: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const symbol = grid[row][col];
            if (!symbol) continue;

            for (const [dr, dc] of directions) {
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

// Пробна установка symbol у кожну вільну клітинку (з негайним відкатом - синхронно,
// без стороннього коду між мутацією і відкатом, тож стан гри ніколи не "витікає"
// напівзмінений) - повертає першу клітинку, що завершує лінію (виграш або блок).
export const findWinningCellGeneric = (grid: Grid3, symbol: string, winLength: number): [number, number] | null => {
    const size = grid.length;
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (grid[row][col] !== null) continue;
            grid[row][col] = symbol;
            const wins = getGenericWinner(grid, winLength) === symbol;
            grid[row][col] = null;
            if (wins) return [row, col];
        }
    }
    return null;
};

// Скільки фішок symbol підряд утворилось би в кожному з 4 напрямків, якби зайняти (row, col) -
// сума по напрямках, використовується як "офензивна"/"дефензивна" вага клітинки нижче.
const lineScore = (grid: Grid3, row: number, col: number, symbol: string, winLength: number): number => {
    const size = grid.length;
    const directions: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];
    let score = 0;

    for (const [dr, dc] of directions) {
        let count = 1;
        for (const dir of [1, -1]) {
            for (let step = 1; step < winLength; step++) {
                const r = row + dr * step * dir;
                const c = col + dc * step * dir;
                if (r < 0 || r >= size || c < 0 || c >= size || grid[r][c] !== symbol) break;
                count++;
            }
        }
        score += count;
    }
    return score;
};

// Позиційний вибір для довільного поля: без негайного виграшу/блоку (ті перевіряються
// окремо через findWinningCellGeneric) обираємо клітинку, що найбільше подовжує власні
// лінії, трохи зважає на лінії суперника, і тяжіє до центру поля. Не мінімакс - той самий
// рівень "евристичного" ШІ, що й у наявних 3x3/Ultimate режимах.
export const pickHeuristicCellGeneric = (
    grid: Grid3,
    symbol: string,
    opponentSymbol: string,
    winLength: number
): [number, number] | null => {
    const size = grid.length;
    const center = (size - 1) / 2;
    let best: [number, number] | null = null;
    let bestScore = -Infinity;

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (grid[row][col] !== null) continue;
            const distance = Math.max(Math.abs(row - center), Math.abs(col - center));
            const offense = lineScore(grid, row, col, symbol, winLength);
            const defense = lineScore(grid, row, col, opponentSymbol, winLength);
            const score = offense * 1.5 + defense - distance * 0.3 + Math.random() * 0.4;
            if (score > bestScore) {
                bestScore = score;
                best = [row, col];
            }
        }
    }
    return best;
};

export const createEmptyGridN = (size: number): Grid3 =>
    Array(size).fill(null).map(() => Array(size).fill(null));
