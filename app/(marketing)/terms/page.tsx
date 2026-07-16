import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/app/lib/seo/metadata";
import { Breadcrumbs } from "@/app/components/seo/Breadcrumbs";
import styles from "../marketing.module.css";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service",
  description: "The terms that govern your use of Tic Tac Toe Online.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Terms of Service", path: "/terms" }]} />

      <div className={styles.prose}>
        <h1 className={styles.heroTitle} style={{ textAlign: "left" }}>
          Terms of Service
        </h1>
        <p><em>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</em></p>

        <h2>Acceptance of terms</h2>
        <p>
          By accessing or playing Tic Tac Toe Online, you agree to these Terms of Service. If you
          do not agree, please do not use the site.
        </p>

        <h2>Use of the service</h2>
        <p>
          The game is provided free of charge for personal, non-commercial entertainment use. You
          agree not to use the service to disrupt other players, attempt to exploit or abuse the
          multiplayer infrastructure, or automate gameplay in a way that degrades the experience
          for others.
        </p>

        <h2>No account required</h2>
        <p>
          Most features do not require an account. Multiplayer rooms are identified by a temporary
          room code and are not tied to a persistent player identity unless a future feature (such
          as the leaderboard) explicitly says otherwise.
        </p>

        <h2>Advertising and monetization</h2>
        <p>
          The site may display third-party advertising to support hosting and development costs.
          We are not responsible for the content of third-party ads.
        </p>

        <h2>No warranty</h2>
        <p>
          The service is provided &quot;as is&quot; without warranties of any kind. We do not
          guarantee uninterrupted or error-free operation.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, Tic Tac Toe Online and its operators are not
          liable for any indirect, incidental, or consequential damages arising from use of the
          service.
        </p>

        <h2>Changes to these terms</h2>
        <p>We may update these terms from time to time. Continued use of the site after changes constitutes acceptance of the new terms.</p>

        <h2>Contact</h2>
        <p>Questions about these terms can be sent via our <Link href="/contact">contact page</Link>.</p>

        <p>
          <em>
            This is a template terms of service - have it reviewed by a legal professional for your
            jurisdiction before relying on it in production.
          </em>
        </p>
      </div>
    </>
  );
}
