"use client";
import { useSyncExternalStore } from "react";
import { addGameEventListener } from "@game/lib/firebase";

// Звуки синтезуються WebAudio на льоту - жодних аудіофайлів у білді (ліміти порталу
// на розмір і "звук не грає, коли гра не у фокусі" виконуються самі собою).
// move - хід гравця, reply - хід ШІ/суперника; win/lose/draw - кінець партії
// (слухаємо game_finished/online_game_finished, що й так ідуть через trackEvent);
// coin - нарахування монет у вікні результату.
export type SoundName = "move" | "reply" | "win" | "lose" | "draw" | "coin";

const STORAGE_KEY = "ttt-muted";

const readStoredMuted = (): boolean => {
    try {
        return typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
        return false;
    }
};

let muted = readStoredMuted();
// Тимчасове глушіння ззовні (реклама/пауза порталу) - окремо від вибору гравця.
let suppressed = false;
let ctx: AudioContext | null = null;
const listeners = new Set<() => void>();

const isHidden = () => typeof document !== "undefined" && document.hidden;

const getContext = (): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctx) {
        const Ctor =
            window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
};

const tone = (
    c: AudioContext,
    start: number,
    freq: number,
    duration: number,
    { type = "sine", gain = 0.16, slideTo }: { type?: OscillatorType; gain?: number; slideTo?: number } = {}
) => {
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp).connect(c.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
};

const arpeggio = (c: AudioContext, start: number, notes: number[], step: number, duration: number, type: OscillatorType) =>
    notes.forEach((freq, i) => tone(c, start + i * step, freq, duration, { type, gain: 0.14 }));

const SOUNDS: Record<SoundName, (c: AudioContext, start: number) => void> = {
    move: (c, s) => tone(c, s, 520, 0.09, { type: "triangle", gain: 0.2, slideTo: 780 }),
    reply: (c, s) => tone(c, s, 430, 0.1, { gain: 0.18, slideTo: 300 }),
    win: (c, s) => arpeggio(c, s, [523.25, 659.25, 783.99, 1046.5], 0.09, 0.22, "triangle"),
    lose: (c, s) => arpeggio(c, s, [392, 329.63, 261.63], 0.13, 0.26, "sine"),
    draw: (c, s) => arpeggio(c, s, [493.88, 440], 0.12, 0.2, "sine"),
    coin: (c, s) => {
        tone(c, s, 988, 0.08, { type: "square", gain: 0.06 });
        tone(c, s + 0.08, 1319, 0.16, { type: "square", gain: 0.06 });
    },
};

// delay - щоб фанфари кінця партії не накладались на звук останнього ходу.
export const playSound = (name: SoundName, delay = 0): void => {
    if (muted || suppressed || isHidden()) return;
    const c = getContext();
    if (!c) return;
    try {
        SOUNDS[name](c, c.currentTime + 0.01 + delay);
    } catch {
        // Звук - прикраса: збій WebAudio ніколи не повинен ламати хід.
    }
};

export const isMuted = (): boolean => muted;

export const setMuted = (value: boolean): void => {
    muted = value;
    try {
        localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
        // Приватний режим / заблоковане сховище - вибір діє до перезавантаження.
    }
    listeners.forEach((listener) => listener());
};

export const setSoundSuppressed = (value: boolean): void => {
    suppressed = value;
    if (value) void ctx?.suspend();
};

export const useMuted = (): boolean =>
    useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        isMuted,
        () => false
    );

if (typeof document !== "undefined") {
    // Вкладка у фоні - аудіо повністю зупинене (вимога порталу), не лише тихе.
    document.addEventListener("visibilitychange", () => {
        if (!ctx) return;
        if (document.hidden) void ctx.suspend();
        else if (!suppressed) void ctx.resume();
    });

    addGameEventListener((name, params) => {
        if (name !== "game_finished" && name !== "online_game_finished") return;
        const result = params?.result;
        playSound(result === "win" ? "win" : result === "draw" ? "draw" : "lose", 0.18);
    });
}
