import type { Metadata } from "next";
import { TicTacToeEntry } from "@/app/components/TicTacToeEntry";
import { Container } from "@game/components/gameStyles";
import { buildMetadata } from "@/app/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Play Tic Tac Toe Online - Free, No Download",
  description:
    "Play Tic Tac Toe online for free. Challenge a smart AI, play with a friend via invite link, or battle in real-time multiplayer - no download, no signup.",
  path: "/",
  keywords: ["play tic tac toe online", "free tic tac toe game"],
});

// Домашня сторінка навмисно лишається ПОЗА (marketing) route group - це full-bleed
// ігровий екран без header/footer: він же вбудовується в iframe порталу, і будь-яка
// навігація під грою виводила б гравця з порталу на маркетингові сторінки сайту.
// SEO-сторінки знаходяться через sitemap.ts і мають власний футер (SiteFooter).
// Прихований для очей, але доступний для скрін-рідерів і пошукових систем H1 лишається.
export default function Home() {
  return (
    // height:100% - без цього <main> лишається auto-висоти (лише за вмістом), і
    // Container{height:100%} нижче не резолвиться (відсоткова height працює лише
    // коли батько має явну, не-auto висоту).
    <main style={{ height: "100%" }}>
      <h1
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Play Tic Tac Toe Online Free - vs AI, with Friends, or Multiplayer
      </h1>
      <Container>
        <TicTacToeEntry />
      </Container>
    </main>
  );
}
