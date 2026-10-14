import { useCallback, useEffect, useRef, useState } from "react";
import { TicTacToe } from "@game/components/tic-tac-toe";
import { PlayRoomClient } from "@game/components/PlayRoomClient";
import { GlobalStyle, Container } from "@game/components/gameStyles";
import { addGameEventListener } from "@game/lib/firebase";
import { PortalGameBridge } from "@game/portal/PortalGameBridge";
import { PORTAL_ORIGIN } from "@game/portal/config";
import { sdk } from "./sdk";
import { lifecycle } from "./sdk/lifecycle";
import { progress } from "./sdk/progress";
import { getDifficulty } from "@game/lib/difficulty";
import { setLocale, toLocale } from "@game/lib/i18n";
import { SoundToggle } from "@game/components/SoundToggle";

// Кожна 3-тя завершена партія - тригер midgame-реклами. Частіше відчувалось би
// каральним, рідше - агрегатор недоотримує рекламні покази, за які й платить.
const MIDGAME_AD_EVERY = 3;

// Invite-лінк "Гри з другом" веде на сайт (/play/<roomId>), а не на origin, з якого
// віддано цей білд - у самому білді маршруту /play немає. На порталі замість нього
// використовується game.inviteLink() SDK (createInviteLink нижче).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "") : undefined;

// Ключ, під яким roomId їде в invite-параметрах порталу (game.inviteLink/getInviteParams).
const INVITE_ROOM_KEY = "roomId";

const createInviteLink = sdk.createInviteLink
    ? (roomId: string) => sdk.createInviteLink!({ [INVITE_ROOM_KEY]: roomId })
    : undefined;

export default function App() {
    // Room-екран тут - локальний стан, а не next/navigation роутинг (якого в
    // portable-компонентах свідомо нема, див. коментар у tic-tac-toe.tsx).
    const [roomId, setRoomId] = useState<string | null>(null);
    // Поки не з'ясовано мову порталу і чи гру відкрили за invite-посиланням, нічого
    // не рендеримо - інакше меню блимнуло б іншою мовою чи перед переходом у кімнату
    // (і випадкове імʼя гравця обралось би не з того мовного пулу).
    const [startupChecked, setStartupChecked] = useState(!sdk.getInviteParams && !sdk.getLocale);
    const finishedCount = useRef(0);

    useEffect(() => {
        void sdk.init();
        void progress.reload();
        const unsubscribeAuth = sdk.onAuthChange?.(() => void progress.reload());

        const unsubscribeLocale = sdk.onLocaleChange?.((locale) => setLocale(toLocale(locale)));
        if (sdk.getInviteParams || sdk.getLocale) {
            void Promise.all([sdk.getLocale?.(), sdk.getInviteParams?.()]).then(([locale, params]) => {
                if (locale) setLocale(toLocale(locale));
                const invitedRoom = params?.[INVITE_ROOM_KEY];
                if (typeof invitedRoom === "string" && invitedRoom) setRoomId(invitedRoom.toUpperCase());
                setStartupChecked(true);
            });
        }

        const unsubscribeEvents = addGameEventListener((name, params) => {
            const mode = params?.mode ?? params?.gameMode;
            switch (name) {
                case "select_mode":
                case "select_difficulty":
                case "game_restart":
                    lifecycle.setGameplay(true);
                    sdk.setGameContext?.({ screen: "game", mode, difficulty: getDifficulty(), stats: progress.get() });
                    break;
                case "game_finished":
                case "online_game_finished": {
                    lifecycle.setGameplay(false);
                    const result = params?.result === "win" ? "win" : params?.result === "draw" ? "draw" : "lose";
                    void progress.record(result).then(() =>
                        sdk.setGameContext?.({ screen: "result", mode, result, difficulty: getDifficulty(), stats: progress.get() })
                    );
                    if (name === "game_finished") {
                        finishedCount.current += 1;
                        if (finishedCount.current % MIDGAME_AD_EVERY === 0) {
                            void sdk.showMidgameAd();
                        }
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
        lifecycle.setGameplay(true);
        sdk.setGameContext?.({ screen: "game", mode: "easy", difficulty: getDifficulty(), stats: progress.get() });
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

    if (!startupChecked) return <GlobalStyle />;

    // PlayRoomClient уже огортає власний вміст у Container (як і на сайті) - тут
    // дублювати його не треба, інакше вийде Container-у-Container.
    if (roomId) {
        return (
            <>
                <GlobalStyle />
                <SoundToggle />
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
            <SoundToggle />
            <PortalGameBridge origin={PORTAL_ORIGIN}>
                <Container>
                    <TicTacToe
                        onRoomReady={setRoomId}
                        onBeforeFriendOpen={() => sdk.showRewardedAd()}
                        onReady={handleReady}
                    />
                </Container>
            </PortalGameBridge>
        </>
    );
}
