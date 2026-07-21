import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/app/lib/seo/metadata";
import { Breadcrumbs } from "@/app/components/seo/Breadcrumbs";
import { AdSlot } from "@/app/components/ads/AdsManager";
import styles from "../marketing.module.css";

export const metadata: Metadata = buildMetadata({
  title: "How to Play Tic Tac Toe - Beginner's Guide",
  description:
    "A simple, step-by-step guide to playing Tic Tac Toe: how turns work, how to win, and how to use vs AI, vs friend, and multiplayer modes on this site.",
  path: "/how-to-play",
  keywords: ["how to play tic tac toe", "tic tac toe for beginners", "tic tac toe instructions"],
});

export default function HowToPlayPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "How to Play", path: "/how-to-play" }]} />

      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>How to Play Tic Tac Toe</h1>
        <p className={styles.heroSubtitle}>
          New to the game, or just want a refresher? Here&apos;s everything you need in under two minutes.
        </p>
      </div>

      <div className={styles.prose}>
        <h2>The basics</h2>
        <ol>
          <li>The board is a 3×3 grid of empty cells.</li>
          <li>Two players take turns - one plays X, the other plays O. X always goes first.</li>
          <li>Tap or click any empty cell to place your mark there.</li>
          <li>The first player to get three of their marks in a row - horizontally, vertically, or
            diagonally - wins.</li>
          <li>If all nine cells fill up with no winner, the game is a draw.</li>
        </ol>

        <h2>Playing on this site</h2>
        <p>Once you know the basics, this site offers three ways to play:</p>
        <ul>
          <li>
            <Link href="/play-vs-ai">Play vs AI</Link> - practice instantly against a computer
            opponent, with an easier Traditional mode and a tougher Ultimate Tic Tac Toe mode.
          </li>
          <li>
            <Link href="/play-vs-friend">Play vs Friend</Link> - create a room and share the link
            to play a friend in real time from separate devices.
          </li>
          <li>
            <Link href="/multiplayer">Multiplayer</Link> - real-time online matches with 3×3 or
            9×9 boards.
          </li>
        </ul>

        <h2>Restarting and switching modes</h2>
        <p>
          Use the reload button next to the board to start a new game at any time, and the mode
          buttons to switch between Traditional and Ultimate Tic Tac Toe.
        </p>

        <div className={styles.section}>
          <AdSlot position="between-content" />
        </div>

        <h2>Want to actually win more?</h2>
        <p>
          Once you&apos;re comfortable with the rules, read our{" "}
          <Link href="/blog/best-tic-tac-toe-strategies">Best Tic Tac Toe Strategies</Link> guide,
          or see the full <Link href="/tic-tac-toe-rules">rules and FAQ</Link>.
        </p>

        <div className={styles.ctaRow}>
          <Link href="/" className={styles.ctaButton}>
            Play Now
          </Link>
        </div>
      </div>
    </>
  );
}
