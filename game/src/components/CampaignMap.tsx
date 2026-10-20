"use client";
import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { buttonTone, gameButtonCss, GameButton } from "@game/components/GameButton";
import { ResultPopup, RewardBase, RoundSummary, rewardsSince, snapshotRewards } from "@game/components/ResultPopup";
import { Card, Eyebrow, InfoPill, Muted, Page, Spread } from "@game/components/pageStyles";
import { Star } from "@game/components/DailyChallenge";
import { ModIcon } from "@game/components/GameOptions";
import { BossPortrait } from "@game/components/CampaignArt";
import { albumArt } from "@game/components/AlbumArt";
import { InfoTip, Tab, Tabs } from "@game/components/HomeScreen";
import { Overlay } from "@game/components/gameStyles";
import { ModalCard, ModalCloseButton } from "@game/components/onlineStyles";
import { IconClose } from "@game/components/GameIcons";
import { addGameEventListener, trackEvent } from "@game/lib/firebase";
import { setDifficultyOverride } from "@game/lib/difficulty";
import { setModifierOverride } from "@game/lib/modifiers";
import { DailyMode, getDailyRun, nextRunId, setDailyRun, starsFor } from "@game/lib/daily";
import {
    AlbumCard,
    CAMPAIGN_CHAPTERS,
    CAMPAIGN_LEVELS,
    COINS_PER_NEW_STAR,
    CampaignLevel,
    albumCards,
    chapterLevels,
    chapterStars,
    claimCampaignRewards,
    currentLevelIndex,
    isChapterDone,
    isLevelUnlocked,
    recordLevelStars,
    useCampaign,
} from "@game/lib/campaign";
import { CampaignChapterDef, bossLine, bossName, chapterBackground, chapterName, chapterSubtitle, levelTitle } from "@game/lib/campaignContent";
import { earnCoins, grantSkin } from "@game/lib/wallet";
import { CAMPAIGN_THEMES, themeName, type Theme } from "@game/lib/themes";
import { assetUrl } from "@game/lib/assets";
import { useT } from "@game/lib/i18n";
import { openPanel } from "@game/lib/ui";

// Кампанія (як у прототипі) - сторінка нижнього меню: шапка з "?" і зірками; на кожен розділ -
// картка з артом, рівнями (у боса - портрет), нагородою; внизу - альбом карток. Натискання на
// рівень відкриває вікно з умовами й зірками; "Грати" - на поле. Вікно результату -
// CampaignResults (живе поза сторінкою, бо партія йде на екрані гри).

const MODE_IMG: Record<DailyMode, string> = { traditional: "images/traditional.png", five: "images/game-5x5.png", difficult: "images/difficult.png" };
const MODE_LABEL: Record<DailyMode, "modeClassic" | "modeFive" | "tooltipHard"> = { traditional: "modeClassic", five: "modeFive", difficult: "tooltipHard" };

const ChapterHead = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;

    h2 {
        margin: 0;
    }
`;

const ChapterArt = styled.div<{ $src: string }>`
    width: 96px;
    aspect-ratio: 16 / 10;
    flex-shrink: 0;
    border-radius: 14px;
    background: ${({ $src }) => ($src ? `url("${$src}") center / cover no-repeat` : "#efe3cf")};
    box-shadow: 0 4px 10px rgba(70, 40, 10, 0.18);
`;

const Levels = styled.div`
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 8px;

    @media (max-width: 560px) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
`;

const LevelButton = styled.button<{ $boss: boolean; $current: boolean }>`
    ${gameButtonCss("lg")}
    width: 100%;
    height: auto;
    aspect-ratio: 1;
    flex-direction: column;
    gap: 3px;
    font: 800 22px/1 var(--font-heading);
    ${({ $boss }) => ($boss ? buttonTone("amber") : "")}
    ${({ $current }) => ($current ? buttonTone("primary") : "")}

    && {
        --gb-c: 18px;
        min-height: 0;
        padding: 0;
    }

    /* Закритий рівень - приглушений, але номер та іконку модифікатора видно (замок під ними). */
    &&:disabled {
        filter: grayscale(0.5) opacity(0.85);
        color: #6f5a44;
    }

    &:disabled {
        color: #8a7660;
    }

    svg {
        flex-shrink: 0;
    }
`;

const LevelIcon = styled.span`
    display: grid;
    place-items: center;
    height: 18px;
    color: inherit;
    opacity: 0.85;
`;

const MiniStars = styled.span`
    display: flex;
    gap: 1px;
`;

const Reward = styled.div<{ $got: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 14px;
    background: ${({ $got }) => ($got ? "rgba(47, 138, 62, 0.12)" : "rgba(255, 255, 255, 0.6)")};
    color: ${({ $got }) => ($got ? "#2f6a35" : "#7a5530")};
    font-size: 14px;

    b {
        color: inherit;
    }
`;

// Вміст вкладки - картки лягають прямо в сторінку, з її відступами.
const TabBody = styled.div`
    display: contents;
`;

const Album = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;

    @media (min-width: 640px) {
        grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    }
`;

const AlbumTile = styled.div<{ $got: boolean; $gold?: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 8px 10px;
    border-radius: 16px;
    text-align: center;
    background: ${({ $got, $gold }) => ($got ? ($gold ? "linear-gradient(160deg, #ffe7a0, #f5c04a)" : "#fff2dc") : "#efe3cf")};
    box-shadow: ${({ $got, $gold }) => ($got ? ($gold ? "inset 0 0 0 2px #d9a12a, 0 0 14px rgba(245, 184, 46, 0.45)" : "inset 0 0 0 2px #ebcb98") : "none")};
    color: ${({ $got }) => ($got ? "#49301f" : "#a8957c")};

    b {
        font-size: 13px;
        line-height: 1.1;
    }

    small {
        font-size: 11px;
        line-height: 1.2;
    }
`;

const AlbumArt = styled.div<{ $src?: string; $gold?: boolean }>`
    display: grid;
    place-items: center;
    width: 100%;
    aspect-ratio: 1;
    border-radius: 12px;
    background: ${({ $src }) =>
        $src ? `url("${$src}") center / cover no-repeat` : "repeating-linear-gradient(45deg, #e2d3bb 0 8px, #e9dcc6 8px 16px)"};
    ${({ $gold }) => ($gold ? "filter: sepia(0.35) saturate(1.3) brightness(1.05);" : "")}
    font: 800 30px/1 var(--font-heading);
    color: #c4ad8c;
    overflow: hidden;
`;

const Conditions = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    margin: 12px 0;
`;

const Condition = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 6px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.6);
    text-align: center;

    img {
        width: 40px;
        height: 40px;
    }

    small {
        font-size: 11px;
        color: #7a5530;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    b {
        font-size: 13px;
        line-height: 1.1;
    }
`;

const ConditionIcon = styled.span<{ $bg: string; $fg: string }>`
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: ${({ $bg }) => $bg};
    color: ${({ $fg }) => $fg};
`;

const StarRules = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 14px;
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.6);

    div {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        color: #7a5530;
    }

    div[data-ok="true"] {
        color: #2f6a35;
        font-weight: 800;
    }
`;

const BossIntro = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding-right: 40px;

    h2 {
        margin: 0 0 4px;
        font-size: 22px;
    }

    p {
        margin: 0;
        font-style: italic;
        font-size: 14px;
        line-height: 1.35;
        color: #7a5530;
    }
`;

const NewCards = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
`;

// Нова картка - нагорода у вікні результату: велика, вилітає з поворотом і світиться.
const NewCardRow = styled.div`
    display: flex;
    width: 100%;
    gap: 8px;
    justify-content: center;

    & > div {
        width: min(180px, 46vw);
        animation: card-in 0.7s cubic-bezier(0.3, 1.5, 0.5, 1) both, card-glow 2.4s ease-in-out 0.7s infinite;
    }

    /* Дві-три картки за раз (напр. розділ, бос і золото) - ділять ширину вікна порівну. */
    & > div:not(:only-child) {
        flex: 1 1 0;
        width: auto;
        min-width: 0;
        max-width: 150px;
    }

    & > div:nth-child(2) {
        animation-delay: 0.15s, 0.85s;
    }

    & > div:nth-child(3) {
        animation-delay: 0.3s, 1s;
    }

    @keyframes card-in {
        from {
            opacity: 0;
            transform: scale(0.4) rotate(-12deg) translateY(20px);
        }
    }

    @keyframes card-glow {
        0%,
        100% {
            filter: drop-shadow(0 0 0 rgba(245, 184, 46, 0));
        }
        50% {
            filter: drop-shadow(0 0 14px rgba(245, 184, 46, 0.75));
        }
    }

    @media (prefers-reduced-motion: reduce) {
        & > div {
            animation: none;
        }
    }
`;

// Відкрити кампанію одразу на вкладці "Альбом" (з вікна результату з новою карткою).
let albumRequested = false;
export const openAlbum = (): void => {
    albumRequested = true;
    openPanel("campaign");
};

const DIFF_COLOR: Record<string, [string, string, string]> = {
    easy: ["#2f8a3e", "#fff7e8", "#2f8a3e"],
    medium: ["#f2b53a", "#4a2c0c", "#b8730c"],
    master: ["#c8382a", "#fff7e8", "#c8382a"],
};

const Lock = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
);

const PuzzleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 8h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4H4z" />
    </svg>
);

const BotIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="5" y="8" width="14" height="11" rx="3" />
        <path d="M12 4v4M9.5 13h.01M14.5 13h.01M9.5 16h5" />
    </svg>
);

const GiftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
        <rect x="3.5" y="9" width="17" height="11.5" rx="2" />
        <path d="M2.5 9h19M12 9v11.5M12 9c-1.5-4-6-5-6-2 0 1.5 2.5 2 6 2zM12 9c1.5-4 6-5 6-2 0 1.5-2.5 2-6 2z" />
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
    // "Повернутися в меню" у вікні результату рівня.
    onMenu?: () => void;
    // Активні теми - щоб назвати скін-нагороду розділу.
    themes?: Theme[];
};

const rewardText = (chapter: CampaignChapterDef, themes: Theme[] | undefined, t: ReturnType<typeof useT>): string => {
    const parts: string[] = [];
    if (chapter.rewardSkinId) {
        const skin = [...(themes ?? []), ...CAMPAIGN_THEMES].find((theme) => theme.id === chapter.rewardSkinId);
        parts.push(t("campaignRewardSkin", { name: skin ? themeName(skin) : chapter.rewardSkinId }));
    }
    if (chapter.rewardCoins > 0) parts.push(t("campaignRewardCoins", { n: String(chapter.rewardCoins) }));
    return parts.join(" + ");
};

const cardName = (card: AlbumCard, t: ReturnType<typeof useT>): string => {
    const chapter = CAMPAIGN_CHAPTERS[card.chapter];
    if (!chapter) return "";
    return card.kind === "boss" ? bossName(chapter) || t("campaignBoss") : card.kind === "gold" ? t("albumGold", { name: chapterName(chapter) }) : chapterName(chapter);
};

export const AlbumTileView: React.FC<{ card: AlbumCard; got: boolean }> = ({ card, got }) => {
    const t = useT();
    const chapter = CAMPAIGN_CHAPTERS[card.chapter];
    if (!chapter) return null;
    // Анімована сцена картки (AlbumArt.ts); для розділів з адмінки її може не бути.
    const scene = got ? albumArt(chapter.id, card.kind) : null;
    const art = !got ? (
        <AlbumArt>?</AlbumArt>
    ) : scene ? (
        <AlbumArt style={{ background: "none" }} dangerouslySetInnerHTML={{ __html: scene }} />
    ) : card.kind === "boss" ? (
        <AlbumArt style={{ background: "#fff8ec" }}>
            <BossPortrait chapterId={chapter.id} size={84} />
        </AlbumArt>
    ) : (
        <AlbumArt $src={chapterBackground(chapter)} $gold={card.kind === "gold"} />
    );
    return (
        <AlbumTile $got={got} $gold={card.kind === "gold"} title={got ? cardName(card, t) : t(`albumNeed_${card.kind}`)}>
            {art}
            <b>{got ? cardName(card, t) : "???"}</b>
            <small>{got ? t(`albumGot_${card.kind}`) : t(`albumNeed_${card.kind}`)}</small>
        </AlbumTile>
    );
};

// Вікно рівня перед стартом: у боса - портрет і фраза; умови партії; за що зірки.
const LevelInfo: React.FC<{ index: number; onClose: () => void; onStart: (mode: DailyMode) => void }> = ({ index, onClose, onStart }) => {
    const t = useT();
    const progress = useCampaign();
    const level: CampaignLevel | undefined = CAMPAIGN_LEVELS[index];
    if (!level) return null;
    const chapter = CAMPAIGN_CHAPTERS[level.chapter];
    const have = progress.stars[level.id] ?? 0;
    const [bg, fg, text] = DIFF_COLOR[level.difficulty];
    return (
        <>
            <Overlay onClick={onClose} style={{ zIndex: 1600 }} />
            <ModalCard role="dialog" aria-modal="true" aria-labelledby="level-info-title" style={{ zIndex: 1601 }}>
                <ModalCloseButton onClick={onClose} aria-label={t("close")}>
                    <IconClose size={16} />
                </ModalCloseButton>
                <Eyebrow>
                    {t("campaignLevel", { n: String(index + 1) })} · {chapter && chapterName(chapter)}
                </Eyebrow>
                {level.boss && chapter ? (
                    <BossIntro style={{ marginTop: 8 }}>
                        <BossPortrait chapterId={chapter.id} size={84} />
                        <div>
                            <h2 id="level-info-title">{bossName(chapter) || levelTitle(level)}</h2>
                            {chapter.bossLine && <p>«{bossLine(chapter)}»</p>}
                        </div>
                    </BossIntro>
                ) : (
                    <h2 id="level-info-title" style={{ margin: "6px 44px 0 0", fontSize: 22, lineHeight: 1.1 }}>
                        {levelTitle(level)}
                    </h2>
                )}
                <Conditions aria-label={t("dailySpec")}>
                    <Condition>
                        <img src={assetUrl(MODE_IMG[level.mode])} alt="" />
                        <small>{t("dailyField")}</small>
                        <b>{t(MODE_LABEL[level.mode])}</b>
                    </Condition>
                    <Condition>
                        <ConditionIcon $bg="#f6dcae" $fg="#49301f">
                            <ModIcon id={level.modifier ?? null} />
                        </ConditionIcon>
                        <small>{t("dailyModifier")}</small>
                        <b>{level.modifier ? t(`modifier_${level.modifier}`) : level.preset ? t("campaignPuzzle") : t("dailyNoModifier")}</b>
                    </Condition>
                    <Condition>
                        <ConditionIcon $bg={bg} $fg={fg}>
                            <BotIcon />
                        </ConditionIcon>
                        <small>{t("dailyBot")}</small>
                        <b style={{ color: text }}>{t(`difficulty_${level.difficulty}`)}</b>
                    </Condition>
                </Conditions>
                <StarRules aria-label={t("campaignStarRules")}>
                    {(level.goal === "survive" ? [3] : [1, 2, 3]).map((n) => (
                        <div key={n} data-ok={have >= n}>
                            <span style={{ display: "flex", gap: 2 }} aria-hidden="true">
                                {[0, 1, 2].map((i) => (
                                    <Star key={i} on={i < n} size={16} />
                                ))}
                            </span>
                            <span>
                                {level.goal === "survive"
                                    ? t("campaignRuleSurvive")
                                    : n === 1
                                    ? t("campaignRuleDraw")
                                    : n === 2
                                    ? t("campaignRuleWin")
                                    : t("campaignRuleFast", { n: String(level.par), moves: level.par % 10 >= 2 && level.par % 10 <= 4 && (level.par < 12 || level.par > 14) ? t("movesFew") : level.par % 10 === 1 && level.par !== 11 ? t("movesOne") : t("movesMany") })}
                            </span>
                        </div>
                    ))}
                </StarRules>
                <GameButton
                    tone="primary"
                    size="lg"
                    block
                    onClick={() => {
                        onClose();
                        startCampaignLevel(index, onStart);
                    }}
                >
                    {have ? t("campaignReplay") : level.boss ? t("campaignFight") : t("homePlay")}
                </GameButton>
            </ModalCard>
        </>
    );
};

export const CampaignPage: React.FC<CampaignProps> = ({ onStart, themes }) => {
    const t = useT();
    const progress = useCampaign();
    const current = currentLevelIndex(progress);
    const [info, setInfo] = useState<number | null>(null);
    // Розділи з рівнями й альбом - дві вкладки екрана кампанії.
    const [tab, setTab] = useState<"chapters" | "album">(() => {
        const album = albumRequested;
        albumRequested = false;
        return album ? "album" : "chapters";
    });
    const cardsGot = progress.cards.filter((id) => albumCards().some((card) => card.id === id)).length;
    const total = CAMPAIGN_LEVELS.reduce((sum, level) => sum + (progress.stars[level.id] ?? 0), 0);

    // Картки й нагороди за вже зароблене (напр. після оновлення гри) - без окремого вікна.
    useEffect(() => {
        const got = claimCampaignRewards();
        got.chapters.forEach((chapter) => {
            earnCoins(chapter.rewardCoins);
            grantSkin(chapter.rewardSkinId);
        });
    }, [progress.stars]);

    return (
        <Page>
            <Tabs $cols={2} role="tablist" aria-label={t("campaignTitle")}>
                {(["chapters", "album"] as const).map((id) => (
                    <Tab key={id} type="button" role="tab" id={`campaign-tab-${id}`} aria-selected={tab === id} aria-controls="campaign-tabpanel" onClick={() => setTab(id)}>
                        {id === "chapters" ? t("campaignTabChapters") : `${t("albumTitle")} · ${cardsGot} / ${albumCards().length}`}
                    </Tab>
                ))}
            </Tabs>

            {tab === "chapters" && (
                <TabBody role="tabpanel" id="campaign-tabpanel" aria-labelledby="campaign-tab-chapters">
                    <Card aria-labelledby="campaign-title">
                        <Spread>
                            <h2 id="campaign-title" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                {t("campaignTitle")}
                                <InfoTip text={t("campaignInfo", { levels: String(CAMPAIGN_LEVELS.length), chapters: String(CAMPAIGN_CHAPTERS.length) })} />
                            </h2>
                            <InfoPill>
                                <Star on size={18} /> {total} / {CAMPAIGN_LEVELS.length * 3}
                            </InfoPill>
                        </Spread>
                        <Muted>{t("campaignIntro")}</Muted>
                    </Card>

                    {CAMPAIGN_CHAPTERS.map((chapter, ci) => {
                        const levels = chapterLevels(ci);
                        const done = isChapterDone(ci, progress);
                        const reward = rewardText(chapter, themes, t);
                        return (
                            <Card key={chapter.id} aria-labelledby={`chapter-${chapter.id}`}>
                                <ChapterHead>
                                    <ChapterArt $src={chapterBackground(chapter)} aria-hidden="true" />
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                                        <Eyebrow>
                                            {t("chapterLabel", { n: String(ci + 1) })} · {chapterStars(ci, progress)} / {levels.length * 3} ★
                                        </Eyebrow>
                                        <h2 id={`chapter-${chapter.id}`}>{chapterName(chapter)}</h2>
                                        {chapter.subtitle && <Muted>{chapterSubtitle(chapter)}</Muted>}
                                    </div>
                                </ChapterHead>
                                <Levels>
                                    {levels.map((level) => {
                                        const index = CAMPAIGN_LEVELS.indexOf(level);
                                        const open = isLevelUnlocked(index, progress);
                                        const levelStars = progress.stars[level.id] ?? 0;
                                        const label = open
                                            ? t("campaignLevelStars", { n: String(index + 1), boss: level.boss ? `, ${t("campaignBoss")}` : "", stars: String(levelStars) })
                                            : t("campaignLockedLevel", { n: String(index + 1) });
                                        return (
                                            <LevelButton
                                                key={level.id}
                                                type="button"
                                                $boss={Boolean(level.boss)}
                                                $current={open && index === current}
                                                disabled={!open}
                                                onClick={() => setInfo(index)}
                                                aria-label={label}
                                                title={open ? levelTitle(level) : undefined}
                                            >
                                                {level.boss ? <BossPortrait chapterId={chapter.id} size={34} /> : index + 1}
                                                {!level.boss && <LevelIcon>{level.preset ? <PuzzleIcon /> : <ModIcon id={level.modifier ?? null} size={18} />}</LevelIcon>}
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
                                {reward && (
                                    <Reward $got={done}>
                                        <GiftIcon />
                                        <span>
                                            {done ? t("campaignRewardGot") : t("campaignReward")} <b>{reward}</b>
                                        </span>
                                    </Reward>
                                )}
                            </Card>
                        );
                    })}

                </TabBody>
            )}

            {tab === "album" && (
                <TabBody role="tabpanel" id="campaign-tabpanel" aria-labelledby="campaign-tab-album">
                    <Card aria-labelledby="album-title">
                        <Spread>
                            <h2 id="album-title" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                {t("albumTitle")}
                                <InfoTip text={t("albumInfo")} />
                            </h2>
                            <InfoPill>
                                {cardsGot} / {albumCards().length}
                            </InfoPill>
                        </Spread>
                        <Album>
                            {albumCards().map((card) => (
                                <AlbumTileView key={card.id} card={card} got={progress.cards.includes(card.id)} />
                            ))}
                        </Album>
                    </Card>
                </TabBody>
            )}

            {info !== null && <LevelInfo index={info} onClose={() => setInfo(null)} onStart={onStart} />}
        </Page>
    );
};

type Result = {
    level: number;
    result: "win" | "draw" | "lose";
    stars: number;
    coins: number;
    summary: RoundSummary;
    cards: AlbumCard[];
    chapters: string[];
};

// Монети й досвід на старті рівня - щоб вікно результату показало, скільки додалось за рівень.
let levelBase: RewardBase = { coins: 0, xp: 0 };

// Кінець партії рівня: зірки (кращий результат лишається), монети за нові зірки, нові картки
// альбому й нагорода за розділ, якщо його щойно пройдено.
export const CampaignResults: React.FC<CampaignProps> = ({ onStart, onMenu = () => undefined, themes }) => {
    const t = useT();
    const progress = useCampaign();
    const [result, setResult] = useState<Result | null>(null);
    // Підписка на події одна на весь час життя, а теми довантажуються пізніше - беремо актуальні.
    const themesRef = useRef(themes);
    themesRef.current = themes;

    useEffect(
        () =>
            addGameEventListener((name, params) => {
                // Старт рівня (і "Заново" на ньому) - точка відліку нагород.
                if (name === "campaign_level_started") levelBase = snapshotRewards();
                const run = getDailyRun();
                if (!run || run.kind !== "campaign" || run.finished || name !== "game_finished" || run.level === undefined) return;
                const outcome = params?.result === "win" ? "win" : params?.result === "draw" ? "draw" : "lose";
                const pieces = typeof params?.moves === "number" ? params.moves : 0;
                // У par - лише ходи гравця: стартові фішки головоломки не рахуються.
                const moves = Math.max(0, pieces - (run.template.preset?.X.length ?? 0));
                const stars = starsFor(run.template, outcome, moves);
                const newStars = recordLevelStars(run.template.id, stars);
                const coins = newStars * COINS_PER_NEW_STAR;
                earnCoins(coins);
                const got = claimCampaignRewards();
                got.chapters.forEach((chapter) => {
                    earnCoins(chapter.rewardCoins);
                    grantSkin(chapter.rewardSkinId);
                });
                setDailyRun({ ...run, finished: true });
                trackEvent("campaign_level_finished", { level: run.template.id, stars, result: outcome });
                const level = run.level;
                setTimeout(
                    () =>
                        setResult({
                            level,
                            result: outcome,
                            stars,
                            coins,
                            summary: rewardsSince(levelBase, moves),
                            cards: got.cards,
                            chapters: got.chapters.map((chapter) => t("campaignChapterDone", { name: chapterName(chapter), reward: rewardText(chapter, themesRef.current, t) })),
                        }),
                    900
                );
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- підписка одна на весь час життя
        []
    );

    if (!result) return null;

    const start = (index: number) => {
        setResult(null);
        startCampaignLevel(index, onStart);
    };
    const nextIndex = result.level + 1;
    const canGoNext = nextIndex < CAMPAIGN_LEVELS.length && isLevelUnlocked(nextIndex, progress);
    const level = CAMPAIGN_LEVELS[result.level];
    const gotCards = result.cards.length > 0;

    const extra =
        result.coins > 0 || result.cards.length || result.chapters.length ? (
            <>
                {result.coins > 0 && <div>{t("campaignNewStars", { n: String(result.coins) })}</div>}
                {result.chapters.map((line) => (
                    <div key={line}>{line}</div>
                ))}
                {result.cards.length > 0 && (
                    <NewCards>
                        <Eyebrow>{t("albumNewCard")}</Eyebrow>
                        <NewCardRow>
                            {result.cards.map((card) => (
                                <AlbumTileView key={card.id} card={card} got />
                            ))}
                        </NewCardRow>
                    </NewCards>
                )}
            </>
        ) : undefined;

    // Те саме вікно результату, що й у швидкій грі: зірки рівня, нагороди, далі - наступний
    // рівень (або ще раз), карта кампанії й меню.
    return (
        <ResultPopup
            result={result.result}
            summary={result.summary}
            eyebrow={`${t("campaignLevel", { n: String(result.level + 1) })} · ${level ? levelTitle(level) : ""}`}
            stars={result.stars}
            extra={extra}
            onClose={() => {
                // Нова картка - нагорода: після закриття вікна ведемо в альбом подивитись на неї.
                setResult(null);
                if (gotCards) openAlbum();
            }}
            onRestart={() => start(canGoNext ? nextIndex : result.level)}
            restartLabel={canGoNext ? t("campaignNext") : t("campaignRetry")}
            secondary={
                gotCards
                    ? {
                          label: t("albumOpen"),
                          onClick: () => {
                              setResult(null);
                              openAlbum();
                          },
                      }
                    : canGoNext
                    ? { label: t("campaignRetry"), onClick: () => start(result.level) }
                    : {
                          label: t("campaignMap"),
                          onClick: () => {
                              setResult(null);
                              openPanel("campaign");
                          },
                      }
            }
            onMenu={() => {
                setResult(null);
                onMenu();
            }}
        />
    );
};
