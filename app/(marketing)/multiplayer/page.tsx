import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/app/lib/seo/metadata";
import { Breadcrumbs } from "@/app/components/seo/Breadcrumbs";
import { AdSlot } from "@/app/components/ads/AdsManager";
import styles from "../marketing.module.css";

export const metadata: Metadata = buildMetadata({
  title: "Tic Tac Toe Multiplayer - Real-Time Online Matches",
  description:
    "Play Tic Tac Toe online in real time. Rooms sync instantly across devices using Firebase, so every move appears the moment it's played.",
  path: "/multiplayer",
  keywords: ["tic tac toe multiplayer", "online tic tac toe", "real-time tic tac toe"],
});

export default function MultiplayerPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Multiplayer", path: "/multiplayer" }]} />

      <div className={styles.hero}>
        <span className={styles.badge}>Real-Time · Cross-Device</span>
        <h1 className={styles.heroTitle}>Tic Tac Toe Multiplayer</h1>
        <p className={styles.heroSubtitle}>
          Real-time online matches that sync instantly between any two devices - phone, tablet, or
          desktop, in any combination.
        </p>
        <div className={styles.ctaRow}>
          <Link href="/" className={styles.ctaButton}>
            Start a Match
          </Link>
        </div>
      </div>

      <div className={styles.prose}>
        <h2>What makes it real-time</h2>
        <p>
          Every match runs on a live Firebase-backed game room: the moment you place a mark, it&apos;s
          written to the room and streamed to the other player - there&apos;s no page refresh and no
          polling delay.
        </p>

        <h2>Two board sizes</h2>
        <ul>
          <li><strong>3×3</strong> - the classic Tic Tac Toe board.</li>
          <li><strong>5×5</strong> - an extended board for longer, more tactical matches.</li>
        </ul>

        <h2>Play from anywhere</h2>
        <p>
          Rooms are identified by a short link, so you can start a match on one device and share
          the link however is easiest - there&apos;s no requirement that both players use the same type
          of device or be on the same network.
        </p>

        <div className={styles.section}>
          <AdSlot position="between-content" />
        </div>

        <h2>Looking for a specific opponent?</h2>
        <p>
          If you already know who you want to play, see our{" "}
          <Link href="/play-vs-friend">Play vs Friend</Link> guide for step-by-step instructions on
          sharing an invite link.
        </p>
      </div>
    </>
  );
}
