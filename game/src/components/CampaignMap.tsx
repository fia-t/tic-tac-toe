"use client";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { IconClose } from "@game/components/GameIcons";
import { buttonTone, gameButtonCss } from "@game/components/GameButton";
import { Overlay } from "@game/components/gameStyles";
import { ModalCard, ModalCloseButton, ModalTitle, ModalSubtitle, PillButton } from "@game/components/onlineStyles";
import { Card, Eyebrow, Muted, Page, Spread } from "@game/components/pageStyles";
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
    useCampaign,
} from "@game/lib/campaign";
import { earnCoins } from "@game/lib/wallet";
import { useT } from "@game/lib/i18n";
import { openPanel } from "@game/lib/ui";

// Кампанія (як у прототипі) - окрема сторінка нижнього меню: вступна картка й картка на кожен
// розділ із сіткою рівнів. Вікно результату рівня - CampaignResults (живе поза сторінкою,
// бо партія йде на екрані гри).

const Levels = styled.div`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
`;

const LevelButton = styled.button<{ $boss: boolean; $current: boolean }>`
    ${gameButtonCss("lg")}
    width: 100%;
    height: auto;
    aspect-ratio: 1;
    flex-direction: column;
    gap: 2px;
    font: 800 24px/1 var(--font-heading);
    ${({ $boss }) => ($boss ? buttonTone("amber") : "")}
    ${({ $current }) => ($current ? buttonTone("primary") : "")}

    && {
        --gb-c: 18px;
        min-height: 0;
        padding: 0;
    }

    &:disabled {
        color: #8a7660;
    }
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

// Запуск рівня: рівень бота й модифікатор задає сам рівень; дошку скидає TicTacToe за id запуску.
export const startCampaignLevel = (index: number, onStart: (mode: DailyMode) => void): void => {
    const level = CAMPAIGN_LEVELS[index];
    if (!level) return;
    setDifficultyOverride(level.difficulty);
    setModifierOverride(level.modifier ?? null);
    setDailyRun({ kind: "campaign", id: nextRunId(), template: level, day: 0, level: index, finished: false });
    trackEvent("campaign_level_started", { level: level.id });
    onStart(level.mode);
};

type CampaignProps = {
    onStart: (mode: DailyMode) => void;
};

export const CampaignPage: React.FC<CampaignProps> = ({ onStart }) => {
    const t = useT();
    const progress = useCampaign();
    const current = currentLevelIndex(progress);

    return (
        <Page>
            <Card aria-labelledby="campaign-title">
                <h2 id="campaign-title">{t("campaignTitle")}</h2>
                <Muted>{t("campaignHint")}</Muted>
            </Card>

            {Array.from({ length: CHAPTER_COUNT }, (_, chapter) => {
                const unlocked = isChapterUnlocked(chapter, progress);
                const stars = chapterStars(chapter, progress);
                const chapterLevels = CAMPAIGN_LEVELS.filter((level) => level.chapter === chapter).length;
                return (
                    <Card key={chapter} aria-labelledby={`chapter-${chapter}`}>
                        <Spread>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <Eyebrow>{t("chapterLabel", { n: String(chapter + 1) })}</Eyebrow>
                                <h2 id={`chapter-${chapter}`}>{t(`chapter_${chapter}` as Parameters<typeof t>[0])}</h2>
                            </div>
                            <Muted style={{ textAlign: "right" }}>
                                {t(`chapterSub_${chapter}` as Parameters<typeof t>[0])}
                                <br />
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 800 }}>
                                    <Star on size={14} /> {stars} / {chapterLevels * 3}
                                </span>
                            </Muted>
                        </Spread>
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
                                        onClick={() => startCampaignLevel(index, onStart)}
                                        aria-label={label}
                                        title={open ? t(`level_${level.id}` as Parameters<typeof t>[0]) : undefined}
                                    >
                                        {index + 1}
                                        {open ? (
                                            <MiniStars>
                                                {[0, 1, 2].map((i) => (
                                                    <Star key={i} on={i < levelStars} size={14} />
                                                ))}
                                            </MiniStars>
                                        ) : (
                                            <Lock />
                                        )}
                                    </LevelButton>
                                );
                            })}
                        </Levels>
                    </Card>
                );
            })}
        </Page>
    );
};

type Result = { level: number; result: "win" | "draw" | "lose"; stars: number; coins: number };

// Кінець партії рівня: зірки (кращий результат лишається), монети за нові зірки, картка.
export const CampaignResults: React.FC<CampaignProps> = ({ onStart }) => {
    const t = useT();
    const progress = useCampaign();
    const [result, setResult] = useState<Result | null>(null);

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

    if (!result) return null;

    const start = (index: number) => {
        setResult(null);
        startCampaignLevel(index, onStart);
    };
    const nextIndex = result.level + 1;
    const canGoNext = nextIndex < CAMPAIGN_LEVELS.length && isLevelUnlocked(nextIndex, progress);

    return (
        <>
            <Overlay onClick={() => setResult(null)} style={{ zIndex: 1600 }} />
            <ModalCard role="dialog" aria-modal="true" aria-labelledby="level-result-title" onClick={(e) => e.stopPropagation()} style={{ zIndex: 1601 }}>
                <ModalCloseButton onClick={() => setResult(null)} aria-label={t("close")}>
                    <IconClose size={16} />
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
    );
};
