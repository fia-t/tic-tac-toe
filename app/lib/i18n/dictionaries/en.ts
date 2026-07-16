export type Dictionary = {
  nav: {
    home: string;
    playVsAi: string;
    playVsFriend: string;
    multiplayer: string;
    dailyChallenge: string;
    leaderboard: string;
    howToPlay: string;
    rules: string;
    blog: string;
    about: string;
    contact: string;
    menu: string;
  };
  footer: {
    tagline: string;
    privacy: string;
    terms: string;
    contact: string;
    rights: string;
  };
  common: {
    playNow: string;
    readMore: string;
    backToHome: string;
    backToBlog: string;
    share: string;
    copyLink: string;
    linkCopied: string;
  };
};

// Канонічна форма словника - інші мови (uk/de/es/fr/it) мають той самий shape.
// TypeScript провалить збірку, якщо переклад пропустить якийсь ключ.
const dictionary: Dictionary = {
  nav: {
    home: "Play",
    playVsAi: "Play vs AI",
    playVsFriend: "Play vs Friend",
    multiplayer: "Multiplayer",
    dailyChallenge: "Daily Challenge",
    leaderboard: "Leaderboard",
    howToPlay: "How to Play",
    rules: "Rules",
    blog: "Blog",
    about: "About",
    contact: "Contact",
    menu: "Menu",
  },
  footer: {
    tagline: "Free Tic Tac Toe online - vs AI, with friends, or multiplayer.",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    contact: "Contact",
    rights: "All rights reserved.",
  },
  common: {
    playNow: "Play Now",
    readMore: "Read more",
    backToHome: "Back to Home",
    backToBlog: "Back to Blog",
    share: "Share",
    copyLink: "Copy Link",
    linkCopied: "Link copied!",
  },
};

export default dictionary;
