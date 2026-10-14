// Рейтинг швидких матчів (Elo) і ліги. Чиста логіка без браузерних API - її використовує
// і сервер (app/api/match/*), і гра (ліга в профілі, лідерборд).

export const START_RATING = 1000;
const K_FACTOR = 32;

export const expectedScore = (rating: number, opponent: number): number => 1 / (1 + 10 ** ((opponent - rating) / 400));

// score: 1 - перемога, 0.5 - нічия, 0 - поразка.
export const ratingDelta = (rating: number, opponent: number, score: 0 | 0.5 | 1): number =>
    Math.round(K_FACTOR * (score - expectedScore(rating, opponent)));

export type League = "wood" | "bronze" | "silver" | "gold" | "diamond";

export const LEAGUES: { id: League; min: number }[] = [
    { id: "wood", min: 0 },
    { id: "bronze", min: 900 },
    { id: "silver", min: 1100 },
    { id: "gold", min: 1300 },
    { id: "diamond", min: 1500 },
];

export const leagueFor = (rating: number): League =>
    [...LEAGUES].reverse().find((league) => rating >= league.min)?.id ?? "wood";

// Наскільки далекий за рейтингом суперник підходить: що довше гравець у черзі, то ширше вікно.
export const matchWindow = (waitedMs: number): number => Math.min(600, 150 + 25 * Math.floor(waitedMs / 1000));

// Час на хід у рейтинговому матчі. Не встиг (чи закрив гру) - перемога за суперником.
// Перший хід - трохи довше: обом ще треба завантажити кімнату.
export const RATED_TURN_MS = 30_000;
export const RATED_FIRST_TURN_MS = 40_000;
// Запас на мережу: хід, відправлений в останню мить, ще приймається, а технічна поразка -
// лише після цього запасу.
export const RATED_GRACE_MS = 1_500;
