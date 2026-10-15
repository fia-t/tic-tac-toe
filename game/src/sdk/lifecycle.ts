import { sdk } from "./index";

// Обгортка над loading/gameplay-викликами SDK: вимоги порталу (і CrazyGames/Poki) -
// стани не повинні перекриватись чи дублюватись. Тому ігровий код лише каже,
// чи зараз іде партія (setGameplay), а реальні gameplayStart/Stop шлються тільки на
// зміну підсумкового стану: завантаження завершене && партія триває && вкладка видима &&
// гру не поставлено на паузу (туторіал, відкрите вікно поверх поля).

let loadingStarted = false;
let loadingDone = false;
let wantGameplay = false;
let hidden = typeof document !== "undefined" && document.hidden;
let active = false;
const pauses = new Set<string>();

const sync = () => {
    const next = loadingDone && wantGameplay && !hidden && pauses.size === 0;
    if (next === active) return;
    active = next;
    if (next) sdk.gameplayStart();
    else sdk.gameplayStop();
};

if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
        hidden = document.hidden;
        sync();
    });
}

export const lifecycle = {
    loadingStart: () => {
        if (loadingStarted) return;
        loadingStarted = true;
        sdk.loadingStart();
    },
    // Гра готова до першої дії гравця (теми/картинки підвантажені).
    loadingStop: () => {
        if (loadingDone) return;
        lifecycle.loadingStart();
        loadingDone = true;
        sdk.loadingStop();
        sync();
    },
    setGameplay: (playing: boolean) => {
        wantGameplay = playing;
        sync();
    },
    // Пауза поверх партії (reason - хто поставив: "tutorial", "panel"): партія не закінчилась,
    // але гравець зараз не грає - портал має отримати gameplayStop, а після закриття - gameplayStart.
    setPaused: (reason: string, paused: boolean) => {
        if (paused) pauses.add(reason);
        else pauses.delete(reason);
        sync();
    },
};
