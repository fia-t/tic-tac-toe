import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { createPublicKey, verify, type KeyObject } from "node:crypto";
import { NextResponse } from "next/server";

// Спільне для /api/match/*: Admin SDK з service account, CORS для білдів гри на інших
// доменах (портал, агрегатори), перевірка токенів гравця (Firebase і QS Play).
//
// Env (Vercel -> Settings -> Environment Variables, лише сервер):
//   FIREBASE_SERVICE_ACCOUNT - JSON ключа service account (той самий, що секрет у GitHub Actions)
//   MATCH_ALLOWED_ORIGINS    - необов'язково, додаткові origin через кому (напр. CDN порталу)
//   QS_PUBLIC_KEY_URL        - необов'язково, за замовчуванням https://play.quartsoft.com/publicKey.json

export class MatchConfigError extends Error {}

const APP_NAME = "match";

export const getMatchAdmin = () => {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new MatchConfigError("FIREBASE_SERVICE_ACCOUNT is not set");
    // Окремий іменований app: маршрут білду ініціалізує default app без облікових даних.
    const app = getApps().find((item) => item.name === APP_NAME) ?? initializeApp({ credential: cert(JSON.parse(raw)) }, APP_NAME);
    const databaseId = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID;
    return { auth: getAuth(app), db: databaseId ? getFirestore(app, databaseId) : getFirestore(app) };
};

// --- CORS ---

const ALLOWED_ORIGINS: RegExp[] = [
    /^https:\/\/([a-z0-9-]+\.)*quartsoft\.com$/,
    /^https:\/\/tic-tac-toe[a-z0-9-]*\.vercel\.app$/,
    /^https:\/\/([a-z0-9-]+\.)*(crazygames\.com|poki\.com|poki-gdn\.com|itch\.zone|itch\.io)$/,
    /^http:\/\/localhost(:\d+)?$/,
];

const isAllowedOrigin = (origin: string): boolean => {
    const extra = (process.env.MATCH_ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    return origin === site || extra.includes(origin) || ALLOWED_ORIGINS.some((pattern) => pattern.test(origin));
};

const corsHeaders = (request: Request): Record<string, string> => {
    const origin = request.headers.get("origin");
    if (!origin || !isAllowedOrigin(origin)) return {};
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
    };
};

export const json = (request: Request, body: unknown, status = 200) =>
    NextResponse.json(body, { status, headers: corsHeaders(request) });

export const preflight = (request: Request) => new NextResponse(null, { status: 204, headers: corsHeaders(request) });

// --- автентифікація ---

export const requireUid = async (request: Request): Promise<string | null> => {
    const idToken = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
    if (!idToken) return null;
    try {
        return (await getMatchAdmin().auth.verifyIdToken(idToken)).uid;
    } catch (error) {
        if (error instanceof MatchConfigError) throw error;
        return null;
    }
};

// Токен гравця QS Play (user.getUserToken): RS256, ключ - publicKey.json порталу.
// Перевіряємо лише на сервері; невдала перевірка = гравець вважається гостем.
let cachedKey: { key: KeyObject; at: number } | null = null;

const fetchPortalKey = async (force = false): Promise<KeyObject | null> => {
    if (!force && cachedKey && Date.now() - cachedKey.at < 3_600_000) return cachedKey.key;
    try {
        const url = process.env.QS_PUBLIC_KEY_URL || "https://play.quartsoft.com/publicKey.json";
        const res = await fetch(url, { cache: "no-store" });
        const { publicKey } = (await res.json()) as { publicKey?: string };
        if (!publicKey) return null;
        cachedKey = { key: createPublicKey(publicKey), at: Date.now() };
        return cachedKey.key;
    } catch {
        return null;
    }
};

export const verifyPortalToken = async (token: unknown): Promise<string | null> => {
    if (typeof token !== "string") return null;
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) return null;
    try {
        const head = JSON.parse(Buffer.from(header, "base64url").toString("utf8")) as { alg?: string };
        const body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { qsid?: unknown; exp?: unknown };
        if (head.alg !== "RS256" || typeof body.qsid !== "string" || typeof body.exp !== "number" || body.exp * 1000 < Date.now()) return null;
        const data = Buffer.from(`${header}.${payload}`);
        const sig = Buffer.from(signature, "base64url");
        // Ключ могли ротувати - при невдачі пробуємо ще раз зі свіжим.
        for (const force of [false, true]) {
            const key = await fetchPortalKey(force);
            if (key && verify("RSA-SHA256", data, key, sig)) return body.qsid;
        }
        return null;
    } catch {
        return null;
    }
};

export const ROOM_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const generateRoomId = (): string =>
    Array.from({ length: 6 }, () => ROOM_ID_ALPHABET[Math.floor(Math.random() * ROOM_ID_ALPHABET.length)]).join("");
