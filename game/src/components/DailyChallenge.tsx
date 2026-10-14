"use client";
import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Overlay } from "@game/components/gameStyles";
import { ModalCard, ModalCloseButton, ModalTitle, ModalSubtitle, PillButton } from "@game/components/onlineStyles";
import { addGameEventListener, trackEvent } from "@game/lib/firebase";
import { setDifficultyOverride } from "@game/lib/difficulty";
import {
    DailyMode,
    DailyResult,
    currentStreak,
    endDailyRun,
    dayNumber,
    getDailyRun,
    recordDailyResult,
    setDailyRun,
    shareText,
    starsFor,
    templateForDay,
    todayKey,
    useDailyState,
} from "@game/lib/daily";
import { useT } from "@game/lib/i18n";

// Кнопка виклику дня - у лівому верхньому куті, дзеркально до SoundToggle.
const DailyButtonEl = styled.button`
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 1500;
    height: 44px;
    min-width: 44px;
    padding: 0 10px;
    border: none;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    color: #6b4a25;
    font-weight: 800;
    font-size: 14px;
    background: linear-gradient(155deg, #f5e0b6 0%, #e6c890 100%);
    box-shadow:
        3px 3px 6px rgba(101, 72, 35, 0.3),
        -1px -1px 2px rgba(255, 250, 235, 0.5);
    touch-action: manipulation;

    &:focus-visible {
        outline: 3px solid #1fb3d9;
        outline-offset: 2px;
    }
`;

const Dot = styled.span`
    position: absolute;
    top: -3px;
    right: -3px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #e8452f;
    box-shadow: 0 0 0 2px #fff4e2;
`;

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

const Star = ({ on }: { on: boolean }) => (
    <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true">
        <path
            d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"
            fill={on ? "#f5b82e" : "#e3d3b8"}
            stroke={on ? "#c98a12" : "#cdb995"}
            strokeWidth="1.2"
            strokeLinejoin="round"
        />
    </svg>
);

const StarRow = ({ count, label }: { count: number; label: string }) => (
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
    const [view, setView] = useState<View>(null);
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
                if (name !== "game_finished" || run.finished) return;
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
                trackEvent("daily_finished", { day: run.day, template: run.template.id, stars: daily.stars });
                const shown = saved.results[todayKey()] ?? daily;
                setTimeout(() => setView({ kind: "result", result: shown }), 900);
            }),
        []
    );

    const start = () => {
        setView(null);
        setDifficultyOverride(template.difficulty);
        setDailyRun({ template, day, finished: false });
        trackEvent("daily_started", { day, template: template.id });
        onStart(template.mode);
    };

    const closeAll = () => {
        setView(null);
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
            <DailyButtonEl
                type="button"
                onClick={() => setView({ kind: "info" })}
                aria-label={`${t("dailyBadge", { n: String(day) })}${todayResult ? "" : `, ${t("dailyNotPlayed")}`}`}
                title={t("dailyTitle")}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="16" rx="3" />
                    <path d="M3 10h18M8 3v4M16 3v4" />
                </svg>
                {streak > 0 && <span>{streak}</span>}
                {!todayResult && <Dot aria-hidden="true" />}
            </DailyButtonEl>

            {view && (
                <>
                    <Overlay onClick={closeAll} style={{ zIndex: 1600 }} />
                    <ModalCard role="dialog" aria-modal="true" aria-labelledby="daily-title" onClick={(e) => e.stopPropagation()} style={{ zIndex: 1601 }}>
                        <ModalCloseButton onClick={closeAll} aria-label={t("close")}>
                            ×
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
