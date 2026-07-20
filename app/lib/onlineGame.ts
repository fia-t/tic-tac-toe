"use client";
import {
    doc,
    collection,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    runTransaction,
    serverTimestamp,
    Timestamp,
    Unsubscribe,
} from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDb, trackEvent } from "@/app/lib/firebase";
import { getActiveThemes, pickRandomTheme } from "@/app/lib/themes";
import { getActiveNames, pickTwoDistinctNames } from "@/app/lib/names";
import {
    OnlineGameMode,
    BOARD_SIZE,
    getOnlineGridWinner,
    isOnlineGridFull,
} from "@/app/components/onlineGameLogic";

export type PlayerSymbol = "X" | "O";
export type RoomStatus = "waiting" | "playing" | "finished";

export type RoomPlayer = {
    uid: string;
    lastSeen: Timestamp | null;
};

// Знімок вибраної для цієї кімнати теми (фон + скіни X/O) - записується один
// раз при створенні кімнати, щоб обидва гравці бачили ідентичний вигляд
// протягом усієї партії, незалежно від подальших змін у каталозі тем.
export type RoomTheme = {
    backgroundUrl: string;
    xMarkerUrl: string;
    oMarkerUrl: string;
};

// Знімок випадкових "цікавих" імен гравців - так само, як і тема, обирається
// один раз при створенні кімнати, щоб обидва гравці бачили однакові імена
// на табло рахунку протягом усієї сесії (включно з реваншами).
export type RoomNames = {
    X: string;
    O: string;
};

// Firestore не підтримує масив масивів, тож поле зберігається "плоским"
// рядком-масивом (row-major) і розгортається у 2D-сітку лише на клієнті.
export type RoomDoc = {
    roomId: string;
    gameMode: OnlineGameMode;
    board: (string | null)[];
    currentPlayer: PlayerSymbol;
    players: Partial<Record<PlayerSymbol, RoomPlayer>>;
    winner: PlayerSymbol | "draw" | null;
    status: RoomStatus;
    leftPlayer: PlayerSymbol | null;
    rematch: Record<PlayerSymbol, boolean>;
    createdAt: Timestamp | null;
    lastActivity: Timestamp | null;
    expiresAt: Timestamp | null;
    theme: RoomTheme;
    names: RoomNames;
    // Рахунок перемог по символах, накопичується протягом усіх реваншів у кімнаті
    // (нічия рахунок не змінює - так само, як і в табло vs-AI режимів).
    score: Record<PlayerSymbol, number>;
};

const ROOM_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // без 0/O/1/I, щоб не плутати на слух/оком
const ROOM_ID_LENGTH = 6;
const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

const roomsCollection = "rooms";

const generateRoomId = (): string =>
    Array.from({ length: ROOM_ID_LENGTH }, () => ROOM_ID_ALPHABET[Math.floor(Math.random() * ROOM_ID_ALPHABET.length)]).join("");

export const ensureAnonymousUser = (): Promise<string> => {
    const auth = getFirebaseAuth();
    if (auth.currentUser) return Promise.resolve(auth.currentUser.uid);

    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(
            auth,
            (user) => {
                unsubscribe();
                if (user) {
                    resolve(user.uid);
                    return;
                }
                signInAnonymously(auth)
                    .then((credential) => resolve(credential.user.uid))
                    .catch(reject);
            },
            reject
        );
    });
};

const expiresAtTimestamp = () => Timestamp.fromMillis(Date.now() + ROOM_TTL_MS);

export const createRoom = async (gameMode: OnlineGameMode): Promise<{ roomId: string; symbol: PlayerSymbol }> => {
    const uid = await ensureAnonymousUser();
    const db = getFirebaseDb();

    // Тема обирається один раз тут і записується знімком у кімнату (не
    // themeId), щоб гра лишалась однаковою для обох гравців, навіть якщо
    // адмін пізніше змінить/вимкне цю тему в каталозі.
    const activeThemes = await getActiveThemes();
    const theme = pickRandomTheme(activeThemes);

    // Так само - два різні "цікаві" імена обираються один раз і фіксуються
    // знімком у кімнаті.
    const activeNames = await getActiveNames();
    const [nameX, nameO] = pickTwoDistinctNames(activeNames);

    for (let attempt = 0; attempt < 5; attempt++) {
        const roomId = generateRoomId();
        const ref = doc(db, roomsCollection, roomId);
        const existing = await getDoc(ref);
        if (existing.exists()) continue;

        const size = BOARD_SIZE[gameMode];
        await setDoc(ref, {
            roomId,
            gameMode,
            board: Array(size * size).fill(null),
            currentPlayer: "X",
            players: { X: { uid, lastSeen: Timestamp.now() } },
            winner: null,
            status: "waiting",
            leftPlayer: null,
            rematch: { X: false, O: false },
            createdAt: serverTimestamp(),
            lastActivity: serverTimestamp(),
            expiresAt: expiresAtTimestamp(),
            theme: {
                backgroundUrl: theme.backgroundUrl,
                xMarkerUrl: theme.xMarkerUrl,
                oMarkerUrl: theme.oMarkerUrl,
            },
            names: { X: nameX, O: nameO },
            score: { X: 0, O: 0 },
        });
        trackEvent("online_room_created", { gameMode });
        return { roomId, symbol: "X" };
    }

    throw new Error("Не вдалося створити кімнату, спробуйте ще раз.");
};

export class RoomNotFoundError extends Error {}
export class RoomFullError extends Error {}

export const joinRoom = async (
    roomId: string
): Promise<{ symbol: PlayerSymbol; gameMode: OnlineGameMode }> => {
    const uid = await ensureAnonymousUser();
    const db = getFirebaseDb();
    const ref = doc(db, roomsCollection, roomId.toUpperCase());

    return runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new RoomNotFoundError("Кімнату не знайдено.");

        const room = snap.data() as RoomDoc;

        // Повернення гравця, що вже мав місце в кімнаті (оновив сторінку,
        // перепідключився після втрати мережі) - скидаємо позначку "покинув гру"
        // і оновлюємо heartbeat, а не лише мовчки повертаємо символ.
        const existingSymbol: PlayerSymbol | null =
            room.players.X?.uid === uid ? "X" : room.players.O?.uid === uid ? "O" : null;

        if (existingSymbol) {
            tx.update(ref, {
                [`players.${existingSymbol}.lastSeen`]: Timestamp.now(),
                leftPlayer: room.leftPlayer === existingSymbol ? null : room.leftPlayer,
                lastActivity: serverTimestamp(),
                expiresAt: expiresAtTimestamp(),
            });
            return { symbol: existingSymbol, gameMode: room.gameMode };
        }

        let symbol: PlayerSymbol;
        if (!room.players.X) symbol = "X";
        else if (!room.players.O) symbol = "O";
        else throw new RoomFullError("Кімната вже заповнена.");

        const nextStatus: RoomStatus = room.players.X && symbol === "O" ? "playing" : room.status;

        tx.update(ref, {
            [`players.${symbol}`]: { uid, lastSeen: Timestamp.now() },
            status: nextStatus,
            leftPlayer: null,
            lastActivity: serverTimestamp(),
            expiresAt: expiresAtTimestamp(),
        });

        if (symbol === "O") trackEvent("online_room_joined", { gameMode: room.gameMode });

        return { symbol, gameMode: room.gameMode };
    });
};

export const subscribeRoom = (roomId: string, callback: (room: RoomDoc | null) => void): Unsubscribe => {
    const db = getFirebaseDb();
    const ref = doc(db, roomsCollection, roomId.toUpperCase());
    return onSnapshot(ref, (snap) => callback(snap.exists() ? (snap.data() as RoomDoc) : null));
};

export const makeMove = async (
    roomId: string,
    cellIndex: number,
    symbol: PlayerSymbol,
    uid: string
): Promise<void> => {
    const db = getFirebaseDb();
    const ref = doc(db, roomsCollection, roomId.toUpperCase());

    await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) return;
        const room = snap.data() as RoomDoc;

        if (room.status !== "playing") return;
        if (room.currentPlayer !== symbol) return;
        if (room.players[symbol]?.uid !== uid) return;
        if (room.board[cellIndex] !== null) return;

        const nextBoard = room.board.slice();
        nextBoard[cellIndex] = symbol;

        const size = BOARD_SIZE[room.gameMode];
        const grid = Array.from({ length: size }, (_, row) => nextBoard.slice(row * size, row * size + size));
        const winningSymbol = getOnlineGridWinner(grid, room.gameMode);

        let winner: RoomDoc["winner"] = null;
        let status: RoomStatus = "playing";
        if (winningSymbol) {
            winner = winningSymbol as PlayerSymbol;
            status = "finished";
        } else if (isOnlineGridFull(grid)) {
            winner = "draw";
            status = "finished";
        }

        const scoreUpdate =
            winner && winner !== "draw"
                ? { [`score.${winner}`]: (room.score?.[winner] ?? 0) + 1 }
                : {};

        tx.update(ref, {
            board: nextBoard,
            currentPlayer: symbol === "X" ? "O" : "X",
            winner,
            status,
            lastActivity: serverTimestamp(),
            expiresAt: expiresAtTimestamp(),
            ...scoreUpdate,
        });

        // Один запис на партію в gameLogs (для адмінського дашборду) - пишеться
        // в тій самій транзакції, що й визначає завершення гри, тож дублікатів
        // від двох клієнтів одночасно не буває.
        if (status === "finished") {
            const outcome = winner === "draw" ? "draw" : winner === "X" ? "x_win" : "o_win";
            const mode = room.gameMode === "5x5" ? "friend-5x5" : "friend-3x3";
            tx.set(doc(collection(db, "gameLogs")), {
                mode,
                outcome,
                createdAt: serverTimestamp(),
            });
        }
    });
};

export const requestRematch = async (roomId: string, symbol: PlayerSymbol): Promise<void> => {
    const db = getFirebaseDb();
    const ref = doc(db, roomsCollection, roomId.toUpperCase());

    await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) return;
        const room = snap.data() as RoomDoc;

        const rematch = { ...room.rematch, [symbol]: true };

        if (rematch.X && rematch.O) {
            const size = BOARD_SIZE[room.gameMode];
            tx.update(ref, {
                board: Array(size * size).fill(null),
                currentPlayer: "X",
                winner: null,
                status: "playing",
                leftPlayer: null,
                rematch: { X: false, O: false },
                lastActivity: serverTimestamp(),
                expiresAt: expiresAtTimestamp(),
            });
            trackEvent("online_rematch_started", { gameMode: room.gameMode });
        } else {
            tx.update(ref, { rematch, lastActivity: serverTimestamp(), expiresAt: expiresAtTimestamp() });
            trackEvent("online_rematch_requested", { gameMode: room.gameMode });
        }
    });
};

export const sendHeartbeat = async (roomId: string, symbol: PlayerSymbol): Promise<void> => {
    try {
        const db = getFirebaseDb();
        const ref = doc(db, roomsCollection, roomId.toUpperCase());
        await updateDoc(ref, {
            [`players.${symbol}.lastSeen`]: Timestamp.now(),
            lastActivity: serverTimestamp(),
            expiresAt: expiresAtTimestamp(),
        });
    } catch {
        // Кімнату могли вже видалити (TTL) - тиха відмова, UI сам покаже "кімнату не знайдено".
    }
};

export const leaveRoom = async (roomId: string, symbol: PlayerSymbol): Promise<void> => {
    try {
        const db = getFirebaseDb();
        const ref = doc(db, roomsCollection, roomId.toUpperCase());
        await updateDoc(ref, { leftPlayer: symbol, lastActivity: serverTimestamp() });
    } catch {
        // Best-effort сигнал - якщо не вдалось, інший гравець все одно побачить
        // відсутність через таймаут heartbeat.
    }
};

// Скільки часу без heartbeat вважати "гравець відключився": трохи більше
// за подвійний інтервал відправки (див. HEARTBEAT_INTERVAL_MS в OnlineBoard).
export const PRESENCE_TIMEOUT_MS = 20000;
