import type { Metadata } from "next";
import { EmbedEntry } from "@/app/components/EmbedEntry";

// Гра для iframe на сторінці новини: /embed?skin=<id теми>. Посилання копіюється в адмінці
// ("Теми" → "Посилання для новин"); вбудовувати дозволено лише доменам із frame-ancestors (next.config.ts).
export const metadata: Metadata = {
    title: "Tic Tac Toe",
    robots: { index: false, follow: false },
};

type EmbedPageProps = {
    searchParams: Promise<{ skin?: string }>;
};

export default async function EmbedPage({ searchParams }: EmbedPageProps) {
    const { skin } = await searchParams;
    return <EmbedEntry skinId={skin ?? "classic"} />;
}
