import { redirect } from "next/navigation";

type PlayPageProps = {
    searchParams: Promise<{ room?: string }>;
};

// Підтримує альтернативний формат запрошення /play?room=CODE - зводить його
// до канонічного /play/CODE, яким оперує решта коду.
export default async function PlayPage({ searchParams }: PlayPageProps) {
    const { room } = await searchParams;
    if (room) redirect(`/play/${room.toUpperCase()}`);
    redirect("/");
}
