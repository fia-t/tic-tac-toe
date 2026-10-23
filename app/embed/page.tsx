import type { Metadata } from "next";
import { EmbedEntry } from "@/app/components/EmbedEntry";
import { Container } from "@game/components/gameStyles";

// Гра для iframe на сторінці новини: /embed?skin=<id теми>. Посилання копіюється в адмінці
// ("Теми" → "Посилання для новин"); вбудовувати дозволено лише доменам із frame-ancestors (прод і dev-портал) (next.config.ts).
export const metadata: Metadata = {
    title: "Tic Tac Toe",
    robots: { index: false, follow: false },
};

type EmbedPageProps = {
    searchParams: Promise<{ skin?: string }>;
};

export default async function EmbedPage({ searchParams }: EmbedPageProps) {
    const { skin } = await searchParams;
    // Той самий ігровий контейнер (фон-пляж, висота екрана), що й на головній (app/page.tsx).
    return (
        <main style={{ height: "100%" }}>
            <Container>
                <EmbedEntry skinId={skin ?? "classic"} />
            </Container>
        </main>
    );
}
