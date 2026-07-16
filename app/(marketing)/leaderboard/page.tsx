import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/app/lib/seo/metadata";
import { Breadcrumbs } from "@/app/components/seo/Breadcrumbs";
import { AdSlot } from "@/app/components/ads/AdsManager";
import styles from "../marketing.module.css";

export const metadata: Metadata = buildMetadata({
  title: "Tic Tac Toe Leaderboard",
  description:
    "A global Tic Tac Toe leaderboard is coming soon, ranking wins across AI, friend, and multiplayer matches. Here's what's planned.",
  path: "/leaderboard",
  keywords: ["tic tac toe leaderboard", "tic tac toe rankings"],
});

export default function LeaderboardPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Leaderboard", path: "/leaderboard" }]} />

      <div className={styles.hero}>
        <span className={styles.badge}>Coming Soon</span>
        <h1 className={styles.heroTitle}>Leaderboard</h1>
        <p className={styles.heroSubtitle}>
          We&apos;re building a global leaderboard to rank wins and win streaks across multiplayer
          matches. It isn&apos;t live yet - here&apos;s what&apos;s planned.
        </p>
      </div>

      <div className={styles.prose}>
        <h2>What it will track</h2>
        <ul>
          <li>Total wins and current win streak in online multiplayer matches.</li>
          <li>Daily Challenge completion streaks, once that feature ships.</li>
          <li>A weekly reset so new players can compete for the top spot.</li>
        </ul>

        <h2>Why it isn&apos;t live yet</h2>
        <p>
          A fair leaderboard needs reliable player identity and anti-cheat safeguards, which
          we&apos;re building on top of the existing real-time multiplayer infrastructure. We&apos;d
          rather ship it correctly than rush a leaderboard that can be gamed.
        </p>

        <div className={styles.section}>
          <AdSlot position="between-content" />
        </div>

        <div className={styles.ctaRow}>
          <Link href="/multiplayer" className={styles.ctaButton}>
            Play Multiplayer Now
          </Link>
        </div>
      </div>
    </>
  );
}
