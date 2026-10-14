import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { MatchConfigError, getMatchAdmin, json, preflight, requireUid } from "@/app/lib/server/matchServer";
import { finishRated, type RatedRoom, type Side } from "@/app/lib/server/ratedFinish";
import { RATED_GRACE_MS } from "@game/lib/rating";

// Технічна перемога в рейтинговому матчі: той, чий хід, не встиг до turnDeadline (закрив гру,
// зник зі зв'язку чи просто не ходить) - перемога за суперником. Викликати може будь-хто з
// двох гравців; час перевіряє лише сервер, тож поспішний годинник клієнта нічого не дасть.
export const runtime = "nodejs";

export const OPTIONS = (request: Request) => preflight(request);

export async function POST(request: Request) {
    try {
        const uid = await requireUid(request);
        if (!uid) return json(request, { error: "unauthorized" }, 401);
        const body = (await request.json().catch(() => ({}))) as { roomId?: unknown };
        const roomId = typeof body.roomId === "string" ? body.roomId.toUpperCase() : "";
        if (!/^[A-Z0-9]{6}$/.test(roomId)) return json(request, { error: "bad_request" }, 400);

        const { db } = getMatchAdmin();
        const roomRef = db.collection("rooms").doc(roomId);

        const result = await db.runTransaction(async (tx) => {
            const snap = await tx.get(roomRef);
            if (!snap.exists) return { error: "not_found", status: 404 };
            const room = snap.data() as RatedRoom & { turnDeadline?: Timestamp | null };
            if (!room.rated) return { error: "not_rated", status: 400 };
            const isPlayer = room.players.X?.uid === uid || room.players.O?.uid === uid;
            if (!isPlayer) return { error: "not_a_player", status: 403 };
            if (room.status !== "playing") return { ok: true, status: 200 };
            const deadline = room.turnDeadline?.toMillis?.();
            if (typeof deadline !== "number") return { error: "no_deadline", status: 409 };
            const left = deadline + RATED_GRACE_MS - Date.now();
            if (left > 0) return { error: "too_early", retryInMs: left, status: 409 };

            const winner: Side = room.currentPlayer === "X" ? "O" : "X";
            const update = await finishRated(tx, db, room, winner);
            tx.update(roomRef, {
                ...update,
                forfeit: room.currentPlayer,
                lastActivity: FieldValue.serverTimestamp(),
            } as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>);
            return { ok: true, status: 200 };
        });

        const { status, ...rest } = result;
        return json(request, rest, status);
    } catch (error) {
        if (error instanceof MatchConfigError) return json(request, { error: "not_configured" }, 503);
        console.error("match/forfeit", error);
        return json(request, { error: "server_error" }, 500);
    }
}
