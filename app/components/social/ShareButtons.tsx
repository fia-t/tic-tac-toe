"use client";
import { useState } from "react";
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
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X (Twitter)"
        style={shareButtonStyle}
      >
        Share on X
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        style={shareButtonStyle}
      >
        Share on Facebook
      </a>
      <button type="button" onClick={handleCopy} aria-label="Copy link" style={shareButtonStyle}>
        {copied ? "Link copied!" : "Copy Link"}
      </button>
    </div>
  );
}

const shareButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 16px",
  borderRadius: 999,
  border: "1px solid #8B4513",
  background: "transparent",
  color: "#4a3016",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
  cursor: "pointer",
};
