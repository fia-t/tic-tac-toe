"use client";
import { useSyncExternalStore } from "react";

// Мова інтерфейсу гри: uk або en. Сайт (Next.js) завжди стартує з uk - там немає
// GAME_TARGET; standalone-білд бере мову браузера, а на порталі її далі виставляє
// SDK (game.getConfig().locale + addLocaleListener, див. App.tsx). Будь-яка мова,
// крім української, показується англійською.
export type Locale = "uk" | "en";

const uk = {
    ai: "🤖 ШІ",
    player: "Гравець",
    resultWin: "Ви перемогли!",
    resultLose: "ШІ переміг!",
    resultDraw: "Нічия",
    restart: "Почати знову",
    modeClassic: "Класичний 3×3",
    modeFive: "Поле 5×5",
    modeHard: "Ultimate: 9 полів",
    tooltipHard: "Складний",
    tooltipFriend: "З другом",
    playWithFriend: "Гра з другом",
    soundOff: "Вимкнути звук",
    soundOn: "Увімкнути звук",
    close: "Закрити",
    friendTitle: "🎮 Гра з другом",
    chooseMode: "Оберіть режим гри",
    creating: "Створюємо...",
    createGame: "Створити гру",
    join: "Приєднатися",
    joinTitle: "Приєднатися до гри",
    joinHint: "Вставте посилання-запрошення або код кімнати",
    joinPlaceholder: "https://.../play/ABC123 або ABC123",
    back: "Назад",
    errorFirebaseShort: "Firebase не налаштовано. Заповніть .env.local (див. .env.local.example) і перезапустіть сервер.",
    errorCreateRoom: "Не вдалося створити кімнату. Спробуйте ще раз.",
    errorJoinEmpty: "Вставте посилання-запрошення або код кімнати.",
    playerX: "Гравець X",
    playerO: "Гравець O",
    onlineDraw: "Нічия!",
    onlineWin: "Ви перемогли!",
    onlineLose: "Суперник переміг!",
    yourTurn: "Ваш хід",
    opponentTurn: "Хід суперника",
    waitingRematch: "Очікуємо, поки суперник погодиться...",
    playAgain: "Грати ще раз",
    opponentWantsRematch: "Суперник хоче реванш!",
    firebaseTitle: "Firebase не налаштовано",
    firebaseBody:
        "Заповніть NEXT_PUBLIC_FIREBASE_* змінні у .env.local (див. .env.local.example) і перезапустіть сервер, щоб онлайн-режим запрацював.",
    backToMenu: "Повернутися в меню",
    connecting: "Підключення...",
    joiningRoom: "Заходимо в кімнату {room}",
    roomNotFound: "Кімнату не знайдено",
    roomNotFoundBody: "Можливо, посилання застаріло або гра вже завершилась і кімнату очищено.",
    roomFull: "Кімната вже заповнена",
    roomFullBody: "У цій грі вже двоє гравців.",
    errorTitle: "Щось пішло не так",
    errorBody: "Не вдалося підключитися до кімнати. Перевірте зʼєднання й спробуйте ще раз.",
    inviteTitle: "Ваше запрошення",
    copy: "📋 Копіювати",
    copied: "✓ Посилання скопійовано",
    waitingPlayer: "Очікування другого гравця...",
    opponentLeft: "Суперник покинув гру",
    waitReturn: "Чекати повернення",
    rulesButton: "Правила Ultimate",
    rulesTitle: "Як грати в Ultimate",
    rule1: "Велике поле складається з 9 малих. Виграйте мале поле - збирайте три в ряд, як у звичайній грі.",
    rule2: "Клітинка, у яку ви ходите, визначає мале поле, де ходитиме суперник. Воно підсвічується золотим.",
    rule3: "Якщо це поле вже вигране чи заповнене, хід можна робити в будь-яке відкрите поле.",
    rule4: "Перемагає той, хто виграє три малих поля в ряд.",
    gotIt: "Зрозуміло",
    hintAnyBoard: "Ходіть у будь-яке відкрите поле",
    hintActiveBoard: "Ваш хід - у підсвічене поле",
    hintAiTurn: "ШІ думає...",
};

type Key = keyof typeof uk;

const en: Record<Key, string> = {
    ai: "🤖 AI",
    player: "Player",
    resultWin: "You win!",
    resultLose: "AI wins!",
    resultDraw: "It's a draw",
    restart: "Restart",
    modeClassic: "Classic 3×3",
    modeFive: "5×5 board",
    modeHard: "Ultimate: nine boards",
    tooltipHard: "Hard",
    tooltipFriend: "Friend",
    playWithFriend: "Play with a friend",
    soundOff: "Mute sound",
    soundOn: "Unmute sound",
    close: "Close",
    friendTitle: "🎮 Play with a friend",
    chooseMode: "Choose a game mode",
    creating: "Creating...",
    createGame: "Create game",
    join: "Join",
    joinTitle: "Join a game",
    joinHint: "Paste an invite link or a room code",
    joinPlaceholder: "https://.../play/ABC123 or ABC123",
    back: "Back",
    errorFirebaseShort: "Firebase is not configured. Fill in .env.local (see .env.local.example) and restart the server.",
    errorCreateRoom: "Couldn't create a room. Please try again.",
    errorJoinEmpty: "Paste an invite link or a room code.",
    playerX: "Player X",
    playerO: "Player O",
    onlineDraw: "Draw!",
    onlineWin: "You win!",
    onlineLose: "Your opponent wins!",
    yourTurn: "Your turn",
    opponentTurn: "Opponent's turn",
    waitingRematch: "Waiting for your opponent to accept...",
    playAgain: "Play again",
    opponentWantsRematch: "Your opponent wants a rematch!",
    firebaseTitle: "Firebase is not configured",
    firebaseBody:
        "Fill in the NEXT_PUBLIC_FIREBASE_* variables in .env.local (see .env.local.example) and restart the server to enable online play.",
    backToMenu: "Back to menu",
    connecting: "Connecting...",
    joiningRoom: "Joining room {room}",
    roomNotFound: "Room not found",
    roomNotFoundBody: "The link may be outdated, or the game has ended and the room was cleaned up.",
    roomFull: "This room is full",
    roomFullBody: "Two players are already in this game.",
    errorTitle: "Something went wrong",
    errorBody: "Couldn't connect to the room. Check your connection and try again.",
    inviteTitle: "Your invite",
    copy: "📋 Copy",
    copied: "✓ Link copied",
    waitingPlayer: "Waiting for the second player...",
    opponentLeft: "Your opponent left the game",
    waitReturn: "Wait for them",
    rulesButton: "Ultimate rules",
    rulesTitle: "How to play Ultimate",
    rule1: "The big board is made of 9 small ones. Win a small board by getting three in a row, like the classic game.",
    rule2: "The cell you play in decides which small board your opponent plays in next. It glows gold.",
    rule3: "If that board is already won or full, the next move can go in any open board.",
    rule4: "Win three small boards in a row to win the game.",
    gotIt: "Got it",
    hintAnyBoard: "Play in any open board",
    hintActiveBoard: "Your move: play in the highlighted board",
    hintAiTurn: "AI is thinking...",
};

const dictionaries: Record<Locale, Record<Key, string>> = { uk, en };

export const toLocale = (raw: string | null | undefined): Locale =>
    raw?.toLowerCase().startsWith("uk") ? "uk" : "en";

let current: Locale =
    process.env.GAME_TARGET && typeof navigator !== "undefined" ? toLocale(navigator.language) : "uk";
const listeners = new Set<() => void>();

export const getLocale = (): Locale => current;

export const setLocale = (locale: Locale): void => {
    if (locale === current) return;
    current = locale;
    if (typeof document !== "undefined") document.documentElement.lang = locale;
    listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const t = (key: Key, params?: Record<string, string>): string => {
    let text = dictionaries[current][key];
    if (params) {
        for (const [name, value] of Object.entries(params)) text = text.replace(`{${name}}`, value);
    }
    return text;
};

// Перемальовує компонент при зміні мови (напр. гравець перемкнув мову порталу).
// Серверний знімок - uk, як і стартова мова сайту, тож гідратація не розходиться.
export const useT = (): typeof t => {
    useSyncExternalStore(subscribe, getLocale, () => "uk" as Locale);
    return t;
};
