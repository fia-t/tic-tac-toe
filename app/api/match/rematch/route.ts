import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { MatchConfigError, getMatchAdmin, json, preflight, requireUid } from "@/app/lib/server/matchServer";
import { RATED_FIRST_TURN_MS, REMATCH_WAIT_MS } from "@game/lib/rating";
import { BOARD_SIZE, type OnlineGameMode } from "@game/components/onlineGameLogic";

// Реванш у рейтинговому матчі: ще одна рейтингова партія з тим самим суперником. Стартує,
// лише коли обидва гравці попросили реванш і суперник ще в кімнаті; першим ходить той, хто
// програв (після нічиї - той, хто минулого разу ходив другим). Пише лише сервер - клієнтам
// Firestore rules у рейтинговій кімнаті міняти дошку не дають.
export const runtime = "nodejs";

const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

type Side = "X" | "O";

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
            const room = snap.data() as {
                rated?: boolean;
                gameMode: OnlineGameMode;
                status: string;
                winner: Side | "draw" | null;
                players: Partial<Record<Side, { uid: string }>>;
                rematch?: Record<Side, boolean>;
                rematchAt?: Timestamp | null;
                leftPlayer?: Side | null;
                starter?: Side;
            };
            if (!room.rated) return { error: "not_rated", status: 400 };
            const symbol: Side | null = room.players.X?.uid === uid ? "X" : room.players.O?.uid === uid ? "O" : null;
            if (!symbol) return { error: "not_a_player", status: 403 };
            if (room.status !== "finished") return { error: "not_finished", status: 409 };
            const other: Side = symbol === "X" ? "O" : "X";
            if (room.leftPlayer === other) return { error: "opponent_left", status: 409 };

            const now = Timestamp.now();
            const prev = room.rematch ?? { X: false, O: false };
            // Запит суперника, якому понад REMATCH_WAIT_MS, уже не рахується.
            const fresh = room.rematchAt && now.toMillis() - room.rematchAt.toMillis() < REMATCH_WAIT_MS;
            const otherReady = Boolean(prev[other] && fresh);

            if (!otherReady) {
                tx.update(roomRef, {
                    rematch: { [symbol]: true, [other]: false },
                    rematchAt: now,
                    lastActivity: FieldValue.serverTimestamp(),
                    expiresAt: Timestamp.fromMillis(now.toMillis() + ROOM_TTL_MS),
                });
                return { ok: true, started: false, status: 200 };
            }

            const lastStarter: Side = room.starter ?? "X";
            const starter: Side = room.winner === "X" ? "O" : room.winner === "O" ? "X" : lastStarter === "X" ? "O" : "X";
            const size = BOARD_SIZE[room.gameMode];
            tx.update(roomRef, {
                board: Array(size * size).fill(null),
                currentPlayer: starter,
                starter,
                winner: null,
                status: "playing",
                rematch: { X: false, O: false },
                rematchAt: null,
                ratingDelta: null,
                forfeit: FieldValue.delete(),
                turnDeadline: Timestamp.fromMillis(now.toMillis() + RATED_FIRST_TURN_MS),
                lastActivity: FieldValue.serverTimestamp(),
                expiresAt: Timestamp.fromMillis(now.toMillis() + ROOM_TTL_MS),
            });
            return { ok: true, started: true, status: 200 };
        });

        const { status, ...rest } = result;
        return json(request, rest, status);
    } catch (error) {
        if (error instanceof MatchConfigError) return json(request, { error: "not_configured" }, 503);
        console.error("match/rematch", error);
        return json(request, { error: "server_error" }, 500);
    }
}
