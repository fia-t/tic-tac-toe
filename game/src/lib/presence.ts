"use client";
import { useSyncExternalStore } from "react";
import {
    Timestamp,
    collection,
    deleteDoc,
    doc,
    getCountFromServer,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    where,
    type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@game/lib/firebase";
import { ensureAnonymousUser } from "@game/lib/onlineGame";

// Хто зараз у грі (як у прототипі - "Зараз онлайн: N") і хто шукає суперника в "Швидкому
// матчі" - щоб іншим гравцям у меню запропонувати зіграти. Кожен клієнт раз на HEARTBEAT_MS
// оновлює свій документ presence/{uid}; "онлайн" - ті, хто відмічався за останні ONLINE_MS.
// Лише поки вкладка на екрані: у фоні відмітки не йдуть, і гравець сам випадає з онлайну.

const COLLECTION = "presence";
const HEARTBEAT_MS = 30_000;
const ONLINE_MS = 75_000;
// Документ живе добу після останньої відмітки - для TTL-політики Firestore (прибирання).
const EXPIRES_MS = 24 * 3_600_000;

export type Seeker = { uid: string; name: string };
type Snapshot = { online: number | null; searching: number; seekers: Seeker[]; me: string | null };

let snapshot: Snapshot = { online: null, searching: 0, seekers: [], me: null };
const listeners = new Set<() => void>();
const emit = (next: Partial<Snapshot>) => {
    snapshot = { ...snapshot, ...next };
    listeners.forEach((listener) => listener());
};

// Стан гравця, який іде в документ: екран (меню чи партія), чи шукає суперника, ім'я.
let local = { screen: "menu" as "menu" | "game", searching: false, name: "" };
let uid: string | null = null;
let started = false;
let heartbeat: ReturnType<typeof setInterval> | null = null;
let seekersUnsub: Unsubscribe | null = null;
let allSeekers: (Seeker & { lastSeen: number })[] = [];

const write = async () => {
    if (!uid || (typeof document !== "undefined" && document.hidden)) return;
    try {
        await setDoc(doc(getFirebaseDb(), COLLECTION, uid), {
            lastSeen: serverTimestamp(),
            expiresAt: Timestamp.fromMillis(Date.now() + EXPIRES_MS),
            screen: local.screen,
            searching: local.searching,
            name: local.name.slice(0, 40),
        });
    } catch {
        // Присутність - не критична: збій мережі чи правил не повинен заважати грі.
    }
};

const recount = async () => {
    if (!uid || (typeof document !== "undefined" && document.hidden)) return;
    try {
        const since = Timestamp.fromMillis(Date.now() - ONLINE_MS);
        const res = await getCountFromServer(query(collection(getFirebaseDb(), COLLECTION), where("lastSeen", ">", since)));
        emit({ online: Math.max(1, res.data().count) });
    } catch {
        // Лічильник просто не покажеться.
    }
};

// Свіжі з тих, хто шукає (документи без відмітки понад ONLINE_MS - уже пішли).
const refreshSeekers = () => {
    const now = Date.now();
    const fresh = allSeekers.filter((s) => now - s.lastSeen < ONLINE_MS);
    emit({ searching: fresh.length, seekers: fresh.filter((s) => s.uid !== uid).map(({ uid: id, name }) => ({ uid: id, name })) });
};

const tick = () => {
    void write();
    void recount();
    refreshSeekers();
};

export const startPresence = async (): Promise<void> => {
    if (started || !isFirebaseConfigured || typeof window === "undefined") return;
    started = true;
    try {
        uid = await ensureAnonymousUser();
    } catch {
        started = false;
        return;
    }
    emit({ me: uid });
    tick();
    heartbeat = setInterval(tick, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) tick();
    });
    window.addEventListener("pagehide", () => {
        if (uid) void deleteDoc(doc(getFirebaseDb(), COLLECTION, uid)).catch(() => undefined);
    });
    seekersUnsub = onSnapshot(
        query(collection(getFirebaseDb(), COLLECTION), where("searching", "==", true)),
        (snap) => {
            allSeekers = snap.docs.map((d) => {
                const data = d.data() as { name?: string; lastSeen?: Timestamp | null };
                // Свій щойно записаний документ приходить ще без серверного часу - вважаємо "зараз".
                return { uid: d.id, name: data.name || "", lastSeen: data.lastSeen ? data.lastSeen.toMillis() : Date.now() };
            });
            refreshSeekers();
        },
        () => undefined
    );
};

export const stopPresence = (): void => {
    if (heartbeat) clearInterval(heartbeat);
    seekersUnsub?.();
    heartbeat = null;
    seekersUnsub = null;
    started = false;
};

// Оновити свій стан; зміна "шукаю суперника" відразу записується (інші мають побачити її одразу).
export const setPresence = (next: Partial<typeof local>): void => {
    const changed = Object.entries(next).some(([key, value]) => local[key as keyof typeof local] !== value);
    local = { ...local, ...next };
    if (changed && started) {
        void write();
        if (next.searching !== undefined) refreshSeekers();
    }
};

export const usePresence = (): Snapshot =>
    useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        () => snapshot,
        () => snapshot
    );

// Запрошення "хтось шукає суперника" можна вимкнути в налаштуваннях (зручність одного
// гравця - localStorage).
const INVITES_KEY = "ttt-match-invites";
const inviteListeners = new Set<() => void>();
const readInvites = (): boolean => {
    try {
        return typeof localStorage === "undefined" || localStorage.getItem(INVITES_KEY) !== "0";
    } catch {
        return true;
    }
};
let invitesOn = readInvites();
export const setInvitesEnabled = (value: boolean): void => {
    invitesOn = value;
    try {
        localStorage.setItem(INVITES_KEY, value ? "1" : "0");
    } catch {
        // Сховище недоступне - вибір діє до перезавантаження.
    }
    inviteListeners.forEach((listener) => listener());
};
export const useInvitesEnabled = (): boolean =>
    useSyncExternalStore(
        (listener) => {
            inviteListeners.add(listener);
            return () => {
                inviteListeners.delete(listener);
            };
        },
        () => invitesOn,
        () => true
    );
