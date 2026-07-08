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
