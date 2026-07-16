import type { Metadata } from "next";
import Link from "next/link";
import { TicTacToe } from "@/app/components/tic-tac-toe";
import { Container } from "@/app/components/gameStyles";
import { buildMetadata } from "@/app/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Play Tic Tac Toe Online - Free, No Download",
  description:
    "Play Tic Tac Toe online for free. Challenge a smart AI, play with a friend via invite link, or battle in real-time multiplayer - no download, no signup.",
  path: "/",
  keywords: ["play tic tac toe online", "free tic tac toe game"],
});

const homeLinks = [
  { href: "/play-vs-ai", label: "Play vs AI" },
  { href: "/play-vs-friend", label: "Play vs Friend" },
  { href: "/multiplayer", label: "Multiplayer" },
  { href: "/how-to-play", label: "How to Play" },
  { href: "/tic-tac-toe-rules", label: "Rules" },
  { href: "/daily-challenge", label: "Daily Challenge" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

// Домашня сторінка навмисно лишається ПОЗА (marketing) route group - це той самий
// full-bleed ігровий екран, що й раніше, без header/footer, які зламали б вигляд гри.
// Замість цього: прихований для очей, але доступний для скрін-рідерів і пошукових
// систем H1/опис, і компактна навігація під грою - єдиний вихід із "/" на нові SEO-сторінки.
export default function Home() {
  return (
    <main>
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
        <TicTacToe />
      </Container>
      <nav
        aria-label="Site navigation"
        style={{
          background: "#2b1a08",
          color: "#e6c890",
          padding: "20px 16px 28px",
          textAlign: "center",
        }}
      >
        <ul
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "8px 16px",
            listStyle: "none",
            margin: "0 auto",
            padding: 0,
            maxWidth: 900,
          }}
        >
          {homeLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} style={{ color: "#e6c890", fontSize: 14, textDecoration: "none" }}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <p style={{ fontSize: 12, opacity: 0.6, marginTop: 16 }}>
          © {new Date().getFullYear()} Tic Tac Toe Online. All rights reserved.
        </p>
      </nav>
    </main>
  );
}
