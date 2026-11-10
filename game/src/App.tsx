import { useCallback, useEffect, useRef, useState } from "react";
import { TicTacToe } from "@game/components/tic-tac-toe";
import { PlayRoomClient } from "@game/components/PlayRoomClient";
import { GlobalStyle, Container } from "@game/components/gameStyles";
import { addGameEventListener } from "@game/lib/firebase";
import { PortalGameBridge } from "@game/portal/PortalGameBridge";
import { PORTAL_ORIGIN } from "@game/portal/config";
import { sdk, sdkTarget } from "./sdk";
import { AdBannerContext, type BannerApi } from "@game/components/AdBanner";
import { lifecycle } from "./sdk/lifecycle";
import { getDifficulty } from "@game/lib/difficulty";
import { configureDailyStorage, reloadDaily, DailyState } from "@game/lib/daily";
import { configureWalletStorage, reloadWallet, WalletState } from "@game/lib/wallet";
import { configureCampaignStorage, reloadCampaign, CampaignState } from "@game/lib/campaign";
import { configureProfileStorage, getProfile, reloadProfile, setLevelReporter, ProfileState } from "@game/lib/profile";
import { getScreen, useOpenPanel } from "@game/lib/ui";
import { GameLoader } from "@game/components/GameLoader";
import { setPortalTokenProvider } from "@game/lib/matchmaking";
import { refreshPortalUser, setPortalUserProvider } from "@game/lib/players";
import { setFullscreenProvider } from "@game/lib/fullscreen";
import { getSavedLocale, setLocale, toLocale } from "@game/lib/i18n";

// Після кожних 5 зіграних партій - midgame-реклама перед наступною (6-ю) партією: не посеред
// результату, а коли гравець сам починає нову гру. Ліміти частоти перевіряє ще й портал.
const MIDGAME_AD_EVERY = 5;

// Invite-лінк "Гри з другом" веде на сайт (/play/<roomId>), а не на origin, з якого
// віддано цей білд - у самому білді маршруту /play немає. На порталі замість нього
// використовується game.inviteLink() SDK (createInviteLink нижче).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "") : undefined;

// Ключ, під яким roomId їде в invite-параметрах порталу (game.inviteLink/getInviteParams).
const INVITE_ROOM_KEY = "roomId";

// JSON -> base64url, як кодує game.inviteLink() (https://docs-dev.quartsoft.com/sdk/game-module).
const encodeInvite = (params: Record<string, string>): string => {
    const bytes = new TextEncoder().encode(JSON.stringify(params));
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

// Портал на game.inviteLink() для гостя відкриває вікно входу, і гра з другом блокується.
// Тож гостю запрошення збираємо самі: посилання на гру з game.shareLink() (входу не вимагає)
// + ?invite=<base64url JSON> - той самий формат, тож getInviteParams() у друга його прочитає.
// Не вийшло - null, і PlayRoomClient бере фолбек `${SITE_URL}/play/<roomId>`.
const createInviteLink = sdk.createInviteLink
    ? async (roomId: string) => {
          const params = { [INVITE_ROOM_KEY]: roomId };
          if (!sdk.getUser || (await sdk.getUser())) return sdk.createInviteLink!(params);
          const share = await sdk.shareLink?.();
          if (!share) return null;
          try {
              const url = new URL(share);
              url.searchParams.set("invite", encodeInvite(params));
              return url.toString();
          } catch {
              return null;
          }
      }
    : undefined;

// Банери - лише там, де SDK їх має (портал з модулем banner).
const bannerApi: BannerApi | null =
    sdk.showBanner && sdk.clearBanner && (sdk.hasBanners ?? true) ? { show: sdk.showBanner, clear: sdk.clearBanner } : null;

// На порталі "Гра з другом" відкривається без реклами: rewarded там - лише за явним вибором гравця ("+" у шапці).
const beforeFriendOpen = sdkTarget === "portal" ? undefined : () => sdk.showRewardedAd();

export default function App() {
    // Room-екран тут - локальний стан, а не next/navigation роутинг (якого в
    // portable-компонентах свідомо нема, див. коментар у tic-tac-toe.tsx).
    const [roomId, setRoomId] = useState<string | null>(null);
    // Поки не з'ясовано мову порталу і чи гру відкрили за invite-посиланням, нічого
    // не рендеримо - інакше меню блимнуло б іншою мовою чи перед переходом у кімнату
    // (і випадкове імʼя гравця обралось би не з того мовного пулу).
    const [startupChecked, setStartupChecked] = useState(!sdk.getInviteParams && !sdk.getLocale);
    const finishedCount = useRef(0);
    const midgameDue = useRef(false);
    const panel = useOpenPanel();

    // Відкрите вікно поверх гри (налаштування, магазин, нагороди...) - пауза: порталу gameplayStop,
    // після закриття - знову gameplayStart (якщо партія ще триває).
    useEffect(() => {
        lifecycle.setPaused("panel", panel !== null);
    }, [panel]);

    useEffect(() => {
        void sdk.init();
        if (sdk.getUserToken) setPortalTokenProvider(sdk.getUserToken);
        // Портал сам розгортає iframe гри - кнопка повного екрана йде через його SDK.
        if (sdk.requestFullscreen && sdk.exitFullscreen && sdk.onFullscreenChange) {
            setFullscreenProvider({ request: sdk.requestFullscreen, exit: sdk.exitFullscreen, subscribe: sdk.onFullscreenChange });
        }
        if (sdk.getUser) setPortalUserProvider(sdk.getUser);
        if (sdk.reportPlayerLevel) {
            const report = sdk.reportPlayerLevel;
            setLevelReporter((level) => report(level));
        }
        // Виклик дня на порталі - у хмарних збереженнях гравця (серія не губиться між пристроями).
        if (sdk.loadData && sdk.saveData) {
            const load = sdk.loadData, saveData = sdk.saveData;
            void configureDailyStorage({ load: () => load<DailyState>("daily"), save: (state) => saveData("daily", state) });
            void configureWalletStorage({ load: () => load<WalletState>("wallet"), save: (state) => saveData("wallet", state) });
            void configureCampaignStorage({ load: () => load<CampaignState>("campaign"), save: (state) => saveData("campaign", state) });
            void configureProfileStorage({ load: () => load<ProfileState>("profile"), save: (state) => saveData("profile", state) });
        }
        const unsubscribeAuth = sdk.onAuthChange?.(() => {
            void reloadDaily();
            void reloadWallet();
            void reloadCampaign();
            void reloadProfile();
            void refreshPortalUser();
        });

        // Мова з порталу (якщо гра її знає) - замість мови браузера, але не замість обраної
        // гравцем у налаштуваннях.
        const applyPortalLocale = (raw: string | null | undefined) => {
            const locale = toLocale(raw);
            if (locale && !getSavedLocale()) void setLocale(locale);
        };
        const unsubscribeLocale = sdk.onLocaleChange?.(applyPortalLocale);
        if (sdk.getInviteParams || sdk.getLocale) {
            void Promise.all([sdk.getLocale?.(), sdk.getInviteParams?.()]).then(([locale, params]) => {
                applyPortalLocale(locale);
                const invitedRoom = params?.[INVITE_ROOM_KEY];
                if (typeof invitedRoom === "string" && invitedRoom) setRoomId(invitedRoom.toUpperCase());
                setStartupChecked(true);
            });
        }

        // Початок партії: якщо настала черга - спершу реклама (геймплей стоїть), потім гра.
        const startGameplay = () => {
            if (!midgameDue.current) {
                lifecycle.setGameplay(true);
                return;
            }
            midgameDue.current = false;
            void sdk.showMidgameAd().finally(() => {
                if (getScreen() === "game") lifecycle.setGameplay(true);
            });
        };

        const unsubscribeEvents = addGameEventListener((name, params) => {
            const mode = params?.mode ?? params?.gameMode;
            switch (name) {
                case "select_mode":
                case "select_difficulty":
                case "daily_started":
                case "select_modifier":
                case "campaign_level_started":
                case "game_restart":
                    // У меню вибір рівня/модифікатора - не гра; час гри рахується лише на полі.
                    if (getScreen() !== "game") break;
                    startGameplay();
                    sdk.setGameContext?.({ screen: "game", mode, difficulty: getDifficulty(), stats: getProfile().stats });
                    break;
                case "open_game":
                    startGameplay();
                    break;
                case "tutorial_shown":
                    lifecycle.setPaused("tutorial", true);
                    break;
                case "tutorial_closed":
                    lifecycle.setPaused("tutorial", false);
                    break;
                case "open_menu":
                    lifecycle.setGameplay(false);
                    sdk.setGameContext?.({ screen: "menu", stats: getProfile().stats });
                    break;
                case "game_finished":
                case "online_game_finished": {
                    lifecycle.setGameplay(false);
                    const result = params?.result === "win" ? "win" : params?.result === "draw" ? "draw" : "lose";
                    sdk.setGameContext?.({ screen: "result", mode, result, difficulty: getDifficulty(), stats: getProfile().stats });
                    if (name === "game_finished") {
                        finishedCount.current += 1;
                        if (finishedCount.current % MIDGAME_AD_EVERY === 0) midgameDue.current = true;
                    }
                    break;
                }
            }
        });

        return () => {
            unsubscribeAuth?.();
            unsubscribeLocale?.();
            unsubscribeEvents();
        };
    }, []);

    // Дошка 3×3 одразу доступна для ходу - тож після завантаження одразу йде партія.
    const handleReady = useCallback(() => {
        lifecycle.loadingStop();
        // Гра відкривається на головному меню - геймплей стартує, коли гравець перейде до поля.
        sdk.setGameContext?.({ screen: "menu", stats: getProfile().stats });
    }, []);

    const handleRoomStatus = useCallback(
        (status: "waiting" | "playing" | "finished") => {
            lifecycle.setGameplay(status === "playing");
            sdk.setGameContext?.({ screen: "online", roomId, status });
        },
        [roomId]
    );

    useEffect(() => {
        if (!roomId) return;
        // У кімнату можна потрапити й одразу за invite-лінком, оминувши меню з темами.
        lifecycle.loadingStop();
        // До підключення суперника (status "waiting") - не геймплей.
        lifecycle.setGameplay(false);
        return () => sdk.clearGameContext?.();
    }, [roomId]);

    // Поки з'ясовуємо мову порталу й invite - тематичний лоадер (а не порожній екран).
    if (!startupChecked)
        return (
            <>
                <GlobalStyle />
                <Container>
                    <GameLoader />
                </Container>
            </>
        );

    // PlayRoomClient уже огортає власний вміст у Container (як і на сайті) - тут
    // дублювати його не треба, інакше вийде Container-у-Container.
    if (roomId) {
        return (
            <>
                <GlobalStyle />
                <PortalGameBridge origin={PORTAL_ORIGIN}>
                    <PlayRoomClient
                        roomId={roomId}
                        onExit={() => setRoomId(null)}
                        siteUrl={SITE_URL}
                        createInviteLink={createInviteLink}
                        onStatusChange={handleRoomStatus}
                    />
                </PortalGameBridge>
            </>
        );
    }

    return (
        <>
            <GlobalStyle />
            {/* Шестерня налаштувань - у шапці самої гри (TopBar). */}
            <PortalGameBridge origin={PORTAL_ORIGIN}>
                <Container>
                    <AdBannerContext.Provider value={bannerApi}>
                        <TicTacToe
                            onRoomReady={setRoomId}
                            onBeforeFriendOpen={beforeFriendOpen}
                            onReady={handleReady}
                            getShareLink={sdk.shareLink}
                            onRewardedAd={sdk.hasRewardedAds ? sdk.showRewardedAd : undefined}
                        />
                    </AdBannerContext.Provider>
                </Container>
            </PortalGameBridge>
        </>
    );
}
