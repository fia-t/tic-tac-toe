import { PlayRoomEntry } from "@/app/components/PlayRoomEntry";

type PlayRoomPageProps = {
    params: Promise<{ roomId: string }>;
};

export default async function PlayRoomPage({ params }: PlayRoomPageProps) {
    const { roomId } = await params;
    return <PlayRoomEntry roomId={roomId.toUpperCase()} />;
}
