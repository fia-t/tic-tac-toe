// Статичний перелік title/description/path існуючих сторінок - для показу в
// адмінському розділі SEO. Значення - той самий текст, що передається в
// buildMetadata() на кожній сторінці (app/**/page.tsx); тут лише його копія
// для читання в адмінці, зміна тут НЕ впливає на фактичні метадані сторінок.
export type SeoPageEntry = {
    title: string;
    description: string;
    path: string;
};

export const SEO_PAGES: SeoPageEntry[] = [
    {
        title: "Play Tic Tac Toe Online - Free, No Download",
        description:
            "Play Tic Tac Toe online for free. Challenge a smart AI, play with a friend via invite link, or battle in real-time multiplayer - no download, no signup.",
        path: "/",
    },
    {
        title: "Play Tic Tac Toe vs AI - Free Computer Opponent",
        description:
            "Challenge a smart Tic Tac Toe AI opponent for free. Choose Traditional mode or the tougher Ultimate Tic Tac Toe difficulty - no download, no signup.",
        path: "/play-vs-ai",
    },
    {
        title: "Play Tic Tac Toe with a Friend Online - Free Invite Link",
        description:
            "Invite a friend to play Tic Tac Toe online in real time. Create a room, share the link, and play together from any two devices - free, no signup.",
        path: "/play-vs-friend",
    },
    {
        title: "Tic Tac Toe Multiplayer - Real-Time Online Matches",
        description:
            "Play Tic Tac Toe online in real time. Rooms sync instantly across devices using Firebase, so every move appears the moment it's played.",
        path: "/multiplayer",
    },
    {
        title: "How to Play Tic Tac Toe - Beginner's Guide",
        description:
            "A simple, step-by-step guide to playing Tic Tac Toe: how turns work, how to win, and how to use vs AI, vs friend, and multiplayer modes on this site.",
        path: "/how-to-play",
    },
    {
        title: "Tic Tac Toe Rules - Official Rules & FAQ",
        description:
            "The complete official rules of Tic Tac Toe, plus answers to common questions: who goes first, what happens in a draw, and Ultimate Tic Tac Toe rules.",
        path: "/tic-tac-toe-rules",
    },
    {
        title: "Tic Tac Toe Daily Challenge",
        description:
            "A new Tic Tac Toe puzzle every day, coming soon. Play the regular game vs AI, with friends, or online while we finish building the daily challenge.",
        path: "/daily-challenge",
    },
    {
        title: "Tic Tac Toe Leaderboard",
        description:
            "A global Tic Tac Toe leaderboard is coming soon, ranking wins across AI, friend, and multiplayer matches. Here's what's planned.",
        path: "/leaderboard",
    },
    {
        title: "Blog - Tic Tac Toe Strategy, History & Browser Games",
        description:
            "Read strategy guides, AI explainers, and the history of Tic Tac Toe, plus articles on the best browser and HTML5 games.",
        path: "/blog",
    },
    {
        title: "About Tic Tac Toe Online",
        description:
            "Tic Tac Toe Online is a free, no-download browser game with AI, friend, and real-time multiplayer modes. Learn what we're building and why.",
        path: "/about",
    },
    {
        title: "Contact Us",
        description: "Get in touch with the Tic Tac Toe Online team - feedback, bug reports, and advertising inquiries.",
        path: "/contact",
    },
    {
        title: "Privacy Policy",
        description: "How Tic Tac Toe Online collects, uses, and protects your data.",
        path: "/privacy",
    },
    {
        title: "Terms of Service",
        description: "The terms that govern your use of Tic Tac Toe Online.",
        path: "/terms",
    },
];
