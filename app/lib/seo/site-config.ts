// Єдине джерело правди для домену, назви бренду й дефолтних SEO-значень.
// Змінюйте NEXT_PUBLIC_SITE_URL у .env.local - усі canonical/OG/sitemap/JSON-LD
// посилання підхоплять нове значення автоматично, без правок коду.
const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tictactoe-game.com";

export const siteConfig = {
  name: "Tic Tac Toe Online",
  shortName: "TicTacToe",
  legalName: "Tic Tac Toe Online",
  url: rawSiteUrl.replace(/\/$/, ""),
  defaultLocale: "en",
  themeColor: "#8B4513",
  backgroundColor: "#1a1208",
  description:
    "Play Tic Tac Toe online for free - challenge a smart AI, play with a friend on one device, or battle in real-time multiplayer. No download, no signup required.",
  keywords: [
    "tic tac toe",
    "tic tac toe online",
    "play tic tac toe",
    "tic tac toe game",
    "free tic tac toe",
    "tic tac toe vs ai",
    "tic tac toe multiplayer",
    "browser game",
    "html5 game",
  ],
  twitterHandle: "@tictactoeonline",
  author: "Tic Tac Toe Online Team",
  organization: {
    name: "Tic Tac Toe Online",
    url: rawSiteUrl.replace(/\/$/, ""),
    logo: `${rawSiteUrl.replace(/\/$/, "")}/icons/icon-512.png`,
    sameAs: [] as string[],
  },
} as const;

export type SiteConfig = typeof siteConfig;
