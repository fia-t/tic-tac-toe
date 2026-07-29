"use client";
import { useRouter } from "next/navigation";
import { PlayRoomClient } from "@/app/components/PlayRoomClient";

// Той самий підхід, що й TicTacToeEntry.tsx: PlayRoomClient сам не знає про
// next/navigation (portable для standalone-білду), а router.push("/") живе тут.
type PlayRoomEntryProps = {
    roomId: string;
};

export const PlayRoomEntry = ({ roomId }: PlayRoomEntryProps) => {
    const router = useRouter();
    return <PlayRoomClient roomId={roomId} onExit={() => router.push("/")} />;
};
