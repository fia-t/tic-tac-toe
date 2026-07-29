"use client";
import { useRouter } from "next/navigation";
import { TicTacToe } from "@/app/components/tic-tac-toe";

// Єдине місце на сайті, де TicTacToe-дерево компонентів знає про Next.js-роутинг -
// сам TicTacToe (і все під ним: Board/DifficultTicTacToe/FiveByFiveTicTacToe/
// FriendGameModal) навмисно не імпортує next/navigation, щоб лишатись portable для
// standalone-білду під агрегатори (там замість router.push - локальний стан кімнати).
export const TicTacToeEntry = () => {
    const router = useRouter();
    return <TicTacToe onRoomReady={(roomId) => router.push(`/play/${roomId}`)} />;
};
