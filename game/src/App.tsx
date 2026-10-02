import { useEffect, useRef, useState } from "react";
import { TicTacToe } from "@game/components/tic-tac-toe";
import { PlayRoomClient } from "@game/components/PlayRoomClient";
import { GlobalStyle, Container } from "@game/components/gameStyles";
import { addGameEventListener } from "@game/lib/firebase";
import { PortalGameBridge } from "@game/portal/PortalGameBridge";
import { PORTAL_ORIGIN } from "@game/portal/config";
import { sdk } from "./sdk";

// Кожна 3-тя завершена партія - тригер midgame-реклами. Частіше відчувалось би
// каральним, рідше - агрегатор недоотримує рекламні покази, за які й платить.
const MIDGAME_AD_EVERY = 3;

// Invite-лінк "Гри з другом" веде на сайт (/play/<roomId>), а не на origin, з якого
// віддано цей білд - у самому білді маршруту /play немає.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "") : undefined;

export default function App() {
    // Room-екран тут - локальний стан, а не next/navigation роутинг (якого в
    // portable-компонентах свідомо нема, див. коментар у tic-tac-toe.tsx).
    const [roomId, setRoomId] = useState<string | null>(null);
    const finishedCount = useRef(0);

    useEffect(() => {
        void sdk.init();
        sdk.loadingStop();
        sdk.gameplayStart();

        return addGameEventListener((name) => {
            if (name === "game_finished") {
                finishedCount.current += 1;
                if (finishedCount.current % MIDGAME_AD_EVERY === 0) {
                    void sdk.showMidgameAd();
                }
            }
        });
    }, []);

    // PlayRoomClient уже огортає власний вміст у Container (як і на сайті) - тут
    // дублювати його не треба, інакше вийде Container-у-Container.
    if (roomId) {
        return (
            <>
                <GlobalStyle />
                <PortalGameBridge origin={PORTAL_ORIGIN}>
                    <PlayRoomClient roomId={roomId} onExit={() => setRoomId(null)} siteUrl={SITE_URL} />
                </PortalGameBridge>
            </>
        );
    }

    return (
        <>
            <GlobalStyle />
            <PortalGameBridge origin={PORTAL_ORIGIN}>
                <Container>
                    <TicTacToe onRoomReady={setRoomId} onBeforeFriendOpen={() => sdk.showRewardedAd()} />
                </Container>
            </PortalGameBridge>
        </>
    );
}
