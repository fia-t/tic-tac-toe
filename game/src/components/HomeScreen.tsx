"use client";
import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { GameButton } from "@game/components/GameButton";
import { DiffButton, DiffGroup, ModButton, ModIcon, ModRow } from "@game/components/GameOptions";
import { FriendGameModal } from "@game/components/FriendGameModal";
import { Star, startDailyChallenge } from "@game/components/DailyChallenge";
import { Flame } from "@game/components/TopBar";
import { LeagueBadge } from "@game/components/LeagueCup";
import { Card, Eyebrow, InfoPill, Muted, Page, Progress, Row, Spread, TwoCol } from "@game/components/pageStyles";
import { assetUrl } from "@game/lib/assets";
import { trackEvent } from "@game/lib/firebase";
import { useT } from "@game/lib/i18n";
import { currentStreak, dayNumber, templateForDay, todayKey, useDailyState } from "@game/lib/daily";
import { CAMPAIGN_LEVELS, currentLevelIndex, totalStars, useCampaign } from "@game/lib/campaign";
import { DIFFICULTIES, setDifficulty, useDifficulty } from "@game/lib/difficulty";
import { GameModeKey, MODIFIERS_BY_MODE, Modifier, effectiveModifier, setModifier, useModifierChoice, weeklyModifier } from "@game/lib/modifiers";
import { levelForXp, useProfile } from "@game/lib/profile";
import { dailyReward } from "@game/lib/wallet";
import { openPanel, useOpenPanel } from "@game/lib/ui";
import { QuickMatch } from "@game/components/QuickMatch";
import { useMyRating } from "@game/lib/matchmaking";

// Головний екран (як у прототипі): привітання з рівнем і лігою, швидка гра, виклик дня,
// модифікатор тижня й кампанія, онлайн. Саме поле - окремий екран (GameScreen).

const Hero = styled.section`
    display: flex;
    align-items: center;
    gap: 14px;

    h1 {
        flex: 1;
        min-width: 0;
        margin: 0;
        font-size: 30px;
        line-height: 1.05;
        color: #4a2c0c;
        text-wrap: balance;
    }

    /* На телефоні привітання в один рядок, щоб "Швидка гра" з кнопкою "Грати" вмістилась без прокрутки. */
    @media (max-width: 480px) {
        h1 {
            font-size: 20px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    }
`;

const HeroBadges = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    margin-left: auto;
`;

const Modes = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
`;

// Режими - великі плитки (готові PNG), щоб одразу привертали увагу; вибраний - піднятий,
// з бірюзовим сяйвом.
const ModeButton = styled.button`
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    font: inherit;
    font-size: 17px;
    font-weight: 800;
    color: #4a2c0c;
    border-radius: 18px;

    img {
        width: 100%;
        max-width: 148px;
        aspect-ratio: 1;
        transition:
            transform 0.15s ease,
            filter 0.15s ease;
    }

    &[aria-pressed="true"] img {
        transform: translateY(-4px) scale(1.05);
        filter: drop-shadow(0 0 12px rgba(31, 179, 217, 0.55));
    }

    &[aria-pressed="true"] span {
        color: #0f6f8c;
    }

    @media (hover: hover) {
        &:not([aria-pressed="true"]):hover img {
            filter: drop-shadow(0 3px 5px rgba(73, 48, 31, 0.14));
        }
    }

    &:focus-visible {
        outline: 3px solid #1fb3d9;
        outline-offset: 2px;
    }

    @media (max-width: 480px) {
        font-size: 15px;
    }
`;

// Складність (зліва) і модифікатори (справа) - один ряд; на вузькому екрані переноситься на два.
// Над кожною групою - підпис, під нею - опис вибраного. Тултіпи модифікаторів - під іконками.
const QuickOpts = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px 12px;
`;

const OptGroup = styled.div<{ $fit?: boolean }>`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    ${({ $fit }) => ($fit ? "width: min-content; max-width: 100%;" : "")}

    &:hover,
    &:focus-within {
        z-index: 26;
    }
`;

// Опис вибраного: назва жирним, далі пояснення, не більше двох рядків. Місце під другий рядок
// не резервується (як у прототипі) - так "Грати" стоїть ближче до виборів.
const OptInfo = styled.div`
    color: #7a5530;
    font-size: 14px;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;

    strong {
        color: #49301f;
    }
`;

const ModScroll = styled(ModRow)`
    /* Ряд іконок прокручується вбік і обрізав би тултіп - місце під тултіп знизу. */
    overflow-x: auto;
    padding: 2px 2px 32px;
    margin: 0 0 -32px;
    scrollbar-width: none;

    @media (max-width: 480px) {
        padding-left: 0;
        padding-right: 0;
    }
`;

const DayNumber = styled.div`
    font: 800 46px/0.9 var(--font-heading);
    color: #b32f1c;
    font-variant-numeric: tabular-nums;
`;

const flash = keyframes`
    0%, 100% { box-shadow: inset 0 -5px 0 #ebcb98, 0 12px 24px rgba(70, 40, 10, 0.16), 0 0 0 0 rgba(31, 179, 217, 0); }
    30% { box-shadow: inset 0 -5px 0 #ebcb98, 0 12px 24px rgba(70, 40, 10, 0.16), 0 0 0 5px rgba(31, 179, 217, 0.55); }
`;

const DailyCard = styled(Card)`
    &[data-flash="true"] {
        animation: ${flash} 1.2s ease-in-out;
    }
`;

const StreakPill = styled(InfoPill)`
    min-height: 46px;
    font-size: 16px;
`;

// Усі модифікатори в порядку прототипу.
const ALL_MODIFIERS: Modifier[] = ["vanish", "gravity", "stones", "timer", "misere"];

const MODES: { id: GameModeKey; img: string; label: "modeClassic" | "modeFive" | "tooltipHard" }[] = [
    { id: "traditional", img: "images/traditional.png", label: "modeClassic" },
    { id: "five", img: "images/game-5x5.png", label: "modeFive" },
    { id: "difficult", img: "images/difficult.png", label: "tooltipHard" },
];

type HomeScreenProps = {
    name: string | null;
    initialMode: GameModeKey;
    onPlay: (mode: GameModeKey) => void;
    onRoomReady: (roomId: string) => void;
    onBeforeFriendOpen?: () => Promise<boolean>;
    // Вогник серії в шапці: що більше значення - прокрутити до картки виклику дня й підсвітити її.
    focusDaily: number;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ name, initialMode, onPlay, onRoomReady, onBeforeFriendOpen, focusDaily }) => {
    const t = useT();
    const [mode, setMode] = useState<GameModeKey>(initialMode);
    const [friendOpen, setFriendOpen] = useState(false);
    const [dailyFlash, setDailyFlash] = useState(false);
    const dailyRef = useRef<HTMLElement>(null);
    const daily = useDailyState();
    const campaign = useCampaign();
    const profile = useProfile();
    const myRating = useMyRating();
    const panel = useOpenPanel();
    const difficulty = useDifficulty();
    const choice = useModifierChoice();
    const activeModifier = effectiveModifier(mode, choice);

    const today = todayKey();
    const template = templateForDay(today);
    const todayResult = daily.results[today];
    const streak = currentStreak(daily);
    const weekly = weeklyModifier();
    const stars = totalStars(campaign);
    const maxStars = CAMPAIGN_LEVELS.length * 3;
    const next = currentLevelIndex(campaign);
    const passed = CAMPAIGN_LEVELS.filter((level) => (campaign.stars[level.id] ?? 0) > 0).length;

    useEffect(() => {
        if (!focusDaily) return;
        // Після переходу на головну TicTacToe спершу прокручує на початок сторінки - тож
        // до картки прокручуємо трохи згодом.
        const scroll = setTimeout(() => dailyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
        setDailyFlash(true);
        const timer = setTimeout(() => setDailyFlash(false), 1300);
        return () => {
            clearTimeout(scroll);
            clearTimeout(timer);
        };
    }, [focusDaily]);

    const play = (target: GameModeKey) => {
        trackEvent("select_mode", { mode: target, from: "home" });
        onPlay(target);
    };

    const openFriend = async () => {
        trackEvent("friend_modal_open", { from: "home" });
        if (onBeforeFriendOpen && !(await onBeforeFriendOpen())) return;
        setFriendOpen(true);
    };

    const pickModifier = (value: Modifier | null) => {
        if (value === activeModifier) return;
        trackEvent("select_modifier", { modifier: value ?? "none", mode, from: "home" });
        setModifier(value);
    };

    const modTip = (m: Modifier | null) => (m ? t(`modifier_${m}`) : t("modifier_none")) + (m && m === weekly ? ` · ${t("weeklyModifierTag")}` : "");
    const weeklyMode = (MODES.find((m) => MODIFIERS_BY_MODE[m.id].includes(weekly)) ?? MODES[0]).id;
    const dailyRules = template.goal === "win" ? t("homeDailyRulesWin", { par: String(template.par) }) : t("homeDailyRulesSurvive");

    return (
        <Page>
            <Hero>
                <h1>{t("homeGreeting", { name: name ?? t("player") })}</h1>
                <HeroBadges>
                    <InfoPill>{t("profileLevel", { n: String(levelForXp(profile.xp)) })}</InfoPill>
                    <LeagueBadge rating={myRating.rating} compact />
                </HeroBadges>
            </Hero>

            <Card aria-labelledby="home-quick">
                <h2 id="home-quick">{t("homeQuick")}</h2>
                <Modes role="group" aria-label={t("homeQuick")}>
                    {MODES.map((m) => (
                        <ModeButton key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
                            <img src={assetUrl(m.img)} alt="" />
                            <span>{t(m.label)}</span>
                        </ModeButton>
                    ))}
                </Modes>
                <QuickOpts>
                    <OptGroup>
                        <Eyebrow id="home-diff">{t("difficultyLabel")}</Eyebrow>
                        <DiffGroup role="group" aria-labelledby="home-diff">
                            {DIFFICULTIES.map((level) => (
                                <DiffButton
                                    key={level}
                                    type="button"
                                    $level={level}
                                    aria-pressed={difficulty === level}
                                    onClick={() => {
                                        if (level === difficulty) return;
                                        trackEvent("select_difficulty", { difficulty: level, from: "home" });
                                        setDifficulty(level);
                                    }}
                                >
                                    {t(`difficulty_${level}`)}
                                </DiffButton>
                            ))}
                        </DiffGroup>
                        <OptInfo>
                            <strong>{t(`difficulty_${difficulty}`)}</strong> · {t(`diffNote_${difficulty}`)}
                        </OptInfo>
                    </OptGroup>
                    <OptGroup $fit>
                        <Eyebrow id="home-mod">{t("modifierLabel")}</Eyebrow>
                        <ModScroll role="group" aria-labelledby="home-mod">
                            {/* Показуємо всі модифікатори; ті, що не пасують обраному режиму, - неактивні. */}
                            {[null, ...ALL_MODIFIERS].map((m) => (
                                <ModButton
                                    key={m ?? "none"}
                                    type="button"
                                    aria-pressed={activeModifier === m}
                                    aria-label={modTip(m)}
                                    data-tip={modTip(m)}
                                    disabled={m !== null && !MODIFIERS_BY_MODE[mode].includes(m)}
                                    onClick={() => pickModifier(m)}
                                >
                                    <ModIcon id={m} />
                                </ModButton>
                            ))}
                        </ModScroll>
                        <OptInfo>
                            <strong>{activeModifier ? t(`modifier_${activeModifier}`) : t("modifier_none")}</strong> ·{" "}
                            {activeModifier ? t(`modifierDesc_${activeModifier}`) : t("modifierNoneDesc")}
                        </OptInfo>
                    </OptGroup>
                </QuickOpts>
                <GameButton tone="primary" size="lg" block onClick={() => play(mode)} style={{ marginTop: -4 }}>
                    {t("homePlay")}
                </GameButton>
            </Card>

            <Card aria-labelledby="home-online">
                <Spread>
                    <h2 id="home-online">{t("homeOnline")}</h2>
                    <LeagueBadge rating={myRating.rating} withRating />
                </Spread>
                <TwoCol>
                    <GameButton tone="danger" size="lg" onClick={() => openPanel("match")}>
                        {t("homeMatch")}
                    </GameButton>
                    <GameButton size="lg" onClick={() => void openFriend()}>
                        {t("homeFriend")}
                    </GameButton>
                </TwoCol>
                <Muted>{t("homeOnlineHint")}</Muted>
                <GameButton size="lg" onClick={() => openPanel("leaderboard")}>
                    {t("homeLeaderboard")}
                </GameButton>
            </Card>

            <DailyCard ref={dailyRef} $tone="daily" data-flash={dailyFlash} aria-labelledby="home-daily">
                <Spread>
                    <Eyebrow>{t("homeDaily")}</Eyebrow>
                    <StreakPill>
                        <Flame />
                        {t("homeStreakDays", { n: String(streak) })}
                    </StreakPill>
                </Spread>
                <Row style={{ alignItems: "flex-end", gap: 14, flexWrap: "nowrap" }}>
                    <DayNumber>#{dayNumber(today)}</DayNumber>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <h3 id="home-daily">{t(`daily_${template.id}` as Parameters<typeof t>[0])}</h3>
                        <Muted>{dailyRules}</Muted>
                    </div>
                </Row>
                {todayResult ? (
                    <>
                        <Spread>
                            <Row style={{ gap: 6 }} role="img" aria-label={`${todayResult.stars} / 3`}>
                                {[0, 1, 2].map((i) => (
                                    <Star key={i} on={i < todayResult.stars} size={28} />
                                ))}
                            </Row>
                            <GameButton size="lg" onClick={() => openPanel("daily")}>
                                {t("dailyShare")}
                            </GameButton>
                        </Spread>
                        <Muted>{t("homeDailyNext")}</Muted>
                    </>
                ) : (
                    <GameButton tone="primary" size="lg" block onClick={() => startDailyChallenge(onPlay)}>
                        {t("homeDailyPlay", { n: String(dailyReward(streak + 1)) })}
                    </GameButton>
                )}
            </DailyCard>

            <TwoCol>
                <Card aria-labelledby="home-weekly">
                    <Eyebrow>{t("homeWeekly")}</Eyebrow>
                    <h3 id="home-weekly">{t(`modifier_${weekly}`)}</h3>
                    <Muted>{t(`modifierDesc_${weekly}`)}</Muted>
                    <GameButton
                        tone="amber"
                        size="lg"
                        onClick={() => {
                            setModifier(weekly);
                            play(weeklyMode);
                        }}
                    >
                        {t("homeTryWeekly")}
                    </GameButton>
                </Card>
                <Card aria-labelledby="home-campaign">
                    <Eyebrow>{t("homeCampaign")}</Eyebrow>
                    <h3 id="home-campaign">
                        {t("homeCampaignNext", {
                            n: String(next + 1),
                            name: t(`chapter_${CAMPAIGN_LEVELS[next].chapter}` as Parameters<typeof t>[0]),
                        })}
                    </h3>
                    <Progress role="img" aria-label={t("campaignStars", { n: String(stars), total: String(maxStars) })}>
                        <i style={{ width: `${(stars / maxStars) * 100}%` }} />
                    </Progress>
                    <Muted>
                        {t("homeCampaignStats", { n: String(stars), total: String(maxStars), done: String(passed), levels: String(CAMPAIGN_LEVELS.length) })}
                    </Muted>
                    <GameButton size="lg" onClick={() => openPanel("campaign")}>
                        {t("homeToMap")}
                    </GameButton>
                </Card>
            </TwoCol>

            {panel === "match" && <QuickMatch fallbackName={name} onMatched={onRoomReady} onPlayBot={() => play("traditional")} />}

            {friendOpen && <FriendGameModal onClose={() => setFriendOpen(false)} onRoomReady={onRoomReady} defaultMode={mode === "five" ? "5x5" : "3x3"} />}
        </Page>
    );
};
