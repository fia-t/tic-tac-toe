"use client";
import { useRouter } from "next/navigation";
import { PlayRoomClient } from "@game/components/PlayRoomClient";
import { PortalGameBridge } from "@game/portal/PortalGameBridge";
import { PORTAL_ORIGIN } from "@game/portal/config";
import { siteConfig } from "@/app/lib/seo/site-config";

// Той самий підхід, що й TicTacToeEntry.tsx: PlayRoomClient сам не знає про
// next/navigation (portable для standalone-білду), а router.push("/") живе тут.
// Шестерня налаштувань - у шапці екрана кімнати (RoomTopBar).
type PlayRoomEntryProps = {
    roomId: string;
};

// Канонічний домен для invite-лінку - лише якщо його явно задано (NEXT_PUBLIC_SITE_URL).
// Інакше siteConfig.url - це запасний домен для SEO, який може ще не існувати, і посилання
// на гру з другом вело б у нікуди; тоді PlayRoomClient бере адресу, з якої відкрито сайт.
const INVITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ? siteConfig.url : undefined;

export const PlayRoomEntry = ({ roomId }: PlayRoomEntryProps) => {
    const router = useRouter();
    return (
        <PortalGameBridge origin={PORTAL_ORIGIN}>
            <PlayRoomClient roomId={roomId} onExit={() => router.push("/")} siteUrl={INVITE_ORIGIN} />
        </PortalGameBridge>
    );
};
