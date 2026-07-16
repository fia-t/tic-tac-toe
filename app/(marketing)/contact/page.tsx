import type { Metadata } from "next";
import { buildMetadata } from "@/app/lib/seo/metadata";
import { Breadcrumbs } from "@/app/components/seo/Breadcrumbs";
import styles from "../marketing.module.css";

export const metadata: Metadata = buildMetadata({
  title: "Contact Us",
  description: "Get in touch with the Tic Tac Toe Online team - feedback, bug reports, and advertising inquiries.",
  path: "/contact",
});

// Плейсхолдер-адреса - замініть на реальну поштову скриньку перед публікацією (див. README).
const CONTACT_EMAIL = "hello@tictactoe-game.com";

export default function ContactPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Contact", path: "/contact" }]} />

      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Contact Us</h1>
        <p className={styles.heroSubtitle}>
          Found a bug, have feedback, or want to talk advertising? We&apos;d like to hear from you.
        </p>
      </div>

      <div className={styles.prose} style={{ textAlign: "center" }}>
        <p>
          Email us directly at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
        <p style={{ fontSize: 13, opacity: 0.7 }}>
          (Placeholder address - update <code>CONTACT_EMAIL</code> in this page with a real inbox
          before launch.)
        </p>

        <h2>Bug reports</h2>
        <p>Please include your browser, device, and the steps that led to the issue.</p>

        <h2>Advertising & partnerships</h2>
        <p>See our <a href="/about">About page</a> for background on the project before reaching out.</p>
      </div>
    </>
  );
}
