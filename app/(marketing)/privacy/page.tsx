import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/app/lib/seo/metadata";
import { Breadcrumbs } from "@/app/components/seo/Breadcrumbs";
import { siteConfig } from "@/app/lib/seo/site-config";
import styles from "../marketing.module.css";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description: "How Tic Tac Toe Online collects, uses, and protects your data.",
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

        <h2>What we collect</h2>
        <p>
          When you play a multiplayer or friend match, we store the game room state (board
          position, moves, and a room code) in our Firebase database for as long as needed to run
          the match. We do not require an account, name, or email address to play.
        </p>

        <h2>Analytics</h2>
        <p>
          We may use privacy-respecting analytics (Google Analytics and/or Firebase Analytics) to
          understand aggregate usage, such as which game modes are popular. This data is
          anonymized and is not used to identify individual players.
        </p>

        <h2>Advertising</h2>
        <p>
          This site may display advertising through third-party networks (such as Google AdSense).
          These networks may use cookies or similar technologies to serve relevant ads. You can
          control ad personalization through your browser or the ad network&apos;s own settings.
        </p>

        <h2>Cookies</h2>
        <p>
          We use minimal cookies/local storage required for the game to function (such as
          remembering your visual theme) and, where enabled, cookies set by analytics or
          advertising providers.
        </p>

        <h2>Third-party services</h2>
        <p>
          We use Google Firebase (database and optional analytics), and may use Google Analytics,
          Google Tag Manager, and advertising networks such as Google AdSense, NitroPay, or
          Setupad. Each of these providers has its own privacy policy governing data they collect.
        </p>

        <h2>Children&apos;s privacy</h2>
        <p>This site does not knowingly collect personal information from children under 13.</p>

        <h2>Contact</h2>
        <p>
          Questions about this policy can be sent via our <Link href="/contact">contact page</Link>. This
          is a template policy - replace it with a policy reviewed for your jurisdiction and actual
          data practices (see README) before relying on it in production, especially once you
          enable real analytics/ad providers on {siteConfig.url}.
        </p>
      </div>
    </>
  );
}
