import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/app/lib/seo/metadata";
import { Breadcrumbs } from "@/app/components/seo/Breadcrumbs";
import { AdSlot } from "@/app/components/ads/AdsManager";
import styles from "../marketing.module.css";

export const metadata: Metadata = buildMetadata({
  title: "Play Tic Tac Toe with a Friend Online - Free Invite Link",
  description:
    "Invite a friend to play Tic Tac Toe online in real time. Create a room, share the link, and play together from any two devices - free, no signup.",
  path: "/play-vs-friend",
  keywords: ["tic tac toe with friends", "play tic tac toe together online", "tic tac toe invite link"],
});

export default function PlayVsFriendPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Play vs Friend", path: "/play-vs-friend" }]} />

      <div className={styles.hero}>
        <span className={styles.badge}>2 Players · Online</span>
        <h1 className={styles.heroTitle}>Play Tic Tac Toe with a Friend</h1>
        <p className={styles.heroSubtitle}>
          Create a private game room, send the link to a friend, and play in real time from two
          separate devices anywhere - no account needed.
        </p>
        <div className={styles.ctaRow}>
          <Link href="/" className={styles.ctaButton}>
            Create a Game
          </Link>
        </div>
      </div>

      <div className={styles.prose}>
        <h2>How it works</h2>
        <ol>
          <li>Open the game and tap the friend icon next to the board.</li>
          <li>Choose 3×3 (classic) or 5×5 (extended) mode and create the room.</li>
          <li>Share the generated invite link with your friend - by chat, text, or however you like.</li>
          <li>Your friend opens the link and the game starts instantly, moves sync in real time.</li>
        </ol>

        <h2>Already have an invite link?</h2>
        <p>
          If a friend already sent you a room link or code, open the game, tap the friend icon,
          choose &quot;Join&quot;, and paste the link or code to jump straight into their game.
        </p>

        <div className={styles.section}>
          <AdSlot position="between-content" />
        </div>

        <h2>Want to play more than one friend?</h2>
        <p>
          Each room supports two players. For open, real-time play with anyone, check out our{" "}
          <Link href="/multiplayer">multiplayer page</Link>.
        </p>
      </div>
    </>
  );
}
