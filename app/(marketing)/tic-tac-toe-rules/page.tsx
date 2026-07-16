import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/app/lib/seo/metadata";
import { JsonLd } from "@/app/lib/seo/json-ld";
import { Breadcrumbs } from "@/app/components/seo/Breadcrumbs";
import { AdSlot } from "@/app/components/ads/AdsManager";
import styles from "../marketing.module.css";

export const metadata: Metadata = buildMetadata({
  title: "Tic Tac Toe Rules - Official Rules & FAQ",
  description:
    "The complete official rules of Tic Tac Toe, plus answers to common questions: who goes first, what happens in a draw, and Ultimate Tic Tac Toe rules.",
  path: "/tic-tac-toe-rules",
  keywords: ["tic tac toe rules", "official tic tac toe rules", "ultimate tic tac toe rules"],
});

const faqs = [
  {
    question: "Who goes first in Tic Tac Toe?",
    answer:
      "By convention, the player using X always moves first. On this site, you always play as X against the AI.",
  },
  {
    question: "What happens if the board fills up with no winner?",
    answer:
      "The game ends in a draw. This is the most common outcome when both players avoid mistakes, since Tic Tac Toe is a solved game - perfect play from both sides always ends in a draw.",
  },
  {
    question: "Can you move to any empty cell, or only certain ones?",
    answer:
      "In classic Tic Tac Toe, you may play in any empty cell on your turn. Ultimate Tic Tac Toe adds a constraint: the cell you choose within a mini-board determines which mini-board your opponent must play in next.",
  },
  {
    question: "What are the rules of Ultimate Tic Tac Toe?",
    answer:
      "Ultimate Tic Tac Toe is played on a 3×3 grid of 3×3 boards. Winning a small board claims that cell on the large board for you; winning three claimed cells in a row on the large board wins the game. The cell you play sends your opponent to the matching mini-board next, unless that board is already won or full, in which case they may play anywhere.",
  },
  {
    question: "Is there a way to guarantee I never lose?",
    answer:
      "Yes - see our guide on how to never lose at Tic Tac Toe, which covers the exact priority order (win, block, fork, prevent fork) that guarantees at worst a draw against any opponent.",
  },
];

export default function RulesPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }}
      />
      <Breadcrumbs items={[{ name: "Rules", path: "/tic-tac-toe-rules" }]} />

      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Tic Tac Toe Rules</h1>
        <p className={styles.heroSubtitle}>The official rules, plus answers to common questions.</p>
      </div>

      <div className={styles.prose}>
        <h2>Objective</h2>
        <p>
          Be the first player to place three of your own marks (X or O) in a row - horizontally,
          vertically, or diagonally - on a 3×3 grid.
        </p>

        <h2>Setup</h2>
        <ul>
          <li>The game is played on a 3×3 grid of nine empty cells.</li>
          <li>One player is assigned X, the other O. X moves first.</li>
        </ul>

        <h2>Turn order</h2>
        <ol>
          <li>Players alternate turns, placing one mark per turn in any empty cell.</li>
          <li>Once placed, a mark cannot be moved or removed.</li>
          <li>The game ends immediately when a player completes a line of three, or when the board is full.</li>
        </ol>

        <h2>Winning lines</h2>
        <p>There are eight possible winning lines on a 3×3 board: three rows, three columns, and two diagonals.</p>

        <h2>Frequently asked questions</h2>
        {faqs.map((faq) => (
          <div key={faq.question}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </div>
        ))}

        <div className={styles.section}>
          <AdSlot position="between-content" />
        </div>

        <div className={styles.ctaRow}>
          <Link href="/" className={styles.ctaButton}>
            Play Now
          </Link>
          <Link href="/how-to-play" className={styles.ctaButtonSecondary}>
            Beginner&apos;s Guide
          </Link>
        </div>
      </div>
    </>
  );
}
