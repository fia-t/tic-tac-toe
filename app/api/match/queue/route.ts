import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { MatchConfigError, generateRoomId, getMatchAdmin, json, preflight, requireUid, verifyPortalToken } from "@/app/lib/server/matchServer";
import { RATED_FIRST_TURN_MS, START_RATING, matchWindow } from "@game/lib/rating";

// Швидкий матч: черга й підбір суперника. Підбір - лише тут, на сервері (клієнти в
// matchQueue не пишуть), тому двоє не "заберуть" того самого суперника.
//
// POST   - стати в чергу або оновити свій запис (клієнт повторює раз на ~10 с, це ж "я ще тут").
//          Якщо є підходящий суперник - одразу створюється кімната, відповідь { status: "matched", roomId }.
// DELETE - вийти з черги.
export const runtime = "nodejs";

const QUEUE = "matchQueue";
const RATINGS = "ratings";
const ROOMS = "rooms";
// Запис у черзі без оновлення довше за це - гравець, найпевніше, закрив гру.
const STALE_MS = 25_000;
const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
const MODE = "3x3";

type QueueEntry = {
    uid: string;
    playerId: string;
    name: string;
    rating: number;
    mode: string;
    status: "waiting" | "matched";
    roomId: string | null;
    createdAt: Timestamp;
    heartbeatAt: Timestamp;
};

const cleanName = (value: unknown): string =>
    typeof value === "string" && value.trim() ? value.trim().slice(0, 40) : "Player";

const classicTheme = () => {
    const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://tic-tac-toe-kappa-taupe.vercel.app").replace(/\/$/, "");
    return {
        backgroundUrl: `${site}/images/themes/classic-board.svg`,
        xMarkerUrl: `${site}/images/themes/classic-x.svg`,
        oMarkerUrl: `${site}/images/themes/classic-o.svg`,
    };
};

const handle = async (request: Request, action: () => Promise<Response>) => {
    try {
        return await action();
    } catch (error) {
        if (error instanceof MatchConfigError) return json(request, { error: "not_configured" }, 503);
        console.error("match/queue", error);
        return json(request, { error: "server_error" }, 500);
    }
};

export const OPTIONS = (request: Request) => preflight(request);

export const POST = (request: Request) =>
    handle(request, async () => {
        const uid = await requireUid(request);
        if (!uid) return json(request, { error: "unauthorized" }, 401);
        const body = (await request.json().catch(() => ({}))) as { name?: unknown; qsToken?: unknown };
        const qsid = await verifyPortalToken(body.qsToken);
        // Рейтинг прив'язаний до акаунта QS Play, якщо гравець увійшов на порталі, інакше - до анонімного входу.
        const playerId = qsid ? `qs_${qsid}` : `anon_${uid}`;
        const name = cleanName(body.name);
        const { db } = getMatchAdmin();
        const ratingSnap = await db.collection(RATINGS).doc(playerId).get();
        const rating = typeof ratingSnap.get("rating") === "number" ? (ratingSnap.get("rating") as number) : START_RATING;
        const myRef = db.collection(QUEUE).doc(uid);

        const result = await db.runTransaction(async (tx) => {
            const mine = await tx.get(myRef);
            const now = Timestamp.now();
            // Уже знайдено пару (поки гравець не встиг побачити) - віддаємо ту саму кімнату.
            // Старий "matched" запис (минулий матч, клієнт не прибрав) - ігноруємо й стаємо в чергу заново.
            const heartbeat = mine.exists ? (mine.get("heartbeatAt") as Timestamp | undefined) : undefined;
            if (mine.exists && mine.get("status") === "matched" && heartbeat && now.toMillis() - heartbeat.toMillis() < 60_000) {
                return { status: "matched", roomId: mine.get("roomId") as string };
            }

            const candidates = await tx.get(
                db.collection(QUEUE).where("mode", "==", MODE).where("status", "==", "waiting").orderBy("createdAt").limit(20)
            );
            const opponent = candidates.docs
                .map((doc) => ({ ref: doc.ref, data: doc.data() as QueueEntry }))
                .find(({ data }) => {
                    if (data.uid === uid || data.playerId === playerId) return false;
                    if (now.toMillis() - data.heartbeatAt.toMillis() > STALE_MS) return false;
                    return Math.abs(data.rating - rating) <= matchWindow(now.toMillis() - data.createdAt.toMillis());
                });

            if (!opponent) {
                tx.set(myRef, {
                    uid,
                    playerId,
                    name,
                    rating,
                    mode: MODE,
                    status: "waiting",
                    roomId: null,
                    createdAt: mine.exists && mine.get("status") === "waiting" ? mine.get("createdAt") : now,
                    heartbeatAt: now,
                });
                return { status: "waiting" };
            }

            // Кімната - у тому ж форматі, що й "Гра з другом", плюс rated-поля. Ходить першим той, хто чекав довше.
            let roomRef = db.collection(ROOMS).doc(generateRoomId());
            for (let attempt = 0; attempt < 3 && (await tx.get(roomRef)).exists; attempt++) roomRef = db.collection(ROOMS).doc(generateRoomId());
            const other = opponent.data;
            tx.set(roomRef, {
                roomId: roomRef.id,
                gameMode: MODE,
                board: Array(9).fill(null),
                currentPlayer: "X",
                players: { X: { uid: other.uid, lastSeen: now }, O: { uid, lastSeen: now } },
                winner: null,
                status: "playing",
                leftPlayer: null,
                rematch: { X: false, O: false },
                createdAt: FieldValue.serverTimestamp(),
                lastActivity: FieldValue.serverTimestamp(),
                expiresAt: Timestamp.fromMillis(now.toMillis() + ROOM_TTL_MS),
                theme: classicTheme(),
                names: { X: other.name, O: name },
                score: { X: 0, O: 0 },
                rated: true,
                playerIds: { X: other.playerId, O: playerId },
                ratings: { X: other.rating, O: rating },
                ratingDelta: null,
                turnDeadline: Timestamp.fromMillis(now.toMillis() + RATED_FIRST_TURN_MS),
            });
            tx.update(opponent.ref, { status: "matched", roomId: roomRef.id });
            tx.set(myRef, { uid, playerId, name, rating, mode: MODE, status: "matched", roomId: roomRef.id, createdAt: now, heartbeatAt: now });
            return { status: "matched", roomId: roomRef.id };
        });

        return json(request, { ...result, rating, playerId });
    });

export const DELETE = (request: Request) =>
    handle(request, async () => {
        const uid = await requireUid(request);
        if (!uid) return json(request, { error: "unauthorized" }, 401);
        const { db } = getMatchAdmin();
        await db.collection(QUEUE).doc(uid).delete();
        return json(request, { status: "cancelled" });
    });
