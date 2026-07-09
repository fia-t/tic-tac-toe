import { PlayRoomClient } from "@/app/components/PlayRoomClient";

type PlayRoomPageProps = {
    params: Promise<{ roomId: string }>;
};

export default async function PlayRoomPage({ params }: PlayRoomPageProps) {
    const { roomId } = await params;
    return <PlayRoomClient roomId={roomId.toUpperCase()} />;
}
