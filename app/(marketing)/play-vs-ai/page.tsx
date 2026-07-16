import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/app/lib/seo/metadata";
import { JsonLd, videoGameJsonLd } from "@/app/lib/seo/json-ld";
import { Breadcrumbs } from "@/app/components/seo/Breadcrumbs";
import { AdSlot } from "@/app/components/ads/AdsManager";
import styles from "../marketing.module.css";

export const metadata: Metadata = buildMetadata({
  title: "Play Tic Tac Toe vs AI - Free Computer Opponent",
  description:
    "Challenge a smart Tic Tac Toe AI opponent for free. Choose Traditional mode or the tougher Ultimate Tic Tac Toe difficulty - no download, no signup.",
  path: "/play-vs-ai",
  keywords: ["tic tac toe vs ai", "tic tac toe computer opponent", "play tic tac toe against computer"],
});

export default function PlayVsAiPage() {
  return (
    <>
      <JsonLd data={videoGameJsonLd()} />
      <Breadcrumbs items={[{ name: "Play vs AI", path: "/play-vs-ai" }]} />

      <div className={styles.hero}>
        <span className={styles.badge}>1 Player</span>
        <h1 className={styles.heroTitle}>Play Tic Tac Toe vs AI</h1>
        <p className={styles.heroSubtitle}>
          Play instantly against a computer opponent - completely free, no account and no download.
          Pick your difficulty and jump straight into a match.
        </p>
        <div className={styles.ctaRow}>
          <Link href="/" className={styles.ctaButton}>
            Play Now
          </Link>
          <Link href="/how-to-play" className={styles.ctaButtonSecondary}>
            How to Play
          </Link>
        </div>
      </div>

      <div className={styles.prose}>
        <h2>Two AI difficulty levels</h2>
        <p>
          The board screen offers two modes you can switch between at any time using the mode
          buttons next to the board:
        </p>
        <ul>
          <li>
            <strong>Traditional (Easy)</strong> - a classic 3×3 board against an AI that plays a
            solid heuristic: it takes a winning move when available, blocks your winning move when
            it must, and otherwise favors the center, then corners, then edges.
          </li>
          <li>
            <strong>Difficult (Ultimate Tic Tac Toe)</strong> - a 3×3 grid of smaller 3×3 boards,
            where the cell you play in decides which mini-board your opponent must play in next.
            It&apos;s a significantly deeper strategic challenge than classic Tic Tac Toe.
          </li>
        </ul>

        <h2>Why play against AI?</h2>
        <p>
          Playing vs AI is the fastest way to practice patterns like forks and forced blocks
          without waiting for another player, and it&apos;s always available - day or night, no
          opponent required. Once you&apos;re confident, try challenging a friend or another player online.
        </p>

        <div className={styles.section}>
          <AdSlot position="between-content" />
        </div>

        <h2>Related guides</h2>
        <ul>
          <li>
            <Link href="/blog/best-tic-tac-toe-strategies">Best Tic Tac Toe Strategies</Link>
          </li>
          <li>
            <Link href="/blog/how-ai-plays-tic-tac-toe">How AI Plays Tic Tac Toe</Link>
          </li>
          <li>
            <Link href="/tic-tac-toe-rules">Full Tic Tac Toe Rules</Link>
          </li>
        </ul>
      </div>
    </>
  );
}
