import { useEffect, useRef, useState } from "react";
import { TicTacToe } from "@/app/components/tic-tac-toe";
import { PlayRoomClient } from "@/app/components/PlayRoomClient";
import { GlobalStyle, Container } from "@/app/components/gameStyles";
import { addGameEventListener } from "@/app/lib/firebase";
import { PortalGameBridge } from "@/app/components/portal/PortalGameBridge";
import { sdk } from "./sdk";

// Кожна 3-тя завершена партія - тригер midgame-реклами. Частіше відчувалось би
// каральним, рідше - агрегатор недоотримує рекламні покази, за які й платить.
const MIDGAME_AD_EVERY = 3;

// Той самий portal-адаптер, що й на основному сайті (app/components/TicTacToeEntry.tsx) -
// тут читаємо origin через Vite-специфічний import.meta.env, бо PortalGameBridge
// навмисно не знає, у якому бандлері він зібраний.
const PORTAL_ORIGIN = import.meta.env.VITE_PORTAL_ORIGIN || "https://play-dev.quartsoft.com";

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
                    <PlayRoomClient roomId={roomId} onExit={() => setRoomId(null)} />
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
