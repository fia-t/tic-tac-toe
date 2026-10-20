"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { buttonTone, gameButtonCss } from "@game/components/GameButton";
import { ActionIcon, DiffButton, DiffGroup, ModPicker, ModifierSelect, RoundButton, tipCss } from "@game/components/GameOptions";
import { FriendGameModal } from "@game/components/FriendGameModal";
import { InfoTip } from "@game/components/HomeScreen";
import { levelTitle } from "@game/lib/campaignContent";
import { MoveTimerBar, freezeMoveTimer, frozenTurns, pauseMoveTimer, resetMoveTimerBoosts, useMoveTimerBoost } from "@game/components/MoveTimer";
import { assetUrl } from "@game/lib/assets";
import { trackEvent } from "@game/lib/firebase";
import { isEmbed, isHalloweenEmbed } from "@game/lib/embed";
import { ScoreCobweb } from "@game/components/HalloweenDecor";
import { FullscreenButton } from "@game/components/SettingsPanel";
import { useT } from "@game/lib/i18n";
import { DIFFICULTIES, setDifficulty, useDifficulty } from "@game/lib/difficulty";
import { dayOfYear, endDailyRun, nextRunId, setDailyRun, useDailyRun } from "@game/lib/daily";
import { GameModeKey, MODIFIERS_BY_MODE, Modifier, TIMER_SECONDS, effectiveModifier, setModifier, useModifierChoice, weeklyModifier } from "@game/lib/modifiers";

// Екран партії проти бота (як у прототипі), спільний для 3×3, 5×5 і гіга-поля:
// - смуга над полем: "Заново", "Гра з другом", плитки режимів, складність ("світлофор") і
//   модифікатори; у виклику дня чи рівні кампанії - плашка з ціллю замість виборів;
// - рядок рахунку з підказкою ("Твій хід", "Бот думає...") одразу після нього;
// - поле, праворуч від нього (або під ним на вузькому екрані) - бустери "Скасувати хід" і "Підказка";
//   у партії з таймером - ще "Пауза таймера" й "Заморозка часу".

// Rewarded-реклама агрегатора: є - бустер після безкоштовної спроби можна взяти за рекламу.
export const RewardedAdContext = createContext<(() => Promise<boolean>) | undefined>(undefined);

export const GameRoot = styled.div<{ $timer?: boolean; $embed?: boolean }>`
    /* Ширина поля - і рядків над/під ним. Запас по висоті - шапка, смуга виборів, рядок рахунку
       й ряд бустерів під полем; від 800px бустери збоку, тож запас менший. Верхня межа 628px -
       щоб колонка бустерів вміщалась у 760px. Рядок таймера над полем забирає ще --timer-h. */
    --timer-h: ${({ $timer }) => ($timer ? "38px" : "0px")};
    --board-w: min(100%, 628px, max(280px, calc(100dvh - 236px - var(--timer-h))));
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding-bottom: 16px;

    @media (min-width: 800px) {
        --board-w: min(100%, 628px, max(280px, calc(100dvh - 184px - var(--timer-h))));
    }

    /* Гра в новині: шапки немає - поле займає всю висоту iframe (чи екрана в повноекранному
       режимі) і може бути ширшим за колонку; збоку лишається місце під бустери. */
    ${({ $embed }) =>
        $embed &&
        css`
            --board-w: min(100%, max(280px, calc(100dvh - 210px - var(--timer-h))));

            @media (min-width: 800px) {
                --board-w: min(calc(100vw - 180px), 1000px, max(280px, calc(100dvh - 140px - var(--timer-h))));
            }
        `}
`;

// Смуга над полем: дії, а далі групи "Поле", "Бот", "Модифікатор" - кожна з підписом і "?".
// Кнопки вирівняні по низу (у груп над ними підпис). На широкому екрані - один рядок; від 760px
// і вужче "Бот" і "Модифікатор" завжди другим рядком, щоб розкладка не залежала від поля.
const Bar = styled.div<{ $embed?: boolean }>`
    position: relative;
    z-index: 25;
    display: flex;
    align-items: flex-end;
    flex-wrap: nowrap;
    gap: 8px 6px;
    width: 100%;
    min-width: 0;

    @media (max-width: 760px) {
        flex-wrap: wrap;
    }

    @media (max-width: 480px) {
        gap: 6px 4px;
    }

    /* Гра в новині: смуга не на всю ширину iframe, а компактно по центру над полем. */
    ${({ $embed }) =>
        $embed &&
        css`
            @media (min-width: 761px) {
                width: auto;
            }
        `}
`;

const BarGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
`;

const BarGroupRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;

    @media (max-width: 480px) {
        gap: 4px;
    }
`;

// "Заново" і "Гра з другом" у смузі - менші за бустери біля поля.
const BarActions = styled(BarGroupRow)`
    && ${RoundButton} {
        width: 42px;
        height: 42px;
        min-height: 42px;
    }

    @media (max-width: 480px) {
        && ${RoundButton} {
            width: 40px;
            height: 40px;
            min-height: 40px;
        }
    }
`;

const BarLabel = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 18px;
    font: 800 11px/1 var(--font-body);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--bar-ink, #7a5530);
    white-space: nowrap;
`;

const PushRight = styled.div<{ $embed?: boolean }>`
    margin-left: auto;
    display: flex;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 8px 10px;
    min-width: 0;

    /* Широкий екран: смуга на всю ширину (від логотипа до шестерні), один рядок. "Бот" і
       "Модифікатор" стають прямими елементами смуги з margin-left: auto - вільне місце ділиться
       порівну між проміжками поле-бот і бот-модифікатор, модифікатор - по правому краю. */
    @media (min-width: 761px) {
        display: contents;

        & > ${BarGroup} {
            margin-left: ${({ $embed }) => ($embed ? "28px" : "auto")};
        }
    }

    @media (max-width: 760px) {
        flex-basis: 100%;
        margin-left: 0;
    }

    /* На телефоні "Бот" і "Модифікатор" - одним рядком: у кнопці модифікатора лише іконка
       (назва й опис - у списку). */
    @media (max-width: 480px) {
        flex-wrap: nowrap;
        gap: 6px 10px;
        --mod-w-sm: 64px;

        [aria-haspopup] > span {
            display: none;
        }

        ${ModPicker} {
            position: static;
        }
    }
`;

const ModeTile = styled.button`
    position: relative;
    flex-shrink: 0;
    width: 46px;
    height: 46px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    --gb-c: 0px;
    ${tipCss}

    img {
        display: block;
        width: 100%;
        height: 100%;
        transition:
            transform 0.12s ease,
            filter 0.12s ease;
    }

    @media (hover: hover) {
        &:hover img {
            transform: translateY(-1px);
            filter: drop-shadow(0 3px 5px rgba(73, 48, 31, 0.14));
        }
    }

    &[aria-pressed="true"] img {
        transform: translateY(-2px) scale(1.05);
        filter: drop-shadow(0 0 8px rgba(31, 179, 217, 0.6));
    }

    &:focus-visible {
        outline: 3px solid #1fb3d9;
        outline-offset: 2px;
        border-radius: 12px;
    }

    @media (max-width: 480px) {
        width: 44px;
        height: 44px;
    }
`;

const BarDiff = styled(DiffButton)`
    ${tipCss}

    && {
        --gb-c: 12px;
        min-height: 40px;
        padding: 0 2px;
        font-size: 14px;
    }

    @media (max-width: 480px) {
        && {
            --gb-c: 11px;
            min-height: 36px;
            padding: 0 1px;
            font-size: 13px;
        }
    }
`;


// Ціль виклику дня / рівня кампанії і кнопка "Звичайна гра".
const GoalBanner = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 0 1 auto;
    min-width: 0;
    padding: 6px 6px 6px 14px;
    border-radius: 999px;
    background: linear-gradient(155deg, #ffe3a3, #f5c96a);
    box-shadow: 3px 3px 6px rgba(101, 72, 35, 0.25);
    color: #4a2c0c;
    font-size: 14px;
    font-weight: 800;

    span {
        min-width: 0;
    }
`;

const LeaveButton = styled.button`
    ${gameButtonCss("sm")}
    ${buttonTone("wood")}
    flex-shrink: 0;

    && {
        --gb-c: 13px;
        min-height: 38px;
        padding: 0 4px;
    }
`;

// Рахунок - над полем; підказка - в одному ряду з ним, одразу після нього.
export const ScoreTop = styled.div<{ $wide?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    /* Не вужчий за 560px (якщо екран дозволяє): на низькому, але широкому екрані (iframe у новині)
       поле маленьке, і підказка в плашці інакше розсипалась би у вузький стовпчик. */
    width: max(var(--board-w), min(100%, 560px));

    /* Гра в новині: ширше за телефон рядок до 720px, і статус завжди в один рядок. */
    ${({ $wide }) =>
        $wide &&
        css`
            @media (min-width: 561px) {
                width: max(var(--board-w), min(100%, 720px));

                & > * {
                    white-space: nowrap;
                }
            }
        `}

    /* На телефоні рахунок і статус - в одному рядку сталої висоти (до двох рядків підказки),
       щоб поле стояло вище й не стрибало, коли статус змінюється. */
    @media (max-width: 560px) {
        gap: 8px;
        min-height: 40px;
    }
`;

export const ScorePill = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    max-width: 100%;
    padding: 4px 14px;
    border-radius: 14px;
    border: 2px solid rgba(139, 101, 60, 0.35);
    box-shadow:
        inset 2px 2px 4px rgba(101, 72, 35, 0.35),
        inset -1px -1px 2px rgba(255, 255, 255, 0.35);
    background: var(--score-bg, rgba(255, 246, 230, 0.55));
    color: #5b3f22;
    font-size: 14px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;

    b {
        color: #b32f1c;
    }

    span {
        white-space: nowrap;
    }

    span:last-child {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* На телефоні довге ім'я обрізається, щоб статусу лишалось місце в тому ж рядку. */
    @media (max-width: 560px) {
        flex-shrink: 1;
        min-width: 0;
        max-width: 48%;
        gap: 6px;
        padding: 4px 10px;
    }
`;

const lineIn = keyframes`
    from { opacity: 0; transform: translateY(3px); }
    to { opacity: 1; transform: none; }
`;

const turnPulse = keyframes`
    0%, 100% { box-shadow: 0 0 0 0 rgba(15, 111, 140, 0.4); }
    50% { box-shadow: 0 0 0 6px rgba(15, 111, 140, 0); }
`;

// Підказка-статус: статичний рядок; новий текст плавно проявляється (key = текст).
// Хід гравця ($mine) - бірюзова плашка з легкою пульсацією, щоб "Твій хід" було видно одразу.
// Висота однакова з плашкою і без - рядок рахунку не стрибає.
export const TurnLine = styled.div<{ $mine?: boolean; $pill?: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1 1 auto;
    min-width: 0;
    min-height: 32px;
    color: #0f6f8c;
    font-size: 16px;
    font-weight: 800;
    line-height: 1.2;
    text-shadow: 0 1px 0 rgba(255, 250, 235, 0.8);
    animation: ${lineIn} 0.35s ease both;

    ${({ $mine }) =>
        $mine &&
        css`
            flex: 0 1 auto;
            padding: 3px 14px 3px 4px;
            border-radius: 18px;
            background: linear-gradient(180deg, #1a8aa8, #0f6f8c);
            color: #fff7e8;
            text-shadow: 0 1px 1px rgba(5, 40, 45, 0.35);
            animation:
                ${lineIn} 0.35s ease both,
                ${turnPulse} 1.8s ease-in-out 0.35s infinite;
        `}

    @media (max-width: 560px) {
        font-size: 14px;
        line-height: 1.15;
    }

    ${({ $mine }) =>
        !$mine &&
        css`
            color: #8a6a48;
        `}

    /* Хелловінська гра в новині: простий текст губився на нічному небі - кремова плашка,
       як у рахунку. */
    ${({ $mine, $pill }) =>
        !$mine &&
        $pill &&
        css`
            flex: 0 1 auto;
            padding: 5px 14px;
            border-radius: 18px;
            background: #fff6e6;
            color: #5b3f22;
            text-shadow: none;
        `}

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

// Значок фішки гравця (з поточного скіна) в плашці "Твій хід".
export const TurnMark = styled.span`
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #fff7e8;

    img {
        width: 21px;
        height: 21px;
        object-fit: contain;
    }
`;

const Cross = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d="M5 5l14 14M19 5 5 19" stroke="#e8452f" strokeWidth="4" strokeLinecap="round" />
    </svg>
);

// Обгортка має ширину поля (без неї поле стискалось би до нуля); колонка бустерів висить за її
// правим краєм - саме поле лишається по центру, на одній лінії з рядками над ним. Якщо збоку
// місця немає (вузький екран) - бустери рядком під полем по його правому краю.
export const BoardHolder = styled.div`
    position: relative;
    width: var(--board-w);

    & > :first-child {
        width: 100%;
    }
`;

const Boosters = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 8px;

    @media (min-width: 800px) {
        position: absolute;
        left: calc(100% + 14px);
        top: 50%;
        transform: translateY(-50%);
        flex-direction: column;
        gap: 14px;
        padding: 0;

        /* Тултіпи колонки - праворуч від кнопок. */
        & > button::after {
            left: calc(100% + var(--gb-c, 0px) + 6px);
            top: 50%;
            transform: translateY(-50%);
        }
    }
`;

const Badge = styled.span<{ $free: boolean }>`
    position: absolute;
    top: calc(-1 * var(--gb-c, 13px) - 4px);
    right: calc(-1 * var(--gb-c, 13px) - 6px);
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    border-radius: 999px;
    background: ${({ $free }) => ($free ? "#2f8a3e" : "#49301f")};
    color: #fff7e8;
    font: 700 ${({ $free }) => ($free ? 12 : 11)}px/20px var(--font-body);
    text-align: center;
    box-shadow: 0 0 0 2px #fff7e8;
    pointer-events: none;
`;

// Відлік на кнопці діючого бустера: секунди паузи (помаранчеві) або ходи заморозки (сині).
const BoosterCount = styled.span<{ $kind: BoosterKind }>`
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    font: 800 16px/1 var(--font-heading);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: ${({ $kind }) => ($kind === "pause" ? "#c46f0c" : "#0f6f8c")};
`;

// "Результат" після кінця партії - невеликий бірюзовий текст у рядку рахунку, по правому краю поля.
export const ResultLink = styled.button`
    flex-shrink: 0;
    margin-left: auto;
    padding: 4px 2px;
    border: none;
    background: none;
    color: var(--link-ink, #0f6f8c);
    font: 800 15px/1.2 var(--font-body);
    white-space: nowrap;
    cursor: pointer;

    @media (hover: hover) {
        &:hover {
            color: var(--link-ink-hover, #0a5068);
        }
    }

    &:focus-visible {
        outline: 3px solid #1fb3d9;
        outline-offset: 2px;
        border-radius: 6px;
    }
`;

type BoosterKind = "undo" | "hint" | "pause" | "freeze";
const ALL_FREE: Record<BoosterKind, boolean> = { undo: true, hint: true, pause: true, freeze: true };

// Бустери: кожен один раз за партію безкоштовно, далі - за rewarded-рекламу (якщо вона є).
const useBoosters = (resetKey: unknown) => {
    const rewarded = useContext(RewardedAdContext);
    const [free, setFree] = useState<Record<BoosterKind, boolean>>(ALL_FREE);
    useEffect(() => {
        setFree(ALL_FREE);
        resetMoveTimerBoosts();
    }, [resetKey]);
    const use = async (kind: BoosterKind, apply: () => void) => {
        if (free[kind]) {
            setFree((f) => ({ ...f, [kind]: false }));
            trackEvent("booster_used", { booster: kind, paid: false });
            apply();
            return;
        }
        if (!rewarded) return;
        if (await rewarded()) {
            trackEvent("booster_used", { booster: kind, paid: true });
            apply();
        }
    };
    return { free, canBuy: Boolean(rewarded), use };
};

export type BoosterProps = {
    canUndo: boolean;
    canHint: boolean;
    onUndo: () => void;
    onHint: () => void;
    // Нова партія - безкоштовні спроби знову доступні.
    resetKey: unknown;
};

type GameScreenProps = {
    mode: GameModeKey;
    onSetMode: (mode: GameModeKey) => void;
    onRestart: () => void;
    onRoomReady: (roomId: string) => void;
    onBeforeFriendOpen?: () => Promise<boolean>;
    score: { ai: number; human: number };
    humanName: string | null;
    status: string;
    // Зараз хід гравця - статус показується помітною плашкою.
    myTurn?: boolean;
    // Фішка гравця в поточному скіні - для плашки "Твій хід" (без неї - класичний хрестик).
    turnMarker?: string;
    // Підказка новачку замість статусу (перша партія, ще жодного ходу).
    firstHint?: boolean;
    over: boolean;
    timer?: number | null;
    board: React.ReactNode;
    boosters: BoosterProps;
    // Повторно відкрити вікно результату (якщо його закрили).
    onShowResult?: () => void;
};

const FRIEND_MODE: Record<GameModeKey, "3x3" | "5x5" | "9x9"> = { traditional: "3x3", five: "5x5", difficult: "9x9" };
const MODE_TILES: { id: GameModeKey; img: string; label: "modeClassic" | "modeFive" | "tooltipHard" }[] = [
    { id: "traditional", img: "images/traditional.png", label: "modeClassic" },
    { id: "five", img: "images/game-5x5.png", label: "modeFive" },
    { id: "difficult", img: "images/difficult.png", label: "tooltipHard" },
];

export const GameScreen: React.FC<GameScreenProps> = ({
    mode,
    onSetMode,
    onRestart,
    onRoomReady,
    onBeforeFriendOpen,
    score,
    humanName,
    status,
    myTurn = false,
    turnMarker,
    firstHint = false,
    over,
    timer,
    board,
    boosters,
    onShowResult,
}) => {
    const t = useT();
    const run = useDailyRun();
    const difficulty = useDifficulty();
    const choice = useModifierChoice();
    const activeModifier = effectiveModifier(mode, choice);
    // У грі з новини акції "модифікатор тижня" немає - мітку в списку не показуємо.
    const weekly = isEmbed() ? undefined : weeklyModifier();
    // У новині замість довгої підказки першого ходу - короткий статус "Твій хід" (у вузькому iframe - один рядок).
    const showFirstHint = firstHint && !isEmbed();
    const [friendOpen, setFriendOpen] = useState(false);
    const booster = useBoosters(boosters.resetKey);
    const timerBoost = useMoveTimerBoost();
    const quick = run === null;
    const openFriend = async () => {
        trackEvent("friend_modal_open", { from: mode });
        if (onBeforeFriendOpen && !(await onBeforeFriendOpen())) return;
        setFriendOpen(true);
    };

    // У виклику дня "Заново" недоступне, поки партію не зіграно (виклик не переграється);
    // рівень кампанії можна почати знову будь-коли.
    const restartDisabled = run?.kind === "daily" && !run.finished;
    const restart = () => {
        if (run?.kind === "campaign") {
            setDailyRun({ ...run, id: nextRunId(), finished: false });
            trackEvent("campaign_level_started", { level: run.template.id });
            return;
        }
        onRestart();
    };

    const pickDifficulty = (level: (typeof DIFFICULTIES)[number]) => {
        if (level === difficulty) return;
        trackEvent("select_difficulty", { difficulty: level });
        setDifficulty(level);
    };
    const pickModifier = (value: Modifier | null) => {
        if (value === activeModifier) return;
        trackEvent("select_modifier", { modifier: value ?? "none", mode });
        setModifier(value);
    };
    const pickMode = (target: GameModeKey) => {
        if (target === mode) return;
        trackEvent("select_mode", { mode: target });
        onSetMode(target);
    };

    const restartLabel = over ? t("playAgain") : t("restart");
    const actionButtons = (
        <>
            <RoundButton type="button" onClick={restart} disabled={restartDisabled} aria-label={restartLabel} data-tip={restartLabel}>
                <ActionIcon id="restart" />
            </RoundButton>
            {/* У грі з новини (iframe) - лише партія з ботом, без онлайн-кімнат. */}
            {!isEmbed() && (
                <RoundButton type="button" onClick={() => void openFriend()} aria-label={t("playWithFriend")} data-tip={t("playWithFriend")}>
                    <ActionIcon id="friend" />
                </RoundButton>
            )}
        </>
    );


    const goal = run
        ? run.kind === "campaign"
            ? `${t("campaignLevel", { n: String((run.level ?? 0) + 1) })}: ${levelTitle(run.template)}`
            : `${t("dailyBadge", { n: String(dayOfYear()) })}: ${t(`daily_${run.template.id}` as Parameters<typeof t>[0])}`
        : "";

    const BOOSTER_NAME: Record<BoosterKind, string> = { undo: t("boosterUndo"), hint: t("boosterHint"), pause: t("boosterPause"), freeze: t("boosterFreeze") };
    // Поки діє пауза чи заморозка - на кнопці бустера замість іконки зворотний відлік.
    const countdown: Partial<Record<BoosterKind, string>> = {
        pause: timerBoost.paused ? t("timerSecs", { n: String(timerBoost.pauseLeft) }) : undefined,
        freeze: timerBoost.frozenNow ? String(frozenTurns(timerBoost)) : undefined,
    };
    const boosterButton = (kind: BoosterKind, enabled: boolean, onUse: () => void) => {
        const name = BOOSTER_NAME[kind];
        const running = countdown[kind];
        if (running)
            return (
                <RoundButton type="button" aria-live="polite" aria-label={`${name}: ${running}`} data-tip={name}>
                    <BoosterCount $kind={kind}>{running}</BoosterCount>
                </RoundButton>
            );
        const isFree = booster.free[kind];
        const available = isFree || booster.canBuy;
        return (
            <RoundButton
                type="button"
                disabled={!enabled || !available}
                onClick={() => void booster.use(kind, onUse)}
                aria-label={`${name} (${isFree ? t("boosterFree") : t("boosterForAd")})`}
                data-tip={name}
            >
                <ActionIcon id={kind} />
                {available && (
                    <Badge $free={isFree} aria-hidden="true">
                        {isFree ? "1" : "AD"}
                    </Badge>
                )}
            </RoundButton>
        );
    };

    return (
        <GameRoot $timer={timer !== null && timer !== undefined && !over} $embed={isEmbed()}>
            <Bar data-tour="bar" $embed={isEmbed()}>
                {quick ? (
                    <>
                        <BarActions>{actionButtons}</BarActions>
                        <BarGroup>
                            <BarLabel id="bar-board">
                                {t("barBoard")}
                                <InfoTip text={t("infoBoard")} />
                            </BarLabel>
                            <BarGroupRow role="group" aria-labelledby="bar-board">
                                {MODE_TILES.map((tile) => (
                                    <ModeTile
                                        key={tile.id}
                                        type="button"
                                        aria-pressed={mode === tile.id}
                                        aria-label={t(tile.label)}
                                        data-tip={t(tile.label)}
                                        onClick={() => pickMode(tile.id)}
                                    >
                                        <img src={assetUrl(tile.img)} alt="" />
                                    </ModeTile>
                                ))}
                            </BarGroupRow>
                        </BarGroup>
                        <PushRight $embed={isEmbed()}>
                            <BarGroup>
                                <BarLabel id="bar-bot">
                                    {t("barBot")}
                                    <InfoTip text={t("infoDiff")} />
                                </BarLabel>
                                <DiffGroup role="group" aria-labelledby="bar-bot">
                                    {DIFFICULTIES.map((level) => (
                                        <BarDiff
                                            key={level}
                                            type="button"
                                            $level={level}
                                            aria-pressed={difficulty === level}
                                            data-tip={t(`diffNote_${level}`)}
                                            onClick={() => pickDifficulty(level)}
                                        >
                                            {t(`difficulty_${level}`)}
                                        </BarDiff>
                                    ))}
                                </DiffGroup>
                            </BarGroup>
                            <BarGroup>
                                <BarLabel id="bar-mod">
                                    {t("modifierLabel")}
                                    <InfoTip text={t("infoModGame")} />
                                </BarLabel>
                                <ModifierSelect
                                    value={activeModifier}
                                    options={MODIFIERS_BY_MODE[mode]}
                                    weekly={weekly}
                                    labelledBy="bar-mod"
                                    menuAlign="auto"
                                    onPick={pickModifier}
                                />
                            </BarGroup>
                        </PushRight>
                    </>
                ) : (
                    <>
                        <GoalBanner>
                            <span>{goal}</span>
                            <LeaveButton type="button" onClick={endDailyRun}>
                                {t("dailyLeave")}
                            </LeaveButton>
                        </GoalBanner>
                        {actionButtons}
                    </>
                )}
            </Bar>

            {timer !== null && timer !== undefined && !over && (
                <div style={{ width: "var(--board-w)" }}>
                    <MoveTimerBar fraction={timer} seconds={TIMER_SECONDS} boosts />
                </div>
            )}

            <ScoreTop $wide={isEmbed()}>
                <ScorePill>
                    {isHalloweenEmbed() && <ScoreCobweb />}
                    <span>{t("ai")}</span>
                    <b>{score.ai}</b>
                    <span>—</span>
                    <b>{score.human}</b>
                    <span>{isEmbed() ? t("you") : (humanName ?? t("player"))}</span>
                </ScorePill>
                <TurnLine
                    key={showFirstHint ? "first" : timerBoost.expired ? "expired" : status}
                    $mine={myTurn && !over && !timerBoost.expired}
                    $pill={isHalloweenEmbed()}
                    role="status"
                    aria-live="polite"
                >
                    {myTurn && !over && !timerBoost.expired && (
                        <TurnMark>{turnMarker ? <img src={turnMarker} alt="" /> : <Cross />}</TurnMark>
                    )}
                    {showFirstHint ? (
                        t("firstMoveHint")
                    ) : timerBoost.expired && !over ? (
                        t("timerExpired")
                    ) : (
                        status
                    )}
                </TurnLine>
                {over && quick && onShowResult && (
                    <ResultLink type="button" onClick={onShowResult}>
                        {t("showResult")}
                    </ResultLink>
                )}
            </ScoreTop>

            <BoardHolder data-tour="board">
                {board}
                {quick && (
                    <Boosters data-tour="boosters">
                        {boosterButton("undo", boosters.canUndo, boosters.onUndo)}
                        {boosterButton("hint", boosters.canHint, boosters.onHint)}
                        {/* Гра в новині: розгорнути на весь екран; на 5×5 і гіга-полі кнопка час від часу пульсує. */}
                        {isEmbed() && <FullscreenButton round nudge={mode !== "traditional"} />}
                        {timer !== null && timer !== undefined && (
                            <>
                                {boosterButton("pause", boosters.canHint && !timerBoost.firstFree && !timerBoost.paused && !timerBoost.frozenNow, pauseMoveTimer)}
                                {boosterButton("freeze", boosters.canHint && !timerBoost.firstFree && !timerBoost.frozenNow, freezeMoveTimer)}
                            </>
                        )}
                    </Boosters>
                )}
            </BoardHolder>

            {friendOpen && <FriendGameModal onClose={() => setFriendOpen(false)} onRoomReady={onRoomReady} defaultMode={FRIEND_MODE[mode]} />}
        </GameRoot>
    );
};
