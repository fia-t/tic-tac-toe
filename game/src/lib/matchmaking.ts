"use client";
import { useSyncExternalStore } from "react";
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, type Unsubscribe } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@game/lib/firebase";
import { ensureAnonymousUser } from "@game/lib/onlineGame";
import { START_RATING } from "@game/lib/rating";

// Швидкий матч і рейтинг на клієнті. Черга, підбір і ходи рейтингових партій - на сервері
// сайту (app/api/match/*), тут лише запити до нього й читання черги/лідерборду з Firestore.

// Білд гри для порталу/агрегаторів живе на чужому домені - звертаємось до API сайту
// абсолютним URL. На самому сайті (Next.js, без GAME_TARGET) - відносним.
const API_BASE = process.env.GAME_TARGET ? (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "") : "";

// Портал: токен гравця QS Play, щоб рейтинг ішов за акаунтом, а не за браузером.
let portalToken: (() => Promise<string | null>) | null = null;
export const setPortalTokenProvider = (provider: () => Promise<string | null>): void => {
    portalToken = provider;
};

export class MatchUnavailableError extends Error {}

const call = async <T>(path: string, method: "POST" | "DELETE", body?: unknown): Promise<T> => {
    await ensureAnonymousUser();
    const idToken = await getFirebaseAuth().currentUser?.getIdToken();
    if (!idToken) throw new MatchUnavailableError("no auth");
    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: { authorization: `Bearer ${idToken}`, "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    }).catch(() => null);
    // Немає мережі, сервер не налаштований (503), маршрут ще не задеплоєно (404) чи збій - "недоступно".
    if (!res || res.status === 404 || res.status >= 500) throw new MatchUnavailableError(res ? String(res.status) : "network");
    const data = (await res.json().catch(() => null)) as T | null;
    if (data === null) throw new MatchUnavailableError("bad response");
    return data;
};

export type QueueResponse = { status: "waiting" | "matched"; roomId?: string; rating?: number; playerId?: string; games?: number };

export const joinQueue = async (name: string): Promise<QueueResponse> => {
    const qsToken = portalToken ? await portalToken().catch(() => null) : null;
    const response = await call<QueueResponse>("/api/match/queue", "POST", { name, qsToken });
    if (typeof response.rating === "number" && response.playerId) {
        // Старий сервер без games - лишаємо те, що вже відомо.
        const played = typeof response.games === "number" ? response.games > 0 : myRating.played;
        rememberRating(response.playerId, response.rating, played);
    }
    return response;
};

export const cancelQueue = async (): Promise<void> => {
    await call("/api/match/queue", "DELETE").catch(() => undefined);
};

// Свій запис у черзі - щоб одразу дізнатися, що суперник знайшов нас (а не чекати наступного POST).
export const watchQueue = async (callback: (roomId: string) => void): Promise<Unsubscribe> => {
    const uid = await ensureAnonymousUser();
    return onSnapshot(
        doc(getFirebaseDb(), "matchQueue", uid),
        (snap) => {
            if (snap.exists() && snap.get("status") === "matched" && typeof snap.get("roomId") === "string") callback(snap.get("roomId"));
        },
        () => undefined
    );
};

export const ratedMove = (roomId: string, index: number): Promise<{ ok?: boolean; error?: string }> =>
    call("/api/match/move", "POST", { roomId, index });

// Час на хід вийшов - попросити сервер зарахувати технічну перемогу (сервер сам перевіряє час).
export const claimTimeout = (roomId: string): Promise<{ ok?: boolean; error?: string; retryInMs?: number }> =>
    call("/api/match/forfeit", "POST", { roomId });

export type LeaderboardRow = { playerId: string; name: string; rating: number; games: number; wins: number };

export const fetchLeaderboard = async (size = 20): Promise<LeaderboardRow[]> => {
    const snap = await getDocs(query(collection(getFirebaseDb(), "ratings"), orderBy("rating", "desc"), limit(size)));
    return snap.docs.map((d) => ({
        playerId: d.id,
        name: String(d.get("name") ?? "Player"),
        rating: Number(d.get("rating") ?? START_RATING),
        games: Number(d.get("games") ?? 0),
        wins: Number(d.get("wins") ?? 0),
    }));
};

// --- власний рейтинг (останнє відоме значення; джерело правди - колекція ratings на сервері) ---

// played - чи зіграно хоч один рейтинговий матч: до першого гравець у лізі "Дерево",
// хоч стартовий рейтинг і вищий за її межу (див. displayLeague у rating.ts).
type MyRating = { playerId: string | null; rating: number; played: boolean };
const RATING_KEY = "ttt-rating";

const readRating = (): MyRating => {
    try {
        const raw = typeof localStorage !== "undefined" ? localStorage.getItem(RATING_KEY) : null;
        const parsed = raw ? (JSON.parse(raw) as Partial<MyRating>) : null;
        const rating = typeof parsed?.rating === "number" ? parsed.rating : START_RATING;
        // Старі записи без played: рейтинг, відмінний від стартового, - уже грав.
        const played = typeof parsed?.played === "boolean" ? parsed.played : rating !== START_RATING;
        return { playerId: typeof parsed?.playerId === "string" ? parsed.playerId : null, rating, played };
    } catch {
        return { playerId: null, rating: START_RATING, played: false };
    }
};

let myRating: MyRating = readRating();
const EMPTY: MyRating = { playerId: null, rating: START_RATING, played: false };
const listeners = new Set<() => void>();

export const rememberRating = (playerId: string, rating: number, played: boolean): void => {
    if (myRating.playerId === playerId && myRating.rating === rating && myRating.played === played) return;
    myRating = { playerId, rating, played };
    try {
        localStorage.setItem(RATING_KEY, JSON.stringify(myRating));
    } catch {
        // Сховище недоступне - значення живе до перезавантаження.
    }
    listeners.forEach((listener) => listener());
};

export const useMyRating = (): MyRating =>
    useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        () => myRating,
        () => EMPTY
    );
