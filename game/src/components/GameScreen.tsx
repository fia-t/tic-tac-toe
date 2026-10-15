"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { GameButton, buttonTone, gameButtonCss } from "@game/components/GameButton";
import { ActionIcon, DiffButton, DiffGroup, ModButton, ModIcon, ModRow, RoundButton, tipCss } from "@game/components/GameOptions";
import { FriendGameModal } from "@game/components/FriendGameModal";
import { MoveTimerBar } from "@game/components/MoveTimer";
import { assetUrl } from "@game/lib/assets";
import { trackEvent } from "@game/lib/firebase";
import { useT } from "@game/lib/i18n";
import { DIFFICULTIES, setDifficulty, useDifficulty } from "@game/lib/difficulty";
import { endDailyRun, nextRunId, setDailyRun, useDailyRun } from "@game/lib/daily";
import { GameModeKey, MODIFIERS_BY_MODE, Modifier, effectiveModifier, setModifier, useModifierChoice, weeklyModifier } from "@game/lib/modifiers";

// Екран партії проти бота (як у прототипі), спільний для 3×3, 5×5 і гіга-поля:
// - смуга над полем: "Заново", "Гра з другом", плитки режимів, складність ("світлофор") і
//   модифікатори; у виклику дня чи рівні кампанії - плашка з ціллю замість виборів;
// - рядок рахунку з підказкою ("Твій хід", "Бот думає...") одразу після нього;
// - поле, праворуч від нього (або під ним на вузькому екрані) - бустери "Скасувати хід" і "Підказка".

// Rewarded-реклама агрегатора: є - бустер після безкоштовної спроби можна взяти за рекламу.
export const RewardedAdContext = createContext<(() => Promise<boolean>) | undefined>(undefined);

const Root = styled.div`
    /* Ширина поля - і рядків над/під ним. Запас по висоті - шапка, смуга виборів, рядок рахунку
       й ряд бустерів під полем; від 800px бустери збоку, тож запас менший. Верхня межа 628px -
       щоб колонка бустерів вміщалась у 760px. */
    --board-w: min(100%, 628px, max(280px, calc(100dvh - 236px)));
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding-bottom: 16px;

    @media (min-width: 800px) {
        --board-w: min(100%, 628px, max(280px, calc(100dvh - 184px)));
    }
`;

// Смуга над полем - один рядок; на вузькому екрані прокручується вбік.
const Bar = styled.div`
    position: relative;
    z-index: 25;
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 6px;
    width: 100%;
    min-width: 0;

    @media (max-width: 480px) {
        gap: 4px;
        overflow-x: auto;
        scrollbar-width: none;
    }
`;

const PushRight = styled.div`
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
`;

const ModeTile = styled.button`
    position: relative;
    flex-shrink: 0;
    width: 52px;
    height: 52px;
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

const BarMod = styled(ModButton)`
    && {
        --gb-c: 12px;
        width: 40px;
        height: 40px;
        min-height: 40px;
    }

    @media (max-width: 480px) {
        && {
            --gb-c: 11px;
            width: 36px;
            height: 36px;
            min-height: 36px;
        }

        & > svg {
            width: 18px;
            height: 18px;
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
const ScoreTop = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    width: var(--board-w);
`;

const ScorePill = styled.div`
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
    background: rgba(255, 246, 230, 0.55);
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
`;

const lineIn = keyframes`
    from { opacity: 0; transform: translateY(3px); }
    to { opacity: 1; transform: none; }
`;

// Підказка-статус: статичний рядок; новий текст плавно проявляється (key = текст).
const TurnLine = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1 1 auto;
    min-width: 0;
    min-height: 22px;
    color: #0f6f8c;
    font-size: 16px;
    font-weight: 800;
    line-height: 1.2;
    text-shadow: 0 1px 0 rgba(255, 250, 235, 0.8);
    animation: ${lineIn} 0.35s ease both;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
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
const BoardHolder = styled.div`
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

const ResultButton = styled(GameButton)`
    width: var(--board-w);
`;

type BoosterKind = "undo" | "hint";

// Бустери: кожен один раз за партію безкоштовно, далі - за rewarded-рекламу (якщо вона є).
const useBoosters = (resetKey: unknown) => {
    const rewarded = useContext(RewardedAdContext);
    const [free, setFree] = useState<Record<BoosterKind, boolean>>({ undo: true, hint: true });
    useEffect(() => setFree({ undo: true, hint: true }), [resetKey]);
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
    const weekly = weeklyModifier();
    const [friendOpen, setFriendOpen] = useState(false);
    const booster = useBoosters(boosters.resetKey);
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
            <RoundButton type="button" onClick={() => void openFriend()} aria-label={t("playWithFriend")} data-tip={t("playWithFriend")}>
                <ActionIcon id="friend" />
            </RoundButton>
        </>
    );

    const modTip = (m: Modifier | null) => (m ? t(`modifier_${m}`) : t("modifier_none")) + (m && m === weekly ? ` · ${t("weeklyModifierTag")}` : "");

    const goal = run
        ? run.kind === "campaign"
            ? `${t("campaignLevel", { n: String((run.level ?? 0) + 1) })}: ${t(`level_${run.template.id}` as Parameters<typeof t>[0])}`
            : `${t("dailyBadge", { n: String(run.day) })}: ${t(`daily_${run.template.id}` as Parameters<typeof t>[0])}`
        : "";

    const boosterButton = (kind: BoosterKind, enabled: boolean, onUse: () => void) => {
        const name = kind === "undo" ? t("boosterUndo") : t("boosterHint");
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
        <Root>
            <Bar>
                {quick ? (
                    <>
                        {actionButtons}
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
                        <PushRight>
                            <DiffGroup role="group" aria-label={t("difficultyLabel")}>
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
                            <ModRow role="group" aria-label={t("modifierLabel")}>
                                {[null, ...MODIFIERS_BY_MODE[mode]].map((m) => (
                                    <BarMod
                                        key={m ?? "none"}
                                        type="button"
                                        aria-pressed={activeModifier === m}
                                        aria-label={modTip(m)}
                                        data-tip={modTip(m)}
                                        onClick={() => pickModifier(m)}
                                    >
                                        <ModIcon id={m} />
                                    </BarMod>
                                ))}
                            </ModRow>
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
                    <MoveTimerBar fraction={timer} />
                </div>
            )}

            <ScoreTop>
                <ScorePill>
                    <span>{t("ai")}</span>
                    <b>{score.ai}</b>
                    <span>—</span>
                    <b>{score.human}</b>
                    <span>{humanName ?? t("player")}</span>
                </ScorePill>
                <TurnLine key={firstHint ? "first" : status} role="status" aria-live="polite">
                    {firstHint ? (
                        <>
                            <Cross />
                            {t("firstMoveHint")}
                        </>
                    ) : (
                        status
                    )}
                </TurnLine>
            </ScoreTop>

            <BoardHolder>
                {board}
                {quick && (
                    <Boosters>
                        {boosterButton("undo", boosters.canUndo, boosters.onUndo)}
                        {boosterButton("hint", boosters.canHint, boosters.onHint)}
                    </Boosters>
                )}
            </BoardHolder>

            {over && quick && onShowResult && (
                <ResultButton tone="primary" size="lg" onClick={onShowResult}>
                    {t("showResult")}
                </ResultButton>
            )}

            {friendOpen && <FriendGameModal onClose={() => setFriendOpen(false)} onRoomReady={onRoomReady} defaultMode={FRIEND_MODE[mode]} />}
        </Root>
    );
};
