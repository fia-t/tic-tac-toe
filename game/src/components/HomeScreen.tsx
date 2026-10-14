"use client";
import React, { useState } from "react";
import styled from "styled-components";
import { buttonTone, gameButtonCss } from "@game/components/GameButton";
import { DifficultyPicker } from "@game/components/DifficultyPicker";
import { FriendGameModal } from "@game/components/FriendGameModal";
import { Star } from "@game/components/DailyChallenge";
import { assetUrl } from "@game/lib/assets";
import { trackEvent } from "@game/lib/firebase";
import { useT } from "@game/lib/i18n";
import { currentStreak, dayNumber, templateForDay, todayKey, useDailyState } from "@game/lib/daily";
import { CAMPAIGN_LEVELS, currentLevelIndex, totalStars, useCampaign } from "@game/lib/campaign";
import { GameModeKey, MODIFIERS_BY_MODE, setModifier, weeklyModifier } from "@game/lib/modifiers";
import { levelForXp, useProfile } from "@game/lib/profile";
import { Panel, openPanel, useOpenPanel } from "@game/lib/ui";
import { QuickMatch } from "@game/components/QuickMatch";
import { useMyRating } from "@game/lib/matchmaking";
import { leagueFor } from "@game/lib/rating";

// Головний екран (як у прототипі): виклик дня, швидка гра, модифікатор тижня, кампанія,
// онлайн і нижня навігація. Саме поле - окремий екран (TicTacToe, screen === "game").

const Page = styled.div`
    width: min(100%, 560px);
    display: flex;
    flex-direction: column;
    gap: 14px;
    /* Місце під нижню навігацію. */
    padding-bottom: 92px;
    color: #4a2c0c;
    font-family: inherit;
`;

const Card = styled.section<{ $tone?: "daily" }>`
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
    padding: 16px;
    border-radius: 24px;
    background: ${({ $tone }) => ($tone === "daily" ? "linear-gradient(160deg, #ffe3a3, #f7d7a6 60%)" : "#fff6e6")};
    box-shadow:
        inset 0 -5px 0 #ebcb98,
        0 12px 24px rgba(70, 40, 10, 0.16);

    h2 {
        margin: 0;
        font-size: 22px;
        line-height: 1.1;
    }

    h3 {
        margin: 0;
        font-size: 17px;
        line-height: 1.2;
    }
`;

const Eyebrow = styled.div`
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #7a5530;
`;

const Hero = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0 4px;

    h1 {
        margin: 0;
        font-size: clamp(24px, 6vw, 30px);
        line-height: 1.1;
        color: #4a2c0c;
        text-shadow: 0 1px 0 rgba(255, 250, 235, 0.8);
    }
`;

const Row = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
`;

const DayNumber = styled.div`
    font-size: 42px;
    font-weight: 800;
    line-height: 0.9;
    color: #b32f1c;
    font-variant-numeric: tabular-nums;
`;

const Muted = styled.p`
    margin: 0;
    color: #6b4a25;
    font-size: 13px;
    line-height: 1.4;
`;

const Big = styled.button<{ $variant?: "primary" | "sand" | "red" | "amber" }>`
    ${gameButtonCss("lg")}
    ${({ $variant }) => buttonTone($variant === "red" ? "danger" : $variant === "sand" ? "default" : $variant === "amber" ? "amber" : "primary")}
`;

const Modes = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
`;

// Картки режимів - готові PNG-плитки (форма й малюнок поля вже в картинці).
const ModeButton = styled.button<{ $on: boolean }>`
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    color: ${({ $on }) => ($on ? "#0f6f8c" : "#4a2c0c")};

    img {
        width: 100%;
        max-width: 104px;
        aspect-ratio: 1;
        transform: ${({ $on }) => ($on ? "translateY(-3px) scale(1.04)" : "none")};
        transition: transform 0.15s ease, filter 0.15s ease;
    }

    /* Без постійної тіні під плиткою; при наведенні - ледь помітна. */
    @media (hover: hover) {
        &:hover img {
            filter: drop-shadow(0 3px 5px rgba(73, 48, 31, 0.14));
        }
    }

    &:focus-visible {
        outline: 3px solid #1fb3d9;
        outline-offset: 2px;
        border-radius: 16px;
    }
`;

const Center = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    min-width: 0;
`;

const Two = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;

    @media (max-width: 440px) {
        grid-template-columns: 1fr;
    }
`;

const Bar = styled.div`
    height: 10px;
    border-radius: 999px;
    background: #f1c88c;
    overflow: hidden;

    & > i {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #1fb3d9, #0f6f8c);
    }
`;

const Nav = styled.nav`
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1400;
    padding: 8px max(10px, env(safe-area-inset-right, 0px)) calc(8px + env(safe-area-inset-bottom, 0px)) max(10px, env(safe-area-inset-left, 0px));
    pointer-events: none;

    & > div {
        max-width: 560px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 4px;
        padding: 6px;
        border-radius: 22px;
        background: #fff6e6;
        box-shadow:
            inset 0 -4px 0 #ebcb98,
            0 10px 26px rgba(70, 40, 10, 0.25);
        pointer-events: auto;
    }
`;

const NavButton = styled.button<{ $on: boolean }>`
    ${gameButtonCss("lg")}
    flex-direction: column;
    gap: 2px;
    padding: 0;
    font-size: 11px;

    svg {
        width: 20px;
        height: 20px;
    }
`;

const NAV_ICONS: Record<"home" | Panel, React.ReactNode> = {
    home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    campaign: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />,
    shop: <path d="M4 8h16l-1.5 12h-13zM8 8a4 4 0 0 1 8 0" />,
    awards: (
        <>
            <circle cx="12" cy="9" r="6" />
            <path d="M8.5 14 7 22l5-3 5 3-1.5-8" />
        </>
    ),
    profile: (
        <>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" />
        </>
    ),
    daily: null,
    leaderboard: null,
    match: null,
    settings: null,
};

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
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ name, initialMode, onPlay, onRoomReady, onBeforeFriendOpen }) => {
    const t = useT();
    const [mode, setMode] = useState<GameModeKey>(initialMode);
    const [friendOpen, setFriendOpen] = useState(false);
    const daily = useDailyState();
    const campaign = useCampaign();
    const profile = useProfile();
    const myRating = useMyRating();
    const panel = useOpenPanel();

    const today = todayKey();
    const template = templateForDay(today);
    const todayResult = daily.results[today];
    const streak = currentStreak(daily);
    const weekly = weeklyModifier();
    const stars = totalStars(campaign);
    const maxStars = CAMPAIGN_LEVELS.length * 3;
    const next = currentLevelIndex(campaign);

    const play = (target: GameModeKey) => {
        trackEvent("select_mode", { mode: target, from: "home" });
        onPlay(target);
    };

    const openFriend = async () => {
        trackEvent("friend_modal_open", { from: "home" });
        if (onBeforeFriendOpen && !(await onBeforeFriendOpen())) return;
        setFriendOpen(true);
    };

    const weeklyMode = (MODES.find((m) => MODIFIERS_BY_MODE[m.id].includes(weekly)) ?? MODES[0]).id;

    return (
        <Page>
            <Hero>
                <Eyebrow>{t("profileLevel", { n: String(levelForXp(profile.xp)) })}</Eyebrow>
                <h1>{t("homeGreeting", { name: name ?? t("player") })}</h1>
            </Hero>

            <Card $tone="daily" aria-labelledby="home-daily">
                <Row style={{ justifyContent: "space-between" }}>
                    <Eyebrow>{t("homeDaily")}</Eyebrow>
                    {streak > 0 && <Eyebrow>{t("dailyStreak", { n: String(streak) })}</Eyebrow>}
                </Row>
                <Row style={{ alignItems: "flex-end", flexWrap: "nowrap" }}>
                    <DayNumber>#{dayNumber(today)}</DayNumber>
                    <h3 id="home-daily" style={{ minWidth: 0 }}>
                        {t(`daily_${template.id}` as Parameters<typeof t>[0])}
                    </h3>
                </Row>
                {todayResult ? (
                    <Row style={{ justifyContent: "space-between" }}>
                        <Row style={{ gap: 4 }} role="img" aria-label={`${todayResult.stars} / 3`}>
                            {[0, 1, 2].map((i) => (
                                <Star key={i} on={i < todayResult.stars} size={26} />
                            ))}
                        </Row>
                        <Big type="button" $variant="sand" onClick={() => openPanel("daily")}>
                            {t("homeShare")}
                        </Big>
                    </Row>
                ) : (
                    <Big type="button" onClick={() => openPanel("daily")}>
                        {t("homePlay")}
                    </Big>
                )}
            </Card>

            <Card aria-labelledby="home-quick">
                <h2 id="home-quick">{t("homeQuick")}</h2>
                <Modes role="group" aria-label={t("homeQuick")}>
                    {MODES.map((m) => (
                        <ModeButton key={m.id} type="button" $on={mode === m.id} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
                            <img src={assetUrl(m.img)} alt="" />
                            <span>{t(m.label)}</span>
                        </ModeButton>
                    ))}
                </Modes>
                <Center>
                    <DifficultyPicker mode={mode} />
                </Center>
                <Big type="button" onClick={() => play(mode)}>
                    {t("homePlay")}
                </Big>
            </Card>

            <Two>
                <Card aria-labelledby="home-weekly">
                    <Eyebrow>{t("homeWeekly")}</Eyebrow>
                    <h3 id="home-weekly">{t(`modifier_${weekly}`)}</h3>
                    <Muted>{t(`modifierDesc_${weekly}`)}</Muted>
                    <Big
                        type="button"
                        $variant="amber"
                        onClick={() => {
                            setModifier(weekly);
                            play(weeklyMode);
                        }}
                    >
                        {t("homeTryWeekly")}
                    </Big>
                </Card>
                <Card aria-labelledby="home-campaign">
                    <Eyebrow>{t("homeCampaign")}</Eyebrow>
                    <h3 id="home-campaign">
                        {t("homeCampaignNext", {
                            n: String(next + 1),
                            name: t(`chapter_${CAMPAIGN_LEVELS[next].chapter}` as Parameters<typeof t>[0]),
                        })}
                    </h3>
                    <Bar role="img" aria-label={t("campaignStars", { n: String(stars), total: String(maxStars) })}>
                        <i style={{ width: `${(stars / maxStars) * 100}%` }} />
                    </Bar>
                    <Muted>{t("campaignStars", { n: String(stars), total: String(maxStars) })}</Muted>
                    <Big type="button" $variant="sand" onClick={() => openPanel("campaign")}>
                        {t("homeToMap")}
                    </Big>
                </Card>
            </Two>

            <Card aria-labelledby="home-online">
                <Row style={{ justifyContent: "space-between" }}>
                    <h2 id="home-online">{t("homeOnline")}</h2>
                    <Eyebrow>{t("profileRating", { rating: String(myRating.rating), league: t(`league_${leagueFor(myRating.rating)}`) })}</Eyebrow>
                </Row>
                <Two>
                    <Big type="button" $variant="red" onClick={() => openPanel("match")}>
                        {t("homeMatch")}
                    </Big>
                    <Big type="button" $variant="sand" onClick={() => void openFriend()}>
                        {t("homeFriend")}
                    </Big>
                </Two>
                <Muted>{t("homeOnlineHint")}</Muted>
                <Big type="button" $variant="sand" onClick={() => openPanel("leaderboard")}>
                    {t("homeLeaderboard")}
                </Big>
            </Card>

            {panel === "match" && <QuickMatch fallbackName={name} onMatched={onRoomReady} onPlayBot={() => play("traditional")} />}

            {friendOpen && <FriendGameModal onClose={() => setFriendOpen(false)} onRoomReady={onRoomReady} defaultMode={mode === "five" ? "5x5" : "3x3"} />}

            <Nav aria-label={t("navLabel")}>
                <div>
                    {(["home", "campaign", "shop", "awards", "profile"] as const).map((item) => (
                        <NavButton
                            key={item}
                            type="button"
                            $on={item === "home"}
                            aria-current={item === "home" ? "page" : undefined}
                            onClick={() => (item === "home" ? window.scrollTo(0, 0) : openPanel(item))}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
                                {NAV_ICONS[item]}
                            </svg>
                            {t(`nav_${item}`)}
                        </NavButton>
                    ))}
                </div>
            </Nav>
        </Page>
    );
};
