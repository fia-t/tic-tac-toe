"use client";
import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { GameButton } from "@game/components/GameButton";
import { DiffButton, DiffGroup, ModButton, ModIcon, ModRow } from "@game/components/GameOptions";
import { FriendGameModal } from "@game/components/FriendGameModal";
import { Star, startDailyChallenge } from "@game/components/DailyChallenge";
import { Flame } from "@game/components/TopBar";
import { LeagueBadge } from "@game/components/LeagueCup";
import { Card, Eyebrow, InfoPill, Muted, Page, Progress, Row, Spread } from "@game/components/pageStyles";
import { ErrorText } from "@game/components/onlineStyles";
import { assetUrl } from "@game/lib/assets";
import { isFirebaseConfigured, trackEvent } from "@game/lib/firebase";
import { useT } from "@game/lib/i18n";
import { currentStreak, dayOfYear, templateForDay, todayKey, useDailyState } from "@game/lib/daily";
import { CAMPAIGN_LEVELS, currentLevelIndex, totalStars, useCampaign } from "@game/lib/campaign";
import { DIFFICULTIES, Difficulty, setDifficulty, useDifficulty } from "@game/lib/difficulty";
import { ALL_MODIFIERS, GameModeKey, MODIFIERS_BY_MODE, Modifier, effectiveModifier, setModifier, useModifierChoice, weeklyModifier } from "@game/lib/modifiers";
import { levelForXp, useProfile } from "@game/lib/profile";
import { dailyReward } from "@game/lib/wallet";
import { openPanel, useOpenPanel } from "@game/lib/ui";
import { createRoom, onlineModifiers } from "@game/lib/onlineGame";
import type { OnlineGameMode } from "@game/components/onlineGameLogic";
import { QuickMatch } from "@game/components/QuickMatch";
import { OnlineNow } from "@game/components/MatchInvite";
import { useMyRating } from "@game/lib/matchmaking";

// Головний екран (варіант "В" з прототипу): привітання з рівнем і лігою, під ним вкладки
// "З ботом / Онлайн / Виклики / Кампанія" - на екрані завжди один розділ, тож сторінка
// не перевантажена. "Онлайн" - гра з другом (поле й модифікатор задаються тут же) і швидкий
// матч. Саме поле - окремий екран (GameScreen).

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

    /* На телефоні привітання в один рядок, щоб розділ під вкладками вміщався без прокрутки. */
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

// Вкладки розділів - як перемикач складності: вибрана - горіхова.
const Tabs = styled.div`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
    padding: 4px;
    border-radius: 18px;
    background: rgba(255, 246, 230, 0.7);
    box-shadow: inset 0 -3px 0 #ebcb98;
`;

const Tab = styled.button`
    min-height: 42px;
    padding: 9px 4px;
    border: none;
    border-radius: 14px;
    background: transparent;
    font: 800 14px/1.1 var(--font-body);
    color: #7a5530;
    cursor: pointer;

    &[aria-selected="true"] {
        background: #7a4a22;
        color: #fff8ec;
        box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.22);
    }

    &:focus-visible {
        outline: 3px solid #1fb3d9;
        outline-offset: 2px;
    }

    @media (max-width: 420px) {
        font-size: 12px;
    }
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

// Підпис групи, ряд кнопок і опис вибраного. Складність і модифікатори - одна під одною на
// всю ширину. Тултіпи модифікаторів - під іконками.
const OptGroup = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;

    &:hover,
    &:focus-within {
        z-index: 26;
    }
`;

// Опис вибраного - завжди в один рядок: довгий обрізається "…", повний текст у title.
const OptInfo = styled.div`
    color: #7a5530;
    font-size: 14px;
    line-height: 1.35;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    strong {
        color: #49301f;
    }
`;

// Назва рівня в описі - у кольорі своєї кнопки (бурштиновий темніший, щоб читався на картці).
const DIFF_TEXT: Record<Difficulty, string> = { easy: "#2f8a3e", medium: "#b8730c", master: "#c8382a" };

const ModScroll = styled(ModRow)`
    /* Ряд іконок вміщається в картку, тож без прокрутки - вона обрізала б тултіпи. Довгі тултіпи
       (з "модифікатор тижня") у крайніх кнопок вирівнюються по краю кнопки. */
    padding: 2px 0 32px;
    margin-bottom: -32px;

    & > button:nth-child(-n + 2)::after {
        left: calc(-1 * var(--gb-c, 0px));
        transform: none;
    }

    & > button:nth-last-child(-n + 2)::after {
        left: auto;
        right: calc(-1 * var(--gb-c, 0px));
        transform: none;
    }
`;

const Center = styled(Muted)`
    text-align: center;
`;

const LinkButton = styled.button`
    align-self: center;
    padding: 2px 4px;
    border: none;
    background: none;
    color: #0f6f8c;
    font: 800 15px/1.2 var(--font-body);
    cursor: pointer;

    &:focus-visible {
        outline: 3px solid #1fb3d9;
        outline-offset: 2px;
        border-radius: 6px;
    }
`;

// Листок календаря: "день" на червоній смужці і номер дня в році - виклик новий щодня.
const DayTile = styled.div`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 72px;
    overflow: hidden;
    border-radius: 14px;
    background: #fffaf0;
    box-shadow:
        inset 0 -3px 0 #ebcb98,
        0 4px 10px rgba(70, 40, 10, 0.12);

    span {
        width: 100%;
        padding: 3px 0 2px;
        background: #b32f1c;
        color: #fff7e8;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-align: center;
        text-transform: uppercase;
    }

    b {
        padding: 4px 0 8px;
        font: 800 28px/1 var(--font-heading);
        color: #b32f1c;
        font-variant-numeric: tabular-nums;
    }
`;

// Умови виклику дня плитками: поле (мініатюра), модифікатор (іконка), бот (у кольорі рівня).
const Spec = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;

    @media (max-width: 480px) {
        gap: 6px;
    }
`;

const SpecItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 8px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.6);

    img {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
    }

    & > span:last-child {
        display: flex;
        flex-direction: column;
        min-width: 0;
        line-height: 1.15;
    }

    small {
        font-size: 11px;
        color: #7a5530;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    b {
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    @media (max-width: 480px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        padding: 6px 8px;

        b {
            font-size: 13px;
            white-space: normal;
        }
    }
`;

const SpecIcon = styled.span<{ $bg: string; $fg: string }>`
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: 12px;
    background: ${({ $bg }) => $bg};
    color: ${({ $fg }) => $fg};
`;

const DIFF_ICON_BG: Record<Difficulty, [string, string]> = { easy: ["#2f8a3e", "#fff7e8"], medium: ["#f2b53a", "#4a2c0c"], master: ["#c8382a", "#fff7e8"] };

const BotIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="5" y="8" width="14" height="11" rx="3" />
        <path d="M12 4v4M9.5 13h.01M14.5 13h.01M9.5 16h5" />
    </svg>
);

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

const MODES: { id: GameModeKey; img: string; label: "modeClassic" | "modeFive" | "tooltipHard" }[] = [
    { id: "traditional", img: "images/traditional.png", label: "modeClassic" },
    { id: "five", img: "images/game-5x5.png", label: "modeFive" },
    { id: "difficult", img: "images/difficult.png", label: "tooltipHard" },
];

const ONLINE_MODE: Record<GameModeKey, OnlineGameMode> = { traditional: "3x3", five: "5x5", difficult: "9x9" };

type HomeTab = "bot" | "online" | "daily" | "campaign";
const TABS: { id: HomeTab; label: "homeTabBot" | "homeTabOnline" | "homeTabDaily" | "homeTabCampaign" }[] = [
    { id: "bot", label: "homeTabBot" },
    { id: "online", label: "homeTabOnline" },
    { id: "daily", label: "homeTabDaily" },
    { id: "campaign", label: "homeTabCampaign" },
];
const TAB_KEY = "ttt-home-tab";

const readTab = (): HomeTab => {
    try {
        const value = localStorage.getItem(TAB_KEY);
        return TABS.some((tab) => tab.id === value) ? (value as HomeTab) : "bot";
    } catch {
        return "bot";
    }
};

type HomeScreenProps = {
    name: string | null;
    initialMode: GameModeKey;
    onPlay: (mode: GameModeKey) => void;
    onRoomReady: (roomId: string) => void;
    onBeforeFriendOpen?: () => Promise<boolean>;
    // Вогник серії в шапці: що більше значення - відкрити вкладку виклику дня й підсвітити картку.
    focusDaily: number;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ name, initialMode, onPlay, onRoomReady, onBeforeFriendOpen, focusDaily }) => {
    const t = useT();
    const [tab, setTabState] = useState<HomeTab>(readTab);
    const [mode, setMode] = useState<GameModeKey>(initialMode);
    // Гра з другом - свій вибір поля й модифікатора, не чіпає налаштувань гри з ботом.
    const [friendMode, setFriendMode] = useState<GameModeKey>(initialMode);
    const [friendMod, setFriendMod] = useState<Modifier | null>(null);
    const [friendBusy, setFriendBusy] = useState(false);
    const [friendError, setFriendError] = useState<string | null>(null);
    const [joinOpen, setJoinOpen] = useState(false);
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
    const friendAllowed = onlineModifiers(ONLINE_MODE[friendMode]);
    const friendModifier = friendMod && friendAllowed.includes(friendMod) ? friendMod : null;

    const today = todayKey();
    const template = templateForDay(today);
    const todayResult = daily.results[today];
    const streak = currentStreak(daily);
    const weekly = weeklyModifier();
    const stars = totalStars(campaign);
    const maxStars = CAMPAIGN_LEVELS.length * 3;
    const next = currentLevelIndex(campaign);
    const passed = CAMPAIGN_LEVELS.filter((level) => (campaign.stars[level.id] ?? 0) > 0).length;

    const setTab = (value: HomeTab) => {
        setTabState(value);
        trackEvent("home_tab", { tab: value });
        try {
            localStorage.setItem(TAB_KEY, value);
        } catch {
            // Сховище недоступне - вкладка запамʼятовується до перезавантаження.
        }
    };

    useEffect(() => {
        if (!focusDaily) return;
        setTabState("daily");
        setDailyFlash(true);
        const timer = setTimeout(() => setDailyFlash(false), 1300);
        return () => clearTimeout(timer);
    }, [focusDaily]);

    const play = (target: GameModeKey) => {
        trackEvent("select_mode", { mode: target, from: "home" });
        onPlay(target);
    };

    // "Гра з другом": кімната одразу з вибраним полем і модифікатором; посилання-запрошення
    // показує екран кімнати.
    const playFriend = async () => {
        trackEvent("friend_modal_open", { from: "home" });
        if (!isFirebaseConfigured) {
            setFriendError(t("errorFirebaseShort"));
            return;
        }
        if (onBeforeFriendOpen && !(await onBeforeFriendOpen())) return;
        setFriendBusy(true);
        setFriendError(null);
        try {
            const { roomId } = await createRoom(ONLINE_MODE[friendMode], friendModifier);
            onRoomReady(roomId);
        } catch (err) {
            console.error("createRoom failed:", err);
            setFriendError(t("errorCreateRoom"));
            setFriendBusy(false);
        }
    };

    const pickModifier = (value: Modifier | null) => {
        if (value === activeModifier) return;
        trackEvent("select_modifier", { modifier: value ?? "none", mode, from: "home" });
        setModifier(value);
    };

    const modName = (m: Modifier | null) => (m ? t(`modifier_${m}`) : t("modifier_none"));
    const modDesc = (m: Modifier | null) => (m ? t(`modifierDesc_${m}`) : t("modifierNoneDesc"));
    const modTip = (m: Modifier | null) => modName(m) + (m && m === weekly ? ` · ${t("weeklyModifierTag")}` : "");
    const dailyRules = template.goal === "win" ? t("homeDailyRulesWin", { par: String(template.par) }) : t("homeDailyRulesSurvive");
    const dailyMode = MODES.find((m) => m.id === template.mode) ?? MODES[0];
    const weeklyMode = (MODES.find((m) => MODIFIERS_BY_MODE[m.id].includes(weekly)) ?? MODES[0]).id;

    const modePicker = (value: GameModeKey, onPick: (m: GameModeKey) => void, label: string) => (
        <Modes role="group" aria-label={label}>
            {MODES.map((m) => (
                <ModeButton key={m.id} type="button" aria-pressed={value === m.id} onClick={() => onPick(m.id)}>
                    <img src={assetUrl(m.img)} alt="" />
                    <span>{t(m.label)}</span>
                </ModeButton>
            ))}
        </Modes>
    );

    const modPicker = (id: string, active: Modifier | null, allowed: Modifier[], list: Modifier[], onPick: (m: Modifier | null) => void) => (
        <OptGroup>
            <Eyebrow id={id}>{t("modifierLabel")}</Eyebrow>
            <ModScroll role="group" aria-labelledby={id}>
                {/* Показуємо всі модифікатори; ті, що не пасують обраному полю, - неактивні. */}
                {[null, ...list].map((m) => (
                    <ModButton
                        key={m ?? "none"}
                        type="button"
                        aria-pressed={active === m}
                        aria-label={modTip(m)}
                        data-tip={modTip(m)}
                        disabled={m !== null && !allowed.includes(m)}
                        onClick={() => onPick(m)}
                    >
                        <ModIcon id={m} />
                    </ModButton>
                ))}
            </ModScroll>
            <OptInfo title={`${modName(active)} · ${modDesc(active)}`}>
                <strong>{modName(active)}</strong> · {modDesc(active)}
            </OptInfo>
        </OptGroup>
    );

    const botTab = (
        <Card aria-labelledby="home-quick">
            <h2 id="home-quick">{t("homeQuick")}</h2>
            {modePicker(mode, setMode, t("homeQuick"))}
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
                    <strong style={{ color: DIFF_TEXT[difficulty] }}>{t(`difficulty_${difficulty}`)}</strong> · {t(`diffNote_${difficulty}`)}
                </OptInfo>
            </OptGroup>
            {modPicker("home-mod", activeModifier, MODIFIERS_BY_MODE[mode], ALL_MODIFIERS, pickModifier)}
            <GameButton tone="primary" size="lg" block onClick={() => play(mode)}>
                {t("homePlay")}
            </GameButton>
        </Card>
    );

    const onlineTab = (
        <>
            <Card aria-labelledby="home-friend">
                <h2 id="home-friend">{t("homeFriendOnline")}</h2>
                {modePicker(friendMode, setFriendMode, t("homeFriendOnline"))}
                {modPicker(
                    "home-friend-mod",
                    friendModifier,
                    friendAllowed,
                    ALL_MODIFIERS.filter((m) => m !== "mole"),
                    setFriendMod
                )}
                <GameButton tone="primary" size="lg" block disabled={friendBusy} onClick={() => void playFriend()}>
                    {friendBusy ? t("creating") : t("homeFriend")}
                </GameButton>
                {friendError && <ErrorText>{friendError}</ErrorText>}
                <Center>{t("homeFriendHint")}</Center>
                <LinkButton type="button" onClick={() => setJoinOpen(true)}>
                    {t("homeFriendHaveCode")}
                </LinkButton>
            </Card>

            <Card aria-labelledby="home-match">
                <Spread>
                    <h2 id="home-match">{t("homeMatch")}</h2>
                    <LeagueBadge rating={myRating.rating} played={myRating.played} withRating />
                </Spread>
                <OnlineNow />
                <GameButton tone="danger" size="lg" block onClick={() => openPanel("match")}>
                    {t("homeMatch")}
                </GameButton>
                <Muted>{t("homeMatchHint")}</Muted>
                <GameButton size="lg" onClick={() => openPanel("leaderboard")}>
                    {t("homeLeaderboard")}
                </GameButton>
            </Card>
        </>
    );

    const [diffBg, diffFg] = DIFF_ICON_BG[template.difficulty];
    const dailyTab = (
        <>
            <DailyCard ref={dailyRef} $tone="daily" data-flash={dailyFlash} aria-labelledby="home-daily">
                <Spread style={{ flexWrap: "nowrap" }}>
                    <h2 id="home-daily">{t("homeDaily")}</h2>
                    <StreakPill>
                        <Flame />
                        {t("homeStreakDays", { n: String(streak) })}
                    </StreakPill>
                </Spread>
                <Row style={{ alignItems: "center", gap: 14, flexWrap: "nowrap" }}>
                    <DayTile role="img" aria-label={t("dailyBadge", { n: String(dayOfYear(today)) })}>
                        <span>{t("dailyDayWord")}</span>
                        <b>{dayOfYear(today)}</b>
                    </DayTile>
                    <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                        <h3>{t(`daily_${template.id}` as Parameters<typeof t>[0])}</h3>
                        <Muted>{dailyRules}</Muted>
                    </div>
                </Row>
                <Spec aria-label={t("dailySpec")}>
                    <SpecItem>
                        <img src={assetUrl(dailyMode.img)} alt="" />
                        <span>
                            <small>{t("dailyField")}</small>
                            <b>{t(dailyMode.label)}</b>
                        </span>
                    </SpecItem>
                    <SpecItem title={modDesc(template.modifier ?? null)}>
                        <SpecIcon $bg="#f6dcae" $fg="#49301f">
                            <ModIcon id={template.modifier ?? null} />
                        </SpecIcon>
                        <span>
                            <small>{t("dailyModifier")}</small>
                            <b>{template.modifier ? t(`modifier_${template.modifier}`) : t("dailyNoModifier")}</b>
                        </span>
                    </SpecItem>
                    <SpecItem>
                        <SpecIcon $bg={diffBg} $fg={diffFg}>
                            <BotIcon />
                        </SpecIcon>
                        <span>
                            <small>{t("dailyBot")}</small>
                            <b style={{ color: DIFF_TEXT[template.difficulty] }}>{t(`difficulty_${template.difficulty}`)}</b>
                        </span>
                    </SpecItem>
                </Spec>
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

            {/* Модифікатор тижня - під викликом дня: ще одне завдання на цей тиждень. */}
            <Card aria-labelledby="home-weekly">
                <Eyebrow>{t("homeWeekly")}</Eyebrow>
                <h3 id="home-weekly">{t(`modifier_${weekly}`)}</h3>
                <Muted>{t(`modifierDesc_${weekly}`)}</Muted>
                <GameButton
                    tone="amber"
                    size="lg"
                    block
                    onClick={() => {
                        setModifier(weekly);
                        play(weeklyMode);
                    }}
                >
                    {t("homeTryWeekly")}
                </GameButton>
            </Card>
        </>
    );

    const campaignTab = (
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
            <GameButton tone="primary" size="lg" block onClick={() => openPanel("campaign")}>
                {t("homeToMap")}
            </GameButton>
        </Card>
    );

    const content: Record<HomeTab, React.ReactNode> = { bot: botTab, online: onlineTab, daily: dailyTab, campaign: campaignTab };

    return (
        <Page>
            <Hero>
                <h1>{t("homeGreeting", { name: name ?? t("player") })}</h1>
                <HeroBadges>
                    <InfoPill>{t("profileLevel", { n: String(levelForXp(profile.xp)) })}</InfoPill>
                    <LeagueBadge rating={myRating.rating} played={myRating.played} compact />
                </HeroBadges>
            </Hero>

            <Tabs role="tablist" aria-label={t("homeTabs")}>
                {TABS.map((item) => (
                    <Tab
                        key={item.id}
                        type="button"
                        role="tab"
                        id={`home-tab-${item.id}`}
                        aria-selected={tab === item.id}
                        aria-controls="home-tabpanel"
                        onClick={() => setTab(item.id)}
                    >
                        {t(item.label)}
                    </Tab>
                ))}
            </Tabs>

            <div role="tabpanel" id="home-tabpanel" aria-labelledby={`home-tab-${tab}`} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {content[tab]}
            </div>

            {panel === "match" && <QuickMatch fallbackName={name} onMatched={onRoomReady} onPlayBot={() => play("traditional")} />}

            {joinOpen && <FriendGameModal onClose={() => setJoinOpen(false)} onRoomReady={onRoomReady} initialView="join" />}
        </Page>
    );
};
