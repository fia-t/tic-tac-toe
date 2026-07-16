import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/app/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "You're Offline",
  description: "This page is unavailable offline.",
  path: "/offline",
  noindex: true,
});

// Фолбек-сторінка сервіс-воркера (public/sw.js) - показується для навігаційних
// запитів, коли мережа недоступна і сторінки нема в кеші.
export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        textAlign: "center",
        padding: 24,
        background: "#2b1a08",
        color: "#f5e0b6",
      }}
    >
      <h1>You&apos;re offline</h1>
      <p>Check your connection and try again. Any online multiplayer match will resume once you&apos;re back online.</p>
      <Link href="/" style={{ color: "#e6c890", textDecoration: "underline" }}>
        Try Home Again
      </Link>
    </main>
  );
}
