"use client";
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, Timestamp, where } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured, isLocalDev } from "@game/lib/firebase";
import { isEmbed } from "@game/lib/embed";

// Режими гри, за якими рахуються партії в адмінському дашборді.
export type GameMode = "ai-easy" | "ai-hard" | "ai-5x5" | "friend-3x3" | "friend-9x9" | "friend-5x5";

// Для ai-* - результат з погляду гравця ("win" | "lose" | "draw").
// Для friend-* - хто забрав партію ("x_win" | "o_win" | "draw"), бо в онлайн-грі
// немає єдиного "гравця", з чийого погляду вважати перемогу/поразку.
export type GameOutcome = "win" | "lose" | "draw" | "x_win" | "o_win";

// Звідки зіграна партія: "site" - Next.js-сайт, "embed" - гра в iframe на сторінці новини
// (app/embed), решта - ціль Vite-білду (GAME_TARGET: portal/crazygames/poki/itch).
// Старі записи поля не мають (null).
export type GameSource = "site" | "embed" | "portal" | "crazygames" | "poki" | "itch";

const buildSource: GameSource = (process.env.GAME_TARGET as GameSource | undefined) ?? "site";
export const currentGameSource = (): GameSource => (isEmbed() ? "embed" : buildSource);

// Пристрій: "mobile" - телефон чи планшет, "desktop" - ноутбук/ПК. Старі записи поля не мають (null).
export type GameDevice = "mobile" | "desktop";

// За userAgent (у т.ч. в iframe новини). iPad у Safari видає себе за Mac - його ловимо за сенсорним екраном.
const getDevice = (): GameDevice | null => {
    try {
        const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
        if (nav.userAgentData?.mobile) return "mobile";
        if (/Mobi|Android|iPhone|iPad|iPod/i.test(nav.userAgent)) return "mobile";
        if (/Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1) return "mobile";
        return "desktop";
    } catch {
        return null;
    }
};

export type GameLogEntry = {
    id: string;
    mode: GameMode;
    outcome: GameOutcome;
    source: GameSource | null;
    // Анонімний ID пристрою (браузера) - щоб рахувати людей, а не лише партії.
    // Старі записи поля не мають (null).
    player: string | null;
    device: GameDevice | null;
    createdAt: Timestamp | null;
};

const gameLogsCollection = "gameLogs";

const PLAYER_KEY = "ttt-player-id";
let memoryPlayerId: string | null = null;

// Випадковий ID, що живе в localStorage. Якщо сховище недоступне (приватне вікно,
// сторонній iframe у Safari) - ID лише на цю сесію сторінки. Будь-яка помилка -
// null, і лог пишеться без поля, як раніше.
const getPlayerId = (): string | null => {
    try {
        if (memoryPlayerId) return memoryPlayerId;
        try {
            const saved = window.localStorage.getItem(PLAYER_KEY);
            if (saved) return (memoryPlayerId = saved);
        } catch {
            // сховище недоступне - нижче ID лише в пам'яті
        }
        const id =
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
        memoryPlayerId = id;
        try {
            window.localStorage.setItem(PLAYER_KEY, id);
        } catch {
            // див. вище
        }
        return id;
    } catch {
        return null;
    }
};

// Найкраще зусилля, як trackEvent - лічильник у дашборді ніколи не повинен
// ламати чи сповільнювати саму гру. Не потребує автентифікації (правила
// перевіряють лише форму документа), щоб офлайн vs-AI режим не тягнув за
// собою анонімний вхід.
export const logGameResult = (mode: GameMode, outcome: GameOutcome): void => {
    if (!isFirebaseConfigured || isLocalDev) return;
    const player = getPlayerId();
    const device = getDevice();
    void addDoc(collection(getFirebaseDb(), gameLogsCollection), {
        mode,
        outcome,
        source: currentGameSource(),
        ...(player ? { player } : {}),
        ...(device ? { device } : {}),
        createdAt: serverTimestamp(),
    }).catch(() => {
        // тихо ігноруємо - див. коментар вище
    });
};

// Адмінська вибірка за період [start, end] - доступ лише isAdmin() у Security Rules.
export const getGameLogsInRange = async (start: Date, end: Date): Promise<GameLogEntry[]> => {
    const db = getFirebaseDb();
    const q = query(
        collection(db, gameLogsCollection),
        where("createdAt", ">=", Timestamp.fromDate(start)),
        where("createdAt", "<=", Timestamp.fromDate(end)),
        orderBy("createdAt", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id,
            mode: data.mode as GameMode,
            outcome: data.outcome as GameOutcome,
            source: (data.source as GameSource | undefined) ?? null,
            player: typeof data.player === "string" ? data.player : null,
            device: data.device === "mobile" || data.device === "desktop" ? data.device : null,
            createdAt: (data.createdAt as Timestamp) ?? null,
        };
    });
};
