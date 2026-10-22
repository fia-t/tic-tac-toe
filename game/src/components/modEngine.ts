// Рушій партій з модифікаторами правил (зникаючі фішки, гравітація, каміння, піддавки)
// для 3×3 і 5×5. Звичайні партії без модифікаторів і далі йдуть через gameLogic.ts +
// aiLevels.ts - там перевірений ШІ; тут - свій, бо модифікатори змінюють і правила
// перемоги, і те, які ходи взагалі можливі.
//
// Усередині рушій працює з плоским масивом: "X" - гравець, "O" - ШІ, "#" - камінь.
// Компоненти зберігають дошку як Grid3 з URL фішок теми - toCells/fromCells перекладають.
import type { Grid3 } from "@game/components/gameLogic";
import type { Difficulty } from "@game/lib/difficulty";

export type Cell = "X" | "O" | "#" | null;

export type ModRules = { vanish?: boolean; gravity?: boolean; misere?: boolean };

// Порядок ходів кожного (для зникаючих фішок) і загальна кількість ходів.
export type ModHistory = { X: number[]; O: number[]; moves: number };
export const EMPTY_HISTORY: ModHistory = { X: [], O: [], moves: 0 };

// Камінь у Grid3 компонента - окреме значення, яке не збігається з жодним URL фішки.
export const STONE = "#stone";
// Горбок крота (модифікатор "кріт") - для правил це теж "#", але тимчасовий.
export const MOUND = "#mound";

// На полі зі зникаючими фішками дошка ніколи не заповнюється - після стількох ходів нічия.
const VANISH_MAX_MOVES = 30;
// Скільки фішок кожного може бути на полі зі зникаючими фішками.
export const VANISH_LIMIT = 3;

type State = { n: number; w: number; board: Cell[]; hist: ModHistory; rules: ModRules };
export type Outcome = { winner: "X" | "O" | "draw" };

const other = (p: "X" | "O"): "X" | "O" => (p === "X" ? "O" : "X");
const pickRandom = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const lineCache = new Map<string, number[][]>();
const lines = (n: number, w: number): number[][] => {
    const key = `${n}:${w}`;
    const cached = lineCache.get(key);
    if (cached) return cached;
    const result: number[][] = [];
    for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++)
            for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
                const cells: number[] = [];
                for (let k = 0; k < w; k++) {
                    const rr = r + dr * k;
                    const cc = c + dc * k;
                    if (rr < 0 || rr >= n || cc < 0 || cc >= n) break;
                    cells.push(rr * n + cc);
                }
                if (cells.length === w) result.push(cells);
            }
    lineCache.set(key, result);
    return result;
};

const lineOwner = (st: State): "X" | "O" | null => {
    for (const line of lines(st.n, st.w)) {
        const v = st.board[line[0]];
        if ((v === "X" || v === "O") && line.every((i) => st.board[i] === v)) return v;
    }
    return null;
};

export const legalMoves = (st: State): number[] => {
    const { board, n } = st;
    const moves: number[] = [];
    if (st.rules.gravity) {
        // Фішка падає вниз стовпця і зупиняється на першій зайнятій клітинці (або камені).
        for (let c = 0; c < n; c++) {
            let land = -1;
            for (let r = 0; r < n; r++) {
                if (board[r * n + c] === null) land = r * n + c;
                else break;
            }
            if (land >= 0) moves.push(land);
        }
        return moves;
    }
    board.forEach((v, i) => v === null && moves.push(i));
    return moves;
};

export const outcomeOf = (st: State): Outcome | null => {
    const owner = lineOwner(st);
    // Піддавки: хто склав лінію - той програв.
    if (owner) return { winner: st.rules.misere ? other(owner) : owner };
    if (!legalMoves(st).length || (st.rules.vanish && st.hist.moves >= VANISH_MAX_MOVES)) return { winner: "draw" };
    return null;
};

const applyMove = (st: State, index: number, p: "X" | "O"): State => {
    const board = st.board.slice();
    const hist: ModHistory = { X: st.hist.X.slice(), O: st.hist.O.slice(), moves: st.hist.moves + 1 };
    if (st.rules.vanish && hist[p].length >= VANISH_LIMIT) board[hist[p].shift() as number] = null;
    board[index] = p;
    hist[p].push(index);
    return { ...st, board, hist };
};

// --- ШІ ---

const evaluate = (st: State, p: "X" | "O"): number => {
    const o = other(p);
    let score = 0;
    for (const line of lines(st.n, st.w)) {
        let mine = 0;
        let theirs = 0;
        let dead = false;
        for (const i of line) {
            const v = st.board[i];
            if (v === p) mine++;
            else if (v === o) theirs++;
            else if (v === "#") dead = true;
        }
        if (dead) continue;
        if (mine && !theirs) score += 5 ** mine;
        else if (theirs && !mine) score -= 5 ** theirs * 1.15;
    }
    return st.rules.misere ? -score : score;
};

// Кандидати ходу: на великому полі - лише поруч із уже поставленими фішками і не більше
// limit найкращих за оцінкою (інакше перебір 5×5 занадто дорогий для браузера).
// У піддавках "поруч" не діє: там сильні якраз ходи подалі від ліній.
const candidates = (st: State, p: "X" | "O", limit: number): number[] => {
    let moves = legalMoves(st);
    if (st.n > 3 && !st.rules.gravity && !st.rules.misere) {
        const near = moves.filter((i) => {
            const r = Math.floor(i / st.n);
            const c = i % st.n;
            for (let dr = -1; dr <= 1; dr++)
                for (let dc = -1; dc <= 1; dc++) {
                    const rr = r + dr;
                    const cc = c + dc;
                    if ((dr || dc) && rr >= 0 && rr < st.n && cc >= 0 && cc < st.n) {
                        const v = st.board[rr * st.n + cc];
                        if (v === "X" || v === "O") return true;
                    }
                }
            return false;
        });
        if (near.length) moves = near;
    }
    if (limit && moves.length > limit) {
        moves = moves
            .map((m) => [m, evaluate(applyMove(st, m, p), p)] as const)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([m]) => m);
    }
    return moves;
};

const negamax = (st: State, depth: number, alpha: number, beta: number, p: "X" | "O", ply: number): number => {
    const oc = outcomeOf(st);
    if (oc) return oc.winner === "draw" ? 0 : oc.winner === p ? 100000 - ply : -100000 + ply;
    if (depth === 0) return evaluate(st, p);
    let best = -Infinity;
    for (const m of candidates(st, p, st.n > 3 ? 8 : 0)) {
        const v = -negamax(applyMove(st, m, p), depth - 1, -beta, -alpha, other(p), ply + 1);
        if (v > best) best = v;
        if (v > alpha) alpha = v;
        if (alpha >= beta) break;
    }
    return best;
};

export const chooseMove = (st: State, p: "X" | "O", difficulty: Difficulty): number | null => {
    const moves = legalMoves(st);
    if (!moves.length) return null;
    if (difficulty === "easy" && Math.random() < 0.35) return pickRandom(moves);
    const o = other(p);
    for (const m of moves) if (outcomeOf(applyMove(st, m, p))?.winner === p) return m;
    // Блок: у піддавках суперник "виграє", лише якщо ми самі складемо лінію - блокувати нічого.
    if (!st.rules.misere) for (const m of moves) if (outcomeOf(applyMove(st, m, o))?.winner === o) return m;

    if (difficulty === "master") {
        const depth = st.n === 3 ? (st.rules.vanish ? 6 : 9) : 4;
        let best = -Infinity;
        let bestMoves: number[] = [];
        for (const m of candidates(st, p, st.n > 3 ? 10 : 0)) {
            const v = -negamax(applyMove(st, m, p), depth - 1, -Infinity, Infinity, o, 1);
            if (v > best) {
                best = v;
                bestMoves = [m];
            } else if (v === best) bestMoves.push(m);
        }
        if (bestMoves.length) return pickRandom(bestMoves);
    }

    // Середній (і Легкий без "помилки"): найкраща позиція на один хід уперед, без самогубних ходів.
    let best = -Infinity;
    let bestMove = moves[0];
    for (const m of moves) {
        const next = applyMove(st, m, p);
        const loses = outcomeOf(next)?.winner === o;
        const v = (loses ? -1e6 : 0) + evaluate(next, p) + Math.random() * 3;
        if (v > best) {
            best = v;
            bestMove = m;
        }
    }
    return bestMove;
};

// --- міст між компонентом (Grid3 з URL фішок) і рушієм ---

export type Markers = { player: string; ai: string };

const toCells = (grid: Grid3, markers: Markers): Cell[] =>
    grid.flat().map((v) => (v === markers.player ? "X" : v === markers.ai ? "O" : v === STONE || v === MOUND ? "#" : null));

// source - поле до ходу: заблокована клітинка лишається тим, чим була (камінь чи горбок).
const fromCells = (cells: Cell[], n: number, markers: Markers, source?: Grid3): Grid3 =>
    Array.from({ length: n }, (_, r) =>
        cells
            .slice(r * n, r * n + n)
            .map((v, c) => (v === "X" ? markers.player : v === "O" ? markers.ai : v === "#" ? (source?.[r]?.[c] === MOUND ? MOUND : STONE) : null))
    );

export type TurnResult = { grid: Grid3; hist: ModHistory; outcome: Outcome | null };

// Один хід партії з модифікаторами. Гравець передає клітинку, куди натиснув (з гравітацією
// фішка падає в той самий стовпець); для ШІ хід обирає chooseMove. null - хід неможливий.
export const playTurn = (
    grid: Grid3,
    hist: ModHistory,
    rules: ModRules,
    winLength: number,
    markers: Markers,
    who: "X" | "O",
    options: { index?: number; difficulty?: Difficulty } = {}
): TurnResult | null => {
    const n = grid.length;
    const st: State = { n, w: winLength, board: toCells(grid, markers), hist, rules };
    const legal = legalMoves(st);
    let index: number | null | undefined = options.index;
    if (index === undefined) index = chooseMove(st, who, options.difficulty ?? "medium");
    else if (rules.gravity) index = legal.find((m) => m % n === (index as number) % n);
    if (index === null || index === undefined || !legal.includes(index)) return null;
    const next = applyMove(st, index, who);
    return { grid: fromCells(next.board, n, markers, grid), hist: next.hist, outcome: outcomeOf(next) };
};

// Випадковий дозволений хід - коли гравцю вийшов час (модифікатор "таймер").
export const randomLegalCell = (grid: Grid3, rules: ModRules, markers: Markers): number | null => {
    const st: State = { n: grid.length, w: 3, board: toCells(grid, markers), hist: EMPTY_HISTORY, rules };
    const legal = legalMoves(st);
    return legal.length ? pickRandom(legal) : null;
};

// Фішка, яка зникне наступним ходом свого власника (показується напівпрозорою).
export const fadingCells = (hist: ModHistory, rules: ModRules): Set<number> => {
    const result = new Set<number>();
    if (!rules.vanish) return result;
    if (hist.X.length >= VANISH_LIMIT) result.add(hist.X[0]);
    if (hist.O.length >= VANISH_LIMIT) result.add(hist.O[0]);
    return result;
};

// Нове поле: з модифікатором "каміння" - кілька випадкових клітинок зайняті (не центр).
export const createBoard = (n: number, stones: number): Grid3 => {
    const grid: Grid3 = Array.from({ length: n }, () => Array(n).fill(null));
    const free = Array.from({ length: n * n }, (_, i) => i).filter((i) => i !== Math.floor((n * n) / 2));
    for (let k = 0; k < stones && free.length; k++) {
        const i = free.splice(Math.floor(Math.random() * free.length), 1)[0];
        grid[Math.floor(i / n)][i % n] = STONE;
    }
    return grid;
};

// --- модифікатор "кріт" (5×5) ---
// Кріт риє горбки: за хід до появи клітинка тремтить (warn), наступним ходом на ній виростає
// горбок, який блокує клітинку, як камінь. Перший горбок - на MOLE.first-му ході, далі кожні
// MOLE.every ходів; горбок живе MOLE.ttl ходів, одночасно - не більше MOLE.max. Кріт не риє там,
// де хтось наступним ходом склав би лінію (рандом не "краде" перемогу), а якщо на тремтячу
// клітинку встигли поставити фішку - не вилазить. Крок робиться лише після справжніх ходів
// (не в переборі ШІ), бо в ньому випадковість.
export const MOLE = { first: 3, every: 3, ttl: 4, max: 2 };

export type MoleState = { mounds: { index: number; ttl: number }[]; warn: number | null; moves: number };
export const EMPTY_MOLE: MoleState = { mounds: [], warn: null, moves: 0 };

export const moleStep = (grid: Grid3, mole: MoleState, winLength: number, markers: Markers): { grid: Grid3; mole: MoleState; dug: boolean } => {
    const n = grid.length;
    const next = grid.map((row) => row.slice());
    const moves = mole.moves + 1;
    let mounds = mole.mounds.map((m) => ({ ...m, ttl: m.ttl - 1 }));
    for (const m of mounds) if (m.ttl <= 0) next[Math.floor(m.index / n)][m.index % n] = null;
    mounds = mounds.filter((m) => m.ttl > 0);

    const cells = toCells(next, markers);
    const winsFor = (i: number) =>
        (["X", "O"] as const).some((p) => {
            const board = cells.slice();
            board[i] = p;
            return lineOwner({ n, w: winLength, board, hist: EMPTY_HISTORY, rules: {} }) === p;
        });

    let dug = false;
    if (mole.warn !== null) {
        const r = Math.floor(mole.warn / n);
        const c = mole.warn % n;
        if (next[r][c] === null && !winsFor(mole.warn)) {
            next[r][c] = MOUND;
            cells[mole.warn] = "#";
            mounds.push({ index: mole.warn, ttl: MOLE.ttl });
            dug = true;
        }
    }

    let warn: number | null = null;
    if (moves >= MOLE.first - 1 && (moves - (MOLE.first - 1)) % MOLE.every === 0 && mounds.length < MOLE.max) {
        const free = cells.flatMap((v, i) => (v === null && !winsFor(i) ? [i] : []));
        if (free.length > 2) warn = pickRandom(free);
    }
    return { grid: next, mole: { mounds, warn, moves }, dug };
};
