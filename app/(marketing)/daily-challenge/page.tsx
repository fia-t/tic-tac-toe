import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/app/lib/seo/metadata";
import { Breadcrumbs } from "@/app/components/seo/Breadcrumbs";
import { AdSlot } from "@/app/components/ads/AdsManager";
import styles from "../marketing.module.css";

export const metadata: Metadata = buildMetadata({
  title: "Tic Tac Toe Daily Challenge",
  description:
    "A new Tic Tac Toe puzzle every day, coming soon. Play the regular game vs AI, with friends, or online while we finish building the daily challenge.",
  path: "/daily-challenge",
  keywords: ["tic tac toe daily challenge", "tic tac toe puzzle of the day"],
});

export default function DailyChallengePage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Daily Challenge", path: "/daily-challenge" }]} />

      <div className={styles.hero}>
        <span className={styles.badge}>Coming Soon</span>
        <h1 className={styles.heroTitle}>Daily Challenge</h1>
        <p className={styles.heroSubtitle}>
          Every player gets the same Tic Tac Toe puzzle each day, with a fresh board seeded at
          midnight. We&apos;re currently building this feature.
        </p>
      </div>

      <div className={styles.prose}>
        <h2>What to expect</h2>
        <ul>
          <li>One shared puzzle per day, the same for every player.</li>
          <li>A short streak counter so you can track consecutive days played.</li>
          <li>Results you can compare with friends once it launches.</li>
        </ul>

        <h2>In the meantime</h2>
        <p>
          You can already play unlimited matches against our AI, a friend, or another player
          online - the daily challenge will sit alongside these, not replace them.
        </p>

        <div className={styles.section}>
          <AdSlot position="between-content" />
        </div>

        <div className={styles.ctaRow}>
          <Link href="/play-vs-ai" className={styles.ctaButton}>
            Play vs AI Instead
          </Link>
        </div>
      </div>
    </>
  );
}
