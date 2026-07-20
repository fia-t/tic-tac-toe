"use client";
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, Timestamp, where } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/app/lib/firebase";

// Режими гри, за якими рахуються партії в адмінському дашборді.
export type GameMode = "ai-easy" | "ai-hard" | "friend-3x3" | "friend-5x5";

// Для ai-* - результат з погляду гравця ("win" | "lose" | "draw").
// Для friend-* - хто забрав партію ("x_win" | "o_win" | "draw"), бо в онлайн-грі
// немає єдиного "гравця", з чийого погляду вважати перемогу/поразку.
export type GameOutcome = "win" | "lose" | "draw" | "x_win" | "o_win";

export type GameLogEntry = {
    id: string;
    mode: GameMode;
    outcome: GameOutcome;
    createdAt: Timestamp | null;
};

const gameLogsCollection = "gameLogs";

// Найкраще зусилля, як trackEvent - лічильник у дашборді ніколи не повинен
// ламати чи сповільнювати саму гру. Не потребує автентифікації (правила
// перевіряють лише форму документа), щоб офлайн vs-AI режим не тягнув за
// собою анонімний вхід.
export const logGameResult = (mode: GameMode, outcome: GameOutcome): void => {
    if (!isFirebaseConfigured) return;
    void addDoc(collection(getFirebaseDb(), gameLogsCollection), {
        mode,
        outcome,
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
            createdAt: (data.createdAt as Timestamp) ?? null,
        };
    });
};
