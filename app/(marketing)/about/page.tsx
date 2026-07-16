import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/app/lib/seo/metadata";
import { Breadcrumbs } from "@/app/components/seo/Breadcrumbs";
import styles from "../marketing.module.css";

export const metadata: Metadata = buildMetadata({
  title: "About Tic Tac Toe Online",
  description:
    "Tic Tac Toe Online is a free, no-download browser game with AI, friend, and real-time multiplayer modes. Learn what we're building and why.",
  path: "/about",
  keywords: ["about tic tac toe online", "tic tac toe game project"],
});

export default function AboutPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "About", path: "/about" }]} />

      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>About Tic Tac Toe Online</h1>
      </div>

      <div className={styles.prose}>
        <p>
          Tic Tac Toe Online is a free browser game built around one goal: let anyone play a match
          in seconds, on any device, without an account, a download, or a paywall.
        </p>

        <h2>What you can play</h2>
        <ul>
          <li>A classic Traditional mode against a heuristic AI opponent.</li>
          <li>A tougher Ultimate Tic Tac Toe mode for a deeper strategic challenge.</li>
          <li>Real-time online play with a friend via a shareable invite link, in 3×3 or 5×5.</li>
        </ul>

        <h2>How it&apos;s built</h2>
        <p>
          The game is built with Next.js and React for the interface, and Firebase for real-time
          multiplayer state - so moves sync between players the instant they happen, with no page
          refresh required.
        </p>

        <h2>What&apos;s next</h2>
        <p>
          We&apos;re actively working on a daily challenge mode and a public leaderboard - see their
          pages for details on what&apos;s coming.
        </p>

        <div className={styles.ctaRow}>
          <Link href="/" className={styles.ctaButton}>
            Play Now
          </Link>
          <Link href="/contact" className={styles.ctaButtonSecondary}>
            Contact Us
          </Link>
        </div>
      </div>
    </>
  );
}
