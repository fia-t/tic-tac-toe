import { useEffect, useRef, useState } from "react";
import { TicTacToe } from "@/app/components/tic-tac-toe";
import { PlayRoomClient } from "@/app/components/PlayRoomClient";
import { GlobalStyle, Container } from "@/app/components/gameStyles";
import { setGameEventListener } from "@/app/lib/firebase";
import { sdk } from "./sdk";

// Кожна 3-тя завершена партія - тригер midgame-реклами. Частіше відчувалось би
// каральним, рідше - агрегатор недоотримує рекламні покази, за які й платить.
const MIDGAME_AD_EVERY = 3;

export default function App() {
    // Room-екран тут - локальний стан, а не next/navigation роутинг (якого в
    // portable-компонентах свідомо нема, див. коментар у tic-tac-toe.tsx).
    const [roomId, setRoomId] = useState<string | null>(null);
    const finishedCount = useRef(0);

    useEffect(() => {
        void sdk.init();
        sdk.loadingStop();
        sdk.gameplayStart();

        setGameEventListener((name) => {
            if (name === "game_finished") {
                finishedCount.current += 1;
                if (finishedCount.current % MIDGAME_AD_EVERY === 0) {
                    void sdk.showMidgameAd();
                }
            }
        });

        return () => setGameEventListener(null);
    }, []);

    // PlayRoomClient уже огортає власний вміст у Container (як і на сайті) - тут
    // дублювати його не треба, інакше вийде Container-у-Container.
    if (roomId) {
        return (
            <>
                <GlobalStyle />
                <PlayRoomClient roomId={roomId} onExit={() => setRoomId(null)} />
            </>
        );
    }

    return (
        <>
            <GlobalStyle />
            <Container>
                <TicTacToe onRoomReady={setRoomId} onBeforeFriendOpen={() => sdk.showRewardedAd()} />
            </Container>
        </>
    );
}
