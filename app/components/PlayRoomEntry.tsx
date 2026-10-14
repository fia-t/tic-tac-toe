"use client";
import { useRouter } from "next/navigation";
import { PlayRoomClient } from "@game/components/PlayRoomClient";
import { PortalGameBridge } from "@game/portal/PortalGameBridge";
import { PORTAL_ORIGIN } from "@game/portal/config";
import { SoundToggle } from "@game/components/SoundToggle";
import { siteConfig } from "@/app/lib/seo/site-config";

// Той самий підхід, що й TicTacToeEntry.tsx: PlayRoomClient сам не знає про
// next/navigation (portable для standalone-білду), а router.push("/") живе тут.
type PlayRoomEntryProps = {
    roomId: string;
};

export const PlayRoomEntry = ({ roomId }: PlayRoomEntryProps) => {
    const router = useRouter();
    return (
        <PortalGameBridge origin={PORTAL_ORIGIN}>
            <SoundToggle />
            <PlayRoomClient roomId={roomId} onExit={() => router.push("/")} siteUrl={siteConfig.url} />
        </PortalGameBridge>
    );
};
