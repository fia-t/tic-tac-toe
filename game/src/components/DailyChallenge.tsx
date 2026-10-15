"use client";
import { IconClose } from "@game/components/GameIcons";
import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Overlay } from "@game/components/gameStyles";
import { ModalCard, ModalCloseButton, ModalTitle, ModalSubtitle, PillButton } from "@game/components/onlineStyles";
import { addGameEventListener, trackEvent } from "@game/lib/firebase";
import { setDifficultyOverride } from "@game/lib/difficulty";
import { setModifierOverride } from "@game/lib/modifiers";
import {
    DailyMode,
    DailyResult,
    currentStreak,
    endDailyRun,
    dayNumber,
    getDailyRun,
    nextRunId,
    recordDailyResult,
    setDailyRun,
    shareText,
    starsFor,
    templateForDay,
    todayKey,
    useDailyState,
} from "@game/lib/daily";
import { useT } from "@game/lib/i18n";
import { closePanel, useOpenPanel } from "@game/lib/ui";
import { dailyReward } from "@game/lib/wallet";

// Виклик дня: картка на головній запускає партію сама (startDailyChallenge); тут - вікна
// результату й "Поділитися" (openPanel("daily")). Серія - вогник у верхньому ряду (TopBar).

// Старт виклику дня: рівень бота й модифікатор задає виклик; дошку скидає TicTacToe за id запуску.
export const startDailyChallenge = (onStart: (mode: DailyMode) => void): void => {
    const today = todayKey();
    const template = templateForDay(today);
    const day = dayNumber(today);
    closePanel();
    setDifficultyOverride(template.difficulty);
    setModifierOverride(template.modifier ?? null);
    setDailyRun({ kind: "daily", id: nextRunId(), template, day, finished: false });
    trackEvent("daily_started", { day, template: template.id });
    onStart(template.mode);
};

const Stars = styled.div`
    display: flex;
    justify-content: center;
    gap: 6px;
    margin: 4px 0 10px;
`;

const Rules = styled.p`
    margin: 0 0 6px;
    color: #6b4a25;
    font-size: 14px;
    line-height: 1.45;
`;

const ShareBox = styled.textarea`
    width: 100%;
    box-sizing: border-box;
    min-height: 130px;
    margin: 6px 0 4px;
    padding: 10px;
    border-radius: 12px;
    border: 2px solid #ebcb98;
    background: #fffdf8;
    color: #4a2c0c;
    font: 600 14px/1.35 ui-monospace, Consolas, monospace;
    resize: vertical;
`;

const CopyNote = styled.div`
    min-height: 18px;
    font-size: 13px;
    color: #6b4a25;
    text-align: center;
`;

export const Star = ({ on, size = 34 }: { on: boolean; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
            d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"
            fill={on ? "#1fb3d9" : "#d3edf3"}
            stroke={on ? "#0f6f8c" : "#9fcfdc"}
            strokeWidth="1.2"
            strokeLinejoin="round"
        />
    </svg>
);

export const StarRow = ({ count, label }: { count: number; label: string }) => (
    <Stars role="img" aria-label={label}>
        {[0, 1, 2].map((i) => (
            <Star key={i} on={i < count} />
        ))}
    </Stars>
);

type DailyChallengeProps = {
    // Перемикає гру в режим виклику (TicTacToe скидає дошку сам - див. useDailyRun там).
    onStart: (mode: DailyMode) => void;
    // Посилання для шерингу: на порталі - game.shareLink() SDK, на сайті - адреса сайту.
    getShareLink?: () => Promise<string | null>;
};

type View = { kind: "info" } | { kind: "result"; result: DailyResult } | null;

export const DailyChallenge: React.FC<DailyChallengeProps> = ({ onStart, getShareLink }) => {
    const t = useT();
    const state = useDailyState();
    const [resultView, setView] = useState<View>(null);
    const panelOpen = useOpenPanel() === "daily";
    const view: View = resultView ?? (panelOpen ? { kind: "info" } : null);
    const [shareOpen, setShareOpen] = useState(false);
    const [link, setLink] = useState<string>(typeof window !== "undefined" ? window.location.origin : "");
    const [copyNote, setCopyNote] = useState("");
    const shareRef = useRef<HTMLTextAreaElement>(null);

    const today = todayKey();
    const day = dayNumber(today);
    const template = templateForDay(today);
    const todayResult = state.results[today];
    const streak = currentStreak(state);

    useEffect(() => {
        if (!getShareLink) return;
        void getShareLink().then((value) => {
            if (value) setLink(value);
        });
    }, [getShareLink]);

    // Кінець партії виклику: зірки, серія, збереження й картка результату (з тією ж паузою,
    // що й звичайний попап, щоб спершу було видно виграшну лінію). Новий рестарт або
    // інший режим посеред виклику - вихід з нього без зарахування.
    useEffect(
        () =>
            addGameEventListener((name, params) => {
                const run = getDailyRun();
                if (!run) return;
                if (name === "game_restart" || name === "select_mode") {
                    endDailyRun();
                    return;
                }
                if (name !== "game_finished" || run.finished || run.kind !== "daily") return;
                const result = params?.result === "win" ? "win" : params?.result === "draw" ? "draw" : "lose";
                const moves = typeof params?.moves === "number" ? params.moves : 0;
                const daily: DailyResult = {
                    result,
                    moves,
                    stars: starsFor(run.template, result, moves),
                    grid: typeof params?.grid === "string" ? params.grid : "",
                };
                const saved = recordDailyResult(daily);
                setDailyRun({ ...run, finished: true });
                trackEvent("daily_finished", { day: run.day, template: run.template.id, stars: daily.stars, streak: currentStreak(saved) });
                const shown = saved.results[todayKey()] ?? daily;
                setTimeout(() => setView({ kind: "result", result: shown }), 900);
            }),
        []
    );

    const start = () => {
        setView(null);
        startDailyChallenge(onStart);
    };

    const closeAll = () => {
        setView(null);
        closePanel();
        setShareOpen(false);
        setCopyNote("");
    };

    const shown = view?.kind === "result" ? view.result : todayResult;
    const text = shown
        ? shareText(day, shown, Math.max(streak, 1), link, {
              title: `Tic Tac Toe · ${t("dailyTitle")}`,
              moves: t("dailyMoves"),
              streak: t("dailyStreakShort"),
          })
        : "";

    const copy = () => {
        const fallback = () => {
            shareRef.current?.focus();
            shareRef.current?.select();
            setCopyNote(t("dailyCopyFallback"));
        };
        try {
            navigator.clipboard.writeText(text).then(() => setCopyNote(t("dailyCopied")), fallback);
        } catch {
            fallback();
        }
    };

    const starsLabel = (n: number) => `${n} / 3`;
    const rules = template.goal === "win" ? t("dailyRuleWin", { par: String(template.par) }) : t("dailyRuleSurvive");

    return (
        <>
            {view && (
                <>
                    <Overlay onClick={closeAll} style={{ zIndex: 1600 }} />
                    <ModalCard role="dialog" aria-modal="true" aria-labelledby="daily-title" onClick={(e) => e.stopPropagation()} style={{ zIndex: 1601 }}>
                        <ModalCloseButton onClick={closeAll} aria-label={t("close")}>
                    <IconClose size={16} />
                </ModalCloseButton>
                        <ModalTitle id="daily-title">{t("dailyBadge", { n: String(day) })}</ModalTitle>

                        {view.kind === "result" ? (
                            <>
                                <ModalSubtitle>
                                    {view.result.result === "win"
                                        ? t("resultWin")
                                        : view.result.result === "draw"
                                        ? t("resultDraw")
                                        : t("resultLose")}
                                </ModalSubtitle>
                                <StarRow count={view.result.stars} label={starsLabel(view.result.stars)} />
                                <Rules>{view.result.stars === 0 ? t("dailyFailed") : t("dailyStreak", { n: String(Math.max(streak, 1)) })}</Rules>
                            </>
                        ) : (
                            <>
                                <ModalSubtitle>{t(`daily_${template.id}` as Parameters<typeof t>[0])}</ModalSubtitle>
                                {todayResult ? (
                                    <>
                                        <StarRow count={todayResult.stars} label={starsLabel(todayResult.stars)} />
                                        <Rules>{t("dailyPlayed")}. {t("dailyNext")}</Rules>
                                    </>
                                ) : (
                                    <>
                                        <Rules>{rules}</Rules>
                                        <Rules>{t("dailySame")}</Rules>
                                        <Rules>{t("dailyReward", { n: String(dailyReward(streak + 1)) })}</Rules>
                                    </>
                                )}
                                {streak > 0 && <Rules>{t("dailyStreak", { n: String(streak) })}</Rules>}
                            </>
                        )}

                        {shown && shareOpen && (
                            <>
                                <ShareBox ref={shareRef} readOnly value={text} aria-label={t("dailyShare")} />
                                <CopyNote aria-live="polite">{copyNote}</CopyNote>
                            </>
                        )}

                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                            {!todayResult && view.kind === "info" && (
                                <PillButton type="button" onClick={start}>
                                    {t("dailyPlay")}
                                </PillButton>
                            )}
                            {shown &&
                                (shareOpen ? (
                                    <PillButton type="button" onClick={copy}>
                                        {t("dailyCopy")}
                                    </PillButton>
                                ) : (
                                    <PillButton type="button" onClick={() => setShareOpen(true)}>
                                        {t("dailyShare")}
                                    </PillButton>
                                ))}
                            <PillButton type="button" $variant="ghost" onClick={closeAll}>
                                {t("close")}
                            </PillButton>
                        </div>
                    </ModalCard>
                </>
            )}
        </>
    );
};
