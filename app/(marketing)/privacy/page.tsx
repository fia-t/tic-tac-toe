import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/app/lib/seo/metadata";
import { Breadcrumbs } from "@/app/components/seo/Breadcrumbs";
import styles from "../marketing.module.css";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description: "What data Tic Tac Toe collects on this website and on partner game platforms, and how it is used.",
  path: "/privacy",
  noindex: false,
});

export default function PrivacyPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Privacy Policy", path: "/privacy" }]} />

      <div className={styles.prose}>
        <h1 className={styles.heroTitle} style={{ textAlign: "left" }}>
          Privacy Policy
        </h1>
        <p><em>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</em></p>

        <p>
          This policy covers Tic Tac Toe on this website and the same game published on partner
          game platforms (for example CrazyGames and the QS Play portal).
        </p>

        <h2>What we collect</h2>
        <p>We do not ask for an email address or a password. To run the game we store:</p>
        <ul>
          <li>
            <strong>A player profile</strong> linked to an anonymous ID created automatically by
            Google Firebase: the display name shown in the game (a random name, one you typed in, or
            your username on the game platform if you are signed in there), and game statistics such
            as games played, wins, level and rating.
          </li>
          <li>
            <strong>Game records</strong>: mode, result, number of moves and time of each finished
            game, used to balance the game and fix bugs.
          </li>
          <li>
            <strong>Online matches</strong>: the state of rooms for &quot;Play with a friend&quot; and
            quick match (board, moves, room code, player names) while the match is running, and your
            rating for quick match.
          </li>
          <li>
            <strong>Progress</strong> (coins, skins, campaign, daily challenge): in your browser on
            this website, or in the save system of the game platform when you play there.
          </li>
        </ul>

        <h2>Analytics</h2>
        <p>
          We use Google Firebase Analytics, Google Analytics (on this website) and GameAnalytics to
          understand how the game is played, for example which modes are popular and where players
          stop. These services receive gameplay events together with technical data such as device
          type, browser and approximate country. We use this data in aggregate and do not use it to
          identify individual players.
        </p>

        <h2>Advertising</h2>
        <p>
          This website may display advertising through third-party networks (such as Google
          AdSense). When you play on a game platform, advertising is shown only by that platform
          under its own privacy policy. Ad networks may use cookies or similar technologies to serve
          relevant ads; you can control ad personalization in your browser or the network&apos;s own
          settings.
        </p>

        <h2>Cookies and local storage</h2>
        <p>
          We use local storage for settings and progress (for example sound, language and visual
          theme) and, where enabled, cookies set by analytics or advertising providers.
        </p>

        <h2>Third-party services</h2>
        <p>
          We use Google Firebase (database, anonymous sign-in and analytics), Google Analytics,
          Google Tag Manager, GameAnalytics, Vercel (hosting) and, on this website, advertising
          networks such as Google AdSense, NitroPay or Setupad. On game platforms the platform&apos;s
          own services and policies also apply. Each provider has its own privacy policy governing
          the data it processes.
        </p>

        <h2>How long we keep data</h2>
        <p>
          Room data is kept only as long as needed to run a match. Player profiles, ratings and game
          records are kept while the game is operated, unless you ask us to delete them.
        </p>

        <h2>Your choices</h2>
        <p>
          You can ask us to delete your player profile and game records via our{" "}
          <Link href="/contact">contact page</Link>. Please include your in-game player name.
        </p>

        <h2>Children&apos;s privacy</h2>
        <p>The game is intended for players aged 13 and over. We do not knowingly collect personal information from children under 13.</p>

        <h2>Contact</h2>
        <p>
          Questions about this policy can be sent via our <Link href="/contact">contact page</Link>.
        </p>
      </div>
    </>
  );
}
