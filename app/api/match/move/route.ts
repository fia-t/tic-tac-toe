import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { MatchConfigError, getMatchAdmin, json, preflight, requireUid } from "@/app/lib/server/matchServer";
import { BOARD_SIZE, getOnlineGridWinner, isOnlineGridFull, type OnlineGameMode } from "@game/components/onlineGameLogic";
import { START_RATING, ratingDelta } from "@game/lib/rating";

// Хід у рейтинговому матчі. На відміну від "Гри з другом", тут хід пише лише сервер:
// перевіряє, що ходить саме цей гравець і в порожню клітинку, сам визначає переможця і
// в тій самій транзакції оновлює рейтинги обох (клієнтам Firestore rules дошку міняти не дають).
export const runtime = "nodejs";

const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

type Symbol = "X" | "O";

export const OPTIONS = (request: Request) => preflight(request);

export async function POST(request: Request) {
    try {
        const uid = await requireUid(request);
        if (!uid) return json(request, { error: "unauthorized" }, 401);
        const body = (await request.json().catch(() => ({}))) as { roomId?: unknown; index?: unknown };
        const roomId = typeof body.roomId === "string" ? body.roomId.toUpperCase() : "";
        const index = typeof body.index === "number" ? body.index : -1;
        if (!/^[A-Z0-9]{6}$/.test(roomId) || !Number.isInteger(index)) return json(request, { error: "bad_request" }, 400);

        const { db } = getMatchAdmin();
        const roomRef = db.collection("rooms").doc(roomId);

        const result = await db.runTransaction(async (tx) => {
            const snap = await tx.get(roomRef);
            if (!snap.exists) return { error: "not_found", status: 404 };
            const room = snap.data() as {
                rated?: boolean;
                gameMode: OnlineGameMode;
                board: (Symbol | null)[];
                currentPlayer: Symbol;
                status: string;
                players: Partial<Record<Symbol, { uid: string }>>;
                playerIds: Record<Symbol, string>;
                names: Record<Symbol, string>;
                score?: Record<Symbol, number>;
            };
            if (!room.rated) return { error: "not_rated", status: 400 };
            const symbol: Symbol | null = room.players.X?.uid === uid ? "X" : room.players.O?.uid === uid ? "O" : null;
            if (!symbol) return { error: "not_a_player", status: 403 };
            if (room.status !== "playing" || room.currentPlayer !== symbol) return { error: "not_your_turn", status: 409 };
            const size = BOARD_SIZE[room.gameMode];
            if (index < 0 || index >= size * size || room.board[index] !== null) return { error: "illegal_move", status: 409 };

            const board = room.board.slice();
            board[index] = symbol;
            const grid = Array.from({ length: size }, (_, row) => board.slice(row * size, row * size + size));
            const lineOwner = getOnlineGridWinner(grid, room.gameMode) as Symbol | null;
            const winner: Symbol | "draw" | null = lineOwner ?? (isOnlineGridFull(grid) ? "draw" : null);

            const update: Record<string, unknown> = {
                board,
                currentPlayer: symbol === "X" ? "O" : "X",
                winner,
                status: winner ? "finished" : "playing",
                lastActivity: FieldValue.serverTimestamp(),
                expiresAt: Timestamp.fromMillis(Date.now() + ROOM_TTL_MS),
            };

            if (winner) {
                // Рейтинги - поточні значення з колекції ratings (не знімок у кімнаті), щоб паралельні матчі не губили зміни.
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
                update.ratingDelta = delta;
                update.ratingsAfter = { X: current.X + delta.X, O: current.O + delta.O };
                if (winner !== "draw") update[`score.${winner}`] = (room.score?.[winner] ?? 0) + 1;
                tx.set(db.collection("gameLogs").doc(), {
                    mode: "friend-3x3",
                    outcome: winner === "draw" ? "draw" : winner === "X" ? "x_win" : "o_win",
                    createdAt: FieldValue.serverTimestamp(),
                });
            }
            tx.update(roomRef, update as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>);
            return { ok: true, status: 200 };
        });

        const { status, ...rest } = result;
        return json(request, rest, status);
    } catch (error) {
        if (error instanceof MatchConfigError) return json(request, { error: "not_configured" }, 503);
        console.error("match/move", error);
        return json(request, { error: "server_error" }, 500);
    }
}
