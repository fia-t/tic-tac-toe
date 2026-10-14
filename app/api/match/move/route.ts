import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { MatchConfigError, getMatchAdmin, json, preflight, requireUid } from "@/app/lib/server/matchServer";
import { BOARD_SIZE, getOnlineGridWinner, isOnlineGridFull, type OnlineGameMode } from "@game/components/onlineGameLogic";
import { RATED_GRACE_MS, RATED_TURN_MS } from "@game/lib/rating";
import { finishRated } from "@/app/lib/server/ratedFinish";

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
                turnDeadline?: Timestamp | null;
            };
            if (!room.rated) return { error: "not_rated", status: 400 };
            const symbol: Symbol | null = room.players.X?.uid === uid ? "X" : room.players.O?.uid === uid ? "O" : null;
            if (!symbol) return { error: "not_a_player", status: 403 };
            if (room.status !== "playing" || room.currentPlayer !== symbol) return { error: "not_your_turn", status: 409 };
            const deadline = room.turnDeadline?.toMillis?.();
            if (typeof deadline === "number" && Date.now() > deadline + RATED_GRACE_MS) return { error: "time_out", status: 409 };
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

            // Наступному гравцю - свіжий час на хід; після кінця партії дедлайн знімається.
            if (winner) Object.assign(update, await finishRated(tx, db, room, winner));
            else update.turnDeadline = Timestamp.fromMillis(Date.now() + RATED_TURN_MS);
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
