"use client";
import { useRouter } from "next/navigation";
import { PlayRoomClient } from "@/app/components/PlayRoomClient";
import { PortalGameBridge } from "@/app/components/portal/PortalGameBridge";

const PORTAL_ORIGIN = process.env.NEXT_PUBLIC_PORTAL_ORIGIN || "https://play-dev.quartsoft.com";

// Той самий підхід, що й TicTacToeEntry.tsx: PlayRoomClient сам не знає про
// next/navigation (portable для standalone-білду), а router.push("/") живе тут.
type PlayRoomEntryProps = {
    roomId: string;
};

export const PlayRoomEntry = ({ roomId }: PlayRoomEntryProps) => {
    const router = useRouter();
    return (
        <PortalGameBridge origin={PORTAL_ORIGIN}>
            <PlayRoomClient roomId={roomId} onExit={() => router.push("/")} />
        </PortalGameBridge>
    );
};
