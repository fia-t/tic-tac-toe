"use client";
import { arrayUnion, doc, getDoc, serverTimestamp, setDoc, type Timestamp } from "firebase/firestore";
import { addGameEventListener, getFirebaseDb, isFirebaseConfigured, isLocalDev } from "@game/lib/firebase";
import { ensureAnonymousUser } from "@game/lib/onlineGame";
import { currentGameSource, type GameSource } from "@game/lib/gameLog";
import { getProfile, levelForXp } from "@game/lib/profile";
import { getWallet } from "@game/lib/wallet";
import { getCampaign, totalStars } from "@game/lib/campaign";
import { currentStreak, getDailyState } from "@game/lib/daily";
import { getMyRating } from "@game/lib/matchmaking";

// Картка гравця для адмінки (розділ "Гравці"): хто, де грав, коли востаннє й прогрес.
// Прогрес гравця живе в браузері або в хмарі порталу - сюди гра лише дублює короткий
// підсумок у players/{uid} (uid - анонімний вхід Firebase): на старті й після кожної партії.

const COLLECTION = "players";

export type PlayerRecord = {
    name: string;
    // Акаунт порталу QS Play, якщо гравець увійшов.
    qsId: string | null;
    source: GameSource;
    // Де грав: домени сторінок, у які вбудована гра, і "direct" - гра відкрита напряму.
    hosts: string[];
    firstSeen: Timestamp | null;
    lastPlayed: Timestamp | null;
    games: number;
    wins: number;
    draws: number;
    losses: number;
    onlineWins: number;
    level: number;
    xp: number;
    coins: number;
    campaignStars: number;
    dailyStreak: number;
    rating: number;
    ratedPlayed: boolean;
};

// Звідки відкрито гру: у iframe (портал, агрегатор) - домен батьківської сторінки, інакше "direct".
const currentHost = (): string => {
    if (typeof window === "undefined") return "direct";
    let embedded = false;
    try {
        embedded = window.top !== window.self;
    } catch {
        embedded = true;
    }
    if (!embedded) return "direct";
    const ancestors = (window.location as Location & { ancestorOrigins?: DOMStringList }).ancestorOrigins;
    const origin = ancestors && ancestors.length ? ancestors[ancestors.length - 1] : document.referrer;
    try {
        return origin ? new URL(origin).host : "embedded";
    } catch {
        return "embedded";
    }
};

let fallbackName = "";
let portalUser: (() => Promise<{ id: string; name: string } | null>) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;

// Ім'я, коли гравець свого не задав, - наше випадкове "цікаве" ім'я з табло рахунку.
export const setPlayerFallbackName = (name: string | null): void => {
    if (name) fallbackName = name;
};

// Акаунт порталу (QS Play SDK) - App.tsx передає, якщо SDK це вміє.
export const setPortalUserProvider = (provider: () => Promise<{ id: string; name: string } | null>): void => {
    portalUser = provider;
};

const save = async () => {
    try {
        const uid = await ensureAnonymousUser();
        const ref = doc(getFirebaseDb(), COLLECTION, uid);
        const existing = await getDoc(ref).catch(() => null);
        const user = portalUser ? await portalUser().catch(() => null) : null;
        const profile = getProfile();
        const rating = getMyRating();
        const s = profile.stats;
        await setDoc(
            ref,
            {
                name: (user?.name || profile.name || fallbackName || "").slice(0, 60),
                qsId: user?.id ?? null,
                source: currentGameSource(),
                hosts: arrayUnion(currentHost()),
                ...(existing?.exists() ? {} : { firstSeen: serverTimestamp() }),
                lastPlayed: serverTimestamp(),
                games: s.games,
                wins: s.wins,
                draws: s.draws,
                losses: s.losses,
                onlineWins: s.onlineWins,
                level: levelForXp(profile.xp),
                xp: profile.xp,
                coins: getWallet().coins,
                campaignStars: totalStars(getCampaign()),
                dailyStreak: currentStreak(getDailyState()),
                rating: rating.rating,
                ratedPlayed: rating.played,
            },
            { merge: true }
        );
    } catch {
        // Картка для адмінки - не критична для гри.
    }
};

// Записати з невеликою затримкою: кілька подій поспіль (кінець партії, нагороди) - один запис.
const schedule = (delay = 2000) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void save(), delay);
};

export const startPlayerTracking = (): void => {
    if (started || !isFirebaseConfigured || typeof window === "undefined" || isLocalDev) return;
    started = true;
    schedule(3000);
    addGameEventListener((name) => {
        if (name === "game_finished" || name === "online_game_finished" || name === "daily_finished" || name === "campaign_level_finished") schedule();
    });
};
