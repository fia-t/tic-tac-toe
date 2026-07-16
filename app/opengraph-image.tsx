import { ImageResponse } from "next/og";
import { siteConfig } from "@/app/lib/seo/site-config";

export const runtime = "edge";
export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Next.js App Router рендерить /opengraph-image за цією конвенцією - той самий
// файл автоматично підключається як og:image і twitter:image, без ручних <meta>.
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(155deg, #2b1a08 0%, #6b4a25 100%)",
          color: "#f5e0b6",
          fontSize: 90,
          fontWeight: 700,
        }}
      >
        <div style={{ display: "flex", gap: 24, fontSize: 140, marginBottom: 20 }}>
          <span style={{ color: "#f5f5f5" }}>X</span>
          <span style={{ color: "#e6c890" }}>O</span>
          <span style={{ color: "#f5f5f5" }}>X</span>
        </div>
        <div style={{ display: "flex" }}>Tic Tac Toe Online</div>
        <div style={{ display: "flex", fontSize: 36, fontWeight: 400, marginTop: 16, color: "#e6c890" }}>
          Play Free - Vs AI - With Friends - Multiplayer
        </div>
      </div>
    ),
    { ...size }
  );
}
