import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";
import { START_RATING, ratingDelta } from "@game/lib/rating";

// Завершення рейтингової партії - спільне для звичайного ходу (/api/match/move) і
// технічної перемоги за часом (/api/match/forfeit). Рейтинги - поточні значення з колекції
// ratings (не знімок у кімнаті), щоб паралельні матчі не губили зміни.

export type Side = "X" | "O";

export type RatedRoom = {
    rated?: boolean;
    status: string;
    currentPlayer: Side;
    players: Partial<Record<Side, { uid: string }>>;
    playerIds: Record<Side, string>;
    names: Record<Side, string>;
    score?: Record<Side, number>;
};

// Читає рейтинги (у транзакції читання мають іти до записів), пише нові рейтинги й лог,
// повертає поля для оновлення кімнати.
export const finishRated = async (tx: Transaction, db: Firestore, room: RatedRoom, winner: Side | "draw"): Promise<Record<string, unknown>> => {
    const refs = { X: db.collection("ratings").doc(room.playerIds.X), O: db.collection("ratings").doc(room.playerIds.O) };
    const [xSnap, oSnap] = await Promise.all([tx.get(refs.X), tx.get(refs.O)]);
    const current = {
        X: typeof xSnap.get("rating") === "number" ? (xSnap.get("rating") as number) : START_RATING,
        O: typeof oSnap.get("rating") === "number" ? (oSnap.get("rating") as number) : START_RATING,
    };
    const scoreX: 0 | 0.5 | 1 = winner === "draw" ? 0.5 : winner === "X" ? 1 : 0;
    const delta = {
        X: ratingDelta(current.X, current.O, scoreX),
        O: ratingDelta(current.O, current.X, (1 - scoreX) as 0 | 0.5 | 1),
    };
    for (const side of ["X", "O"] as const) {
        const prev = side === "X" ? xSnap : oSnap;
        const result = winner === "draw" ? "draws" : winner === side ? "wins" : "losses";
        tx.set(refs[side], {
            playerId: room.playerIds[side],
            name: room.names[side],
            rating: current[side] + delta[side],
            games: ((prev.get("games") as number) ?? 0) + 1,
            wins: ((prev.get("wins") as number) ?? 0) + (result === "wins" ? 1 : 0),
            draws: ((prev.get("draws") as number) ?? 0) + (result === "draws" ? 1 : 0),
            losses: ((prev.get("losses") as number) ?? 0) + (result === "losses" ? 1 : 0),
            updatedAt: FieldValue.serverTimestamp(),
        });
    }
    tx.set(db.collection("gameLogs").doc(), {
        mode: "friend-3x3",
        outcome: winner === "draw" ? "draw" : winner === "X" ? "x_win" : "o_win",
        createdAt: FieldValue.serverTimestamp(),
    });
    const update: Record<string, unknown> = {
        winner,
        status: "finished",
        turnDeadline: null,
        ratingDelta: delta,
        ratingsAfter: { X: current.X + delta.X, O: current.O + delta.O },
    };
    if (winner !== "draw") update[`score.${winner}`] = (room.score?.[winner] ?? 0) + 1;
    return update;
};
