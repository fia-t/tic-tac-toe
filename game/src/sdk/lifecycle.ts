import { sdk } from "./index";

// Обгортка над loading/gameplay-викликами SDK: вимоги порталу (і CrazyGames/Poki) -
// стани не повинні перекриватись чи дублюватись. Тому ігровий код лише каже,
// чи зараз іде партія (setGameplay), а реальні gameplayStart/Stop шлються тільки на
// зміну підсумкового стану: завантаження завершене && партія триває && вкладка видима.

let loadingStarted = false;
let loadingDone = false;
let wantGameplay = false;
let hidden = typeof document !== "undefined" && document.hidden;
let active = false;

const sync = () => {
    const next = loadingDone && wantGameplay && !hidden;
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
};
