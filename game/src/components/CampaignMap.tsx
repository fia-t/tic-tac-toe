"use client";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { gameButtonCss } from "@game/components/GameButton";
import { Overlay } from "@game/components/gameStyles";
import { ModalCard, ModalCloseButton, ModalTitle, ModalSubtitle, PillButton } from "@game/components/onlineStyles";
import { Star, StarRow } from "@game/components/DailyChallenge";
import { addGameEventListener, trackEvent } from "@game/lib/firebase";
import { setDifficultyOverride } from "@game/lib/difficulty";
import { setModifierOverride } from "@game/lib/modifiers";
import { DailyMode, getDailyRun, nextRunId, setDailyRun, starsFor } from "@game/lib/daily";
import {
    CAMPAIGN_LEVELS,
    CHAPTER_COUNT,
    CHAPTER_UNLOCK_STARS,
    COINS_PER_NEW_STAR,
    chapterStars,
    currentLevelIndex,
    isChapterUnlocked,
    isLevelUnlocked,
    recordLevelStars,
    totalStars,
    useCampaign,
} from "@game/lib/campaign";
import { earnCoins } from "@game/lib/wallet";
import { useT } from "@game/lib/i18n";
import { closePanel, openPanel, useOpenPanel } from "@game/lib/ui";

const MapButton = styled.button`
    ${gameButtonCss("sm")}
    gap: 6px;
    font-variant-numeric: tabular-nums;
`;

const Chapter = styled.section`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 0 4px;
    border-top: 2px dashed rgba(139, 101, 60, 0.25);
`;

const ChapterHead = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    color: #4a2c0c;

    h3 {
        margin: 0;
        font-size: 18px;
    }
`;

const Muted = styled.p`
    margin: 0;
    color: #6b4a25;
    font-size: 13px;
    line-height: 1.4;
`;

const Levels = styled.div`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
`;

const LevelButton = styled.button<{ $boss: boolean; $current: boolean }>`
    ${gameButtonCss("lg")}
    width: 100%;
    height: auto;
    min-height: 0;
    aspect-ratio: 1;
    padding: 0;
    flex-direction: column;
    gap: 2px;
    font-size: 20px;
    ${({ $boss }) => ($boss ? "filter: sepia(0.35) saturate(1.8) hue-rotate(-8deg);" : "")}
    ${({ $current }) => ($current ? "color: #0f6f8c; filter: brightness(0.93) saturate(1.3);" : "")}
`;

const MiniStars = styled.span`
    display: flex;
    gap: 1px;
`;

const Note = styled.p`
    margin: 0 0 8px;
    text-align: center;
    color: #2f6b38;
    font-weight: 800;
`;

const Lock = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
);

type Result = { level: number; result: "win" | "draw" | "lose"; stars: number; coins: number };

type CampaignMapProps = {
    // Перемикає гру в режим рівня (скидання дошки й пресет - у TicTacToe за id запуску).
    onStart: (mode: DailyMode) => void;
};

export const CampaignMap: React.FC<CampaignMapProps> = ({ onStart }) => {
    const t = useT();
    const progress = useCampaign();
    const mapOpen = useOpenPanel() === "campaign";
    const [result, setResult] = useState<Result | null>(null);

    const total = totalStars(progress);
    const maxStars = CAMPAIGN_LEVELS.length * 3;
    const current = currentLevelIndex(progress);

    // Кінець партії рівня: зірки (кращий результат лишається), монети за нові зірки, картка.
    useEffect(
        () =>
            addGameEventListener((name, params) => {
                const run = getDailyRun();
                if (!run || run.kind !== "campaign" || run.finished || name !== "game_finished" || run.level === undefined) return;
                const outcome = params?.result === "win" ? "win" : params?.result === "draw" ? "draw" : "lose";
                const moves = typeof params?.moves === "number" ? params.moves : 0;
                const stars = starsFor(run.template, outcome, moves);
                const newStars = recordLevelStars(run.template.id, stars);
                const coins = newStars * COINS_PER_NEW_STAR;
                earnCoins(coins);
                setDailyRun({ ...run, finished: true });
                trackEvent("campaign_level_finished", { level: run.template.id, stars, result: outcome });
                const level = run.level;
                setTimeout(() => setResult({ level, result: outcome, stars, coins }), 900);
            }),
        []
    );

    const start = (index: number) => {
        const level = CAMPAIGN_LEVELS[index];
        if (!level) return;
        closePanel();
        setResult(null);
        setDifficultyOverride(level.difficulty);
        setModifierOverride(level.modifier ?? null);
        setDailyRun({ kind: "campaign", id: nextRunId(), template: level, day: 0, level: index, finished: false });
        trackEvent("campaign_level_started", { level: level.id });
        onStart(level.mode);
    };

    const nextIndex = result ? result.level + 1 : -1;
    const canGoNext = result !== null && nextIndex < CAMPAIGN_LEVELS.length && isLevelUnlocked(nextIndex, progress);

    return (
        <>
            <MapButton
                type="button"
                onClick={() => openPanel("campaign")}
                aria-label={t("campaignOpen", { n: String(total), total: String(maxStars) })}
                title={t("campaignTitle")}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
                    <path d="M9 4v14M15 6v14" />
                </svg>
                <Star on size={16} />
                <span>{total}</span>
            </MapButton>

            {mapOpen && (
                <>
                    <Overlay onClick={() => closePanel()} style={{ zIndex: 1600 }} />
                    <ModalCard role="dialog" aria-modal="true" aria-labelledby="campaign-title" onClick={(e) => e.stopPropagation()} style={{ zIndex: 1601 }}>
                        <ModalCloseButton onClick={() => closePanel()} aria-label={t("close")}>
                            ×
                        </ModalCloseButton>
                        <ModalTitle id="campaign-title">{t("campaignTitle")}</ModalTitle>
                        <ModalSubtitle>{t("campaignStars", { n: String(total), total: String(maxStars) })}</ModalSubtitle>
                        <Muted>{t("campaignHint")}</Muted>

                        {Array.from({ length: CHAPTER_COUNT }, (_, chapter) => {
                            const unlocked = isChapterUnlocked(chapter, progress);
                            const stars = chapterStars(chapter, progress);
                            const name = t(`chapter_${chapter}` as Parameters<typeof t>[0]);
                            return (
                                <Chapter key={chapter} aria-labelledby={`chapter-${chapter}`}>
                                    <ChapterHead>
                                        <h3 id={`chapter-${chapter}`}>
                                            {chapter + 1}. {name}
                                        </h3>
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 800 }}>
                                            <Star on size={16} /> {stars} / 24
                                        </span>
                                    </ChapterHead>
                                    <Muted>{t(`chapterSub_${chapter}` as Parameters<typeof t>[0])}</Muted>
                                    {!unlocked && (
                                        <Muted>
                                            {t("chapterLocked", {
                                                name: t(`chapter_${chapter - 1}` as Parameters<typeof t>[0]),
                                                n: String(CHAPTER_UNLOCK_STARS),
                                                have: String(chapterStars(chapter - 1, progress)),
                                            })}
                                        </Muted>
                                    )}
                                    <Levels>
                                        {CAMPAIGN_LEVELS.map((level, index) => {
                                            if (level.chapter !== chapter) return null;
                                            const open = isLevelUnlocked(index, progress);
                                            const levelStars = progress.stars[level.id] ?? 0;
                                            const label = open
                                                ? t("campaignLevelStars", {
                                                      n: String(index + 1),
                                                      boss: level.boss ? `, ${t("campaignBoss")}` : "",
                                                      stars: String(levelStars),
                                                  })
                                                : t("campaignLockedLevel", { n: String(index + 1) });
                                            return (
                                                <LevelButton
                                                    key={level.id}
                                                    type="button"
                                                    $boss={Boolean(level.boss)}
                                                    $current={open && index === current}
                                                    disabled={!open}
                                                    onClick={() => start(index)}
                                                    aria-label={label}
                                                    title={open ? t(`level_${level.id}` as Parameters<typeof t>[0]) : undefined}
                                                >
                                                    {index + 1}
                                                    {open ? (
                                                        <MiniStars>
                                                            {[0, 1, 2].map((i) => (
                                                                <Star key={i} on={i < levelStars} size={13} />
                                                            ))}
                                                        </MiniStars>
                                                    ) : (
                                                        <Lock />
                                                    )}
                                                </LevelButton>
                                            );
                                        })}
                                    </Levels>
                                </Chapter>
                            );
                        })}

                        <PillButton type="button" $variant="ghost" onClick={() => closePanel()}>
                            {t("close")}
                        </PillButton>
                    </ModalCard>
                </>
            )}

            {result && (
                <>
                    <Overlay onClick={() => setResult(null)} style={{ zIndex: 1600 }} />
                    <ModalCard role="dialog" aria-modal="true" aria-labelledby="level-result-title" onClick={(e) => e.stopPropagation()} style={{ zIndex: 1601 }}>
                        <ModalCloseButton onClick={() => setResult(null)} aria-label={t("close")}>
                            ×
                        </ModalCloseButton>
                        <ModalTitle id="level-result-title">{t("campaignLevel", { n: String(result.level + 1) })}</ModalTitle>
                        <ModalSubtitle>
                            {result.result === "win" ? t("resultWin") : result.result === "draw" ? t("resultDraw") : t("resultLose")} ·{" "}
                            {t(`level_${CAMPAIGN_LEVELS[result.level].id}` as Parameters<typeof t>[0])}
                        </ModalSubtitle>
                        <StarRow count={result.stars} label={`${result.stars} / 3`} />
                        {result.coins > 0 && <Note>{t("campaignNewStars", { n: String(result.coins) })}</Note>}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {canGoNext && (
                                <PillButton type="button" onClick={() => start(nextIndex)}>
                                    {t("campaignNext")}
                                </PillButton>
                            )}
                            <PillButton type="button" $variant={canGoNext ? "ghost" : undefined} onClick={() => start(result.level)}>
                                {t("campaignRetry")}
                            </PillButton>
                            <PillButton
                                type="button"
                                $variant="ghost"
                                onClick={() => {
                                    setResult(null);
                                    openPanel("campaign");
                                }}
                            >
                                {t("campaignMap")}
                            </PillButton>
                        </div>
                    </ModalCard>
                </>
            )}
        </>
    );
};
