"use client";
import {
    addDoc,
    collection,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
} from "firebase/firestore";
import { User } from "firebase/auth";
import { getFirebaseDb } from "@game/lib/firebase";

// Білди standalone-гри для порталу. Життєвий цикл документа gameBuilds/{id}:
// queued (створює адмінка) -> building -> success | failed (пише GitHub Actions,
// game/scripts/build-publish.mjs).
export type GameBuildStatus = "queued" | "building" | "success" | "failed";

export type GameBuild = {
    id: string;
    status: GameBuildStatus;
    target?: string;
    requestedAt?: Timestamp | null;
    requestedBy?: string | null;
    startedAt?: Timestamp | null;
    finishedAt?: Timestamp | null;
    commit?: string;
    runUrl?: string;
    zipUrl?: string;
    zipSizeBytes?: number;
    fileCount?: number;
    error?: string;
};

const COLLECTION = "gameBuilds";
const HISTORY_SIZE = 10;

export const subscribeToGameBuilds = (
    onChange: (builds: GameBuild[]) => void,
    onError: (err: unknown) => void
): (() => void) => {
    const q = query(collection(getFirebaseDb(), COLLECTION), orderBy("requestedAt", "desc"), limit(HISTORY_SIZE));
    return onSnapshot(
        q,
        // serverTimestamp ще не підтверджений сервером - показуємо оцінку, а не null.
        (snap) =>
            onChange(
                snap.docs.map((d) => ({
                    id: d.id,
                    ...(d.data({ serverTimestamps: "estimate" }) as Omit<GameBuild, "id">),
                }))
            ),
        onError
    );
};

export const requestGameBuild = async (user: User): Promise<void> => {
    const docRef = await addDoc(collection(getFirebaseDb(), COLLECTION), {
        status: "queued",
        target: "portal",
        requestedAt: serverTimestamp(),
        requestedBy: user.email ?? user.uid,
    });

    let errorMessage: string | null = null;
    try {
        const res = await fetch("/api/admin/game-build", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${await user.getIdToken()}`,
            },
            body: JSON.stringify({ buildId: docRef.id }),
        });
        if (!res.ok) {
            const body = (await res.json().catch(() => null)) as { error?: string } | null;
            errorMessage = body?.error ?? `HTTP ${res.status}`;
        }
    } catch {
        errorMessage = "Не вдалося звʼязатися з сервером.";
    }

    if (errorMessage) {
        // Workflow так і не стартував - інакше заявка вічно висіла б у "queued".
        await updateDoc(docRef, { status: "failed", error: errorMessage, finishedAt: serverTimestamp() });
        throw new Error(errorMessage);
    }
};
