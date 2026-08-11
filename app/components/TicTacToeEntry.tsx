"use client";
import { useRouter } from "next/navigation";
import { TicTacToe } from "@/app/components/tic-tac-toe";
import { PortalGameBridge } from "@/app/components/portal/PortalGameBridge";

const PORTAL_ORIGIN = process.env.NEXT_PUBLIC_PORTAL_ORIGIN || "https://play-dev.quartsoft.com";

// Єдине місце на сайті, де TicTacToe-дерево компонентів знає про Next.js-роутинг -
// сам TicTacToe (і все під ним: Board/DifficultTicTacToe/FiveByFiveTicTacToe/
// FriendGameModal) навмисно не імпортує next/navigation, щоб лишатись portable для
// standalone-білду під агрегатори (там замість router.push - локальний стан кімнати).
export const TicTacToeEntry = () => {
    const router = useRouter();
    return (
        <PortalGameBridge origin={PORTAL_ORIGIN}>
            <TicTacToe onRoomReady={(roomId) => router.push(`/play/${roomId}`)} />
        </PortalGameBridge>
    );
};
