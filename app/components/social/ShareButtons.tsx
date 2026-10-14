"use client";
import { useState } from "react";
import styled from "styled-components";
import { GameButton, gameButtonCss } from "@game/components/GameButton";
import { siteConfig } from "@/app/lib/seo/site-config";

export function ShareButtons({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${siteConfig.url}${path}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API недоступний (напр. без HTTPS) - користувач і так бачить URL у адресному рядку.
    }
  };

  return (
    <div
      role="group"
      aria-label="Share this page"
      style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}
    >
      <ShareLink
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X (Twitter)"
      >
        Share on X
      </ShareLink>
      <ShareLink
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
      >
        Share on Facebook
      </ShareLink>
      <GameButton size="sm" onClick={handleCopy} aria-label="Copy link">
        {copied ? "Link copied!" : "Copy Link"}
      </GameButton>
    </div>
  );
}

// Посилання поділитися - та сама еталонна форма кнопки, що й у грі.
const ShareLink = styled.a`
  ${gameButtonCss("sm")}
  text-decoration: none;
`;
