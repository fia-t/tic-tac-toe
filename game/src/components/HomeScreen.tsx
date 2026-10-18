"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled, { keyframes } from "styled-components";
import { GameButton } from "@game/components/GameButton";
import { DiffButton, DiffGroup, ModButton, ModIcon, ModRow } from "@game/components/GameOptions";
import { FriendGameModal } from "@game/components/FriendGameModal";
import { Star, startDailyChallenge } from "@game/components/DailyChallenge";
import { Flame } from "@game/components/TopBar";
import { LeagueBadge } from "@game/components/LeagueCup";
import { Card, Eyebrow, InfoPill, Muted, Page, Row, Spread } from "@game/components/pageStyles";
import { ErrorText } from "@game/components/onlineStyles";
import { assetUrl } from "@game/lib/assets";
import { isFirebaseConfigured, trackEvent } from "@game/lib/firebase";
import { useT } from "@game/lib/i18n";
import { currentStreak, dayOfYear, templateForDay, todayKey, useDailyState } from "@game/lib/daily";
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

// Між блоками головної - трохи більший відступ, ніж на інших сторінках (на телефоні - менший).
const HomePage = styled(Page)`
    gap: 20px;

    @media (max-width: 480px) {
        gap: 16px;
    }

    /* Невисокий екран (напр. 375×667 чи ноутбук 1366×768): вкладка "З ботом" разом із кнопкою "Грати" має вміститися
       над нижнім меню без прокрутки - відступи щільніші. */
    @media (max-height: 820px) {
        gap: 12px;
    }
`;

const TabPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;

    @media (max-width: 480px) {
        gap: 16px;
    }
`;

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

// Вкладки розділів - як перемикач складності: вибрана - горіхова. Також на екрані кампанії
// (розділи / альбом) - там їх дві, тож кількість колонок задається $cols.
export const Tabs = styled.div<{ $cols?: number }>`
    display: grid;
    grid-template-columns: repeat(${({ $cols = 4 }) => $cols}, minmax(0, 1fr));
    gap: 4px;
    padding: 4px;
    border-radius: 18px;
    background: rgba(255, 246, 230, 0.7);
    box-shadow: inset 0 -3px 0 #ebcb98;
`;

export const Tab = styled.button`
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

    @media (max-height: 820px) {
        min-height: 36px;
        padding: 7px 4px;
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

    /* Невисокий екран - плитки менші, щоб "Грати" не ховалась під нижнє меню. */
    @media (max-height: 820px) {
        gap: 4px;
        font-size: 14px;

        img {
            max-width: min(148px, max(72px, calc(100dvh - 660px)));
        }
    }

    @media (max-height: 700px) {
        font-size: 13px;

        img {
            max-width: 64px;
        }
    }
`;

// Картка гри з ботом: заголовка немає (його дає вкладка), на невисокому екрані - щільніша.
const BotCard = styled(Card)`
    @media (max-height: 820px) {
        gap: 10px;
        padding: 12px 16px 14px;
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

// "?" біля підпису групи (поле, складність, модифікатор): натискання відкриває коротке пояснення,
// повторне натискання, клік деінде чи прокрутка - закривають.
const InfoButton = styled.button`
    position: relative;
    z-index: 2;
    width: 18px;
    height: 18px;
    margin: -4px 0;
    padding: 0;
    flex-shrink: 0;
    border: none;
    border-radius: 50%;
    background: rgba(139, 101, 60, 0.18);
    color: #49301f;
    font: 800 12px/18px var(--font-body);
    text-align: center;
    cursor: pointer;

    /* Більша зона натискання, ніж сам кружечок. */
    &::before {
        content: "";
        position: absolute;
        inset: -12px;
    }

    &[aria-expanded="true"],
    &:hover {
        background: #49301f;
        color: #fff7e8;
    }

    &:focus-visible {
        outline: 3px solid #1fb3d9;
        outline-offset: 2px;
    }
`;

const InfoPop = styled.div`
    position: fixed;
    z-index: 1700;
    max-width: min(320px, calc(100vw - 24px));
    padding: 10px 12px;
    border-radius: 14px;
    background: #49301f;
    color: #fff7e8;
    font: 600 13px/1.4 var(--font-body);
    text-transform: none;
    letter-spacing: 0;
    box-shadow: 0 8px 20px rgba(60, 35, 10, 0.3);
`;

export const InfoTip = ({ text }: { text: string }) => {
    const t = useT();
    const button = useRef<HTMLButtonElement>(null);
    const pop = useRef<HTMLDivElement>(null);
    const [at, setAt] = useState<{ left: number; top: number } | null>(null);

    useEffect(() => {
        if (!at) return;
        const close = (event: Event) => {
            const target = event.target as Node;
            if (button.current?.contains(target) || pop.current?.contains(target)) return;
            setAt(null);
        };
        const closeNow = () => setAt(null);
        document.addEventListener("pointerdown", close);
        window.addEventListener("scroll", closeNow, true);
        return () => {
            document.removeEventListener("pointerdown", close);
            window.removeEventListener("scroll", closeNow, true);
        };
    }, [at]);

    // Бульбашка - під кнопкою, у межах екрана.
    useEffect(() => {
        if (!at || !pop.current || !button.current) return;
        const r = button.current.getBoundingClientRect();
        const w = pop.current.offsetWidth;
        const left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2));
        if (left !== at.left) setAt({ left, top: at.top });
    }, [at]);

    const toggle = () => {
        if (at) return setAt(null);
        const r = button.current?.getBoundingClientRect();
        if (r) setAt({ left: r.left, top: r.bottom + 8 });
    };

    return (
        <>
            <InfoButton ref={button} type="button" aria-label={t("infoWhat")} aria-expanded={Boolean(at)} onClick={toggle}>
                ?
            </InfoButton>
            {at &&
                createPortal(
                    <InfoPop ref={pop} role="tooltip" style={{ left: at.left, top: at.top }}>
                        {text}
                    </InfoPop>,
                    document.body
                )}
        </>
    );
};

const EyebrowInfo = styled(Eyebrow)`
    display: inline-flex;
    align-items: center;
    gap: 6px;
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
// "Кампанія" - не вкладка з карткою, а перехід одразу на екран кампанії (список розділів).
type PanelTab = Exclude<HomeTab, "campaign">;
const TAB_KEY = "ttt-home-tab";

const readTab = (): PanelTab => {
    try {
        const value = localStorage.getItem(TAB_KEY);
        return TABS.some((tab) => tab.id === value) && value !== "campaign" ? (value as PanelTab) : "bot";
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
    const [tab, setTabState] = useState<PanelTab>(readTab);
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

    const setTab = (value: HomeTab) => {
        trackEvent("home_tab", { tab: value });
        if (value === "campaign") {
            openPanel("campaign");
            return;
        }
        setTabState(value);
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
    const weeklyMode = (MODES.find((m) => MODIFIERS_BY_MODE[m.id].includes(weekly)) ?? MODES[0]).id;

    // Плитки полів із підписом "Обери поле" - як "Складність бота" й "Модифікатор" над своїми кнопками.
    const modePicker = (id: string, value: GameModeKey, onPick: (m: GameModeKey) => void) => (
        <OptGroup>
            {/* Вибрана плитка піднята й збільшена - відступ, щоб не налазила на підпис і "?". */}
            <EyebrowInfo id={id} style={{ marginBottom: 10 }}>
                {t("homePickBoard")}
                <InfoTip text={t("infoBoard")} />
            </EyebrowInfo>
            <Modes role="group" aria-labelledby={id}>
                {MODES.map((m) => (
                    <ModeButton key={m.id} type="button" aria-pressed={value === m.id} onClick={() => onPick(m.id)}>
                        <img src={assetUrl(m.img)} alt="" />
                        <span>{t(m.label)}</span>
                    </ModeButton>
                ))}
            </Modes>
        </OptGroup>
    );

    const modPicker = (id: string, active: Modifier | null, allowed: Modifier[], list: Modifier[], onPick: (m: Modifier | null) => void) => (
        <OptGroup>
            <EyebrowInfo id={id}>
                {t("modifierLabel")}
                <InfoTip text={id === "home-friend-mod" ? t("infoModFriend") : t("infoMod")} />
            </EyebrowInfo>
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
        <BotCard aria-label={t("homeQuick")}>
            {modePicker("home-board", mode, setMode)}
            <OptGroup>
                <EyebrowInfo id="home-diff">
                    {t("difficultyLabel")}
                    <InfoTip text={t("infoDiff")} />
                </EyebrowInfo>
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
        </BotCard>
    );

    const onlineTab = (
        <>
            <Card aria-labelledby="home-friend">
                <h2 id="home-friend">{t("homeFriendOnline")}</h2>
                {modePicker("home-friend-board", friendMode, setFriendMode)}
                {modPicker(
                    "home-friend-mod",
                    friendModifier,
                    friendAllowed,
                    ALL_MODIFIERS,
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
                    <h2 id="home-match" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        {t("homeMatch")}
                        <InfoTip text={t("infoMatch")} />
                    </h2>
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

    // Умови партії плитками: поле (мініатюра), модифікатор (іконка), бот (у кольорі рівня) -
    // у виклику дня й модифікаторі тижня.
    const condTiles = (tileMode: GameModeKey, tileMod: Modifier | null, tileDiff: Difficulty, label: string) => {
        const tile = MODES.find((m) => m.id === tileMode) ?? MODES[0];
        const [diffBg, diffFg] = DIFF_ICON_BG[tileDiff];
        return (
            <Spec aria-label={label}>
                <SpecItem>
                    <img src={assetUrl(tile.img)} alt="" />
                    <span>
                        <small>{t("dailyField")}</small>
                        <b>{t(tile.label)}</b>
                    </span>
                </SpecItem>
                <SpecItem title={modDesc(tileMod)}>
                    <SpecIcon $bg="#f6dcae" $fg="#49301f">
                        <ModIcon id={tileMod} />
                    </SpecIcon>
                    <span>
                        <small>{t("dailyModifier")}</small>
                        <b>{tileMod ? t(`modifier_${tileMod}`) : t("dailyNoModifier")}</b>
                    </span>
                </SpecItem>
                <SpecItem>
                    <SpecIcon $bg={diffBg} $fg={diffFg}>
                        <BotIcon />
                    </SpecIcon>
                    <span>
                        <small>{t("dailyBot")}</small>
                        <b style={{ color: DIFF_TEXT[tileDiff] }}>{t(`difficulty_${tileDiff}`)}</b>
                    </span>
                </SpecItem>
            </Spec>
        );
    };
    const dailyTab = (
        <>
            <DailyCard ref={dailyRef} $tone="daily" data-flash={dailyFlash} aria-labelledby="home-daily">
                <Spread style={{ flexWrap: "nowrap" }}>
                    <h2 id="home-daily" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            {t("homeDaily")}
                            <InfoTip text={t("infoDaily")} />
                        </h2>
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
                {condTiles(template.mode, template.modifier ?? null, template.difficulty, t("dailySpec"))}
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
                {/* Заголовок - як "Виклик дня" у картці над нею. */}
                <h2 id="home-weekly" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {t("homeWeekly")}
                    <InfoTip text={t("infoWeekly")} />
                </h2>
                <h3>{t(`modifier_${weekly}`)}</h3>
                <Muted>{t(`modifierDesc_${weekly}`)}</Muted>
                {condTiles(weeklyMode, weekly, difficulty, t("weeklySpec"))}
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

    const content: Record<PanelTab, React.ReactNode> = { bot: botTab, online: onlineTab, daily: dailyTab };

    return (
        <HomePage>
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

            <TabPanel role="tabpanel" id="home-tabpanel" aria-labelledby={`home-tab-${tab}`}>
                {content[tab]}
            </TabPanel>

            {panel === "match" && <QuickMatch fallbackName={name} onMatched={onRoomReady} onPlayBot={() => play("traditional")} />}

            {joinOpen && <FriendGameModal onClose={() => setJoinOpen(false)} onRoomReady={onRoomReady} initialView="join" />}
        </HomePage>
    );
};
