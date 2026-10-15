"use client";
import React from "react";
import styled from "styled-components";
import { InfoPill } from "@game/components/pageStyles";
import { LEAGUES, League, leagueFor } from "@game/lib/rating";
import { useT } from "@game/lib/i18n";

// Кубок ліги - у її кольорі [заливка, контур]; у Діаманта на чаші ще й камінець.
const CUP_COLORS: Record<League, [string, string]> = {
    wood: ["#b98252", "#6e4520"],
    bronze: ["#dd8f4f", "#8a4e1e"],
    silver: ["#dfe5eb", "#7d8a97"],
    gold: ["#ffd04d", "#b5800c"],
    diamond: ["#9be8f7", "#1f8aa8"],
};

export const LeagueCup = ({ league, size = 20 }: { league: League; size?: number }) => {
    const [fill, stroke] = CUP_COLORS[league];
    return (
        <svg className="cup" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M6.5 5H3.8v1.4a3.6 3.6 0 0 0 3.7 3.6M17.5 5h2.7v1.4a3.6 3.6 0 0 1-3.7 3.6" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M6 3h12v4.5a6 6 0 0 1-12 0z" fill={fill} stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M10.6 13.4h2.8v3.4h-2.8z" fill={fill} stroke={stroke} strokeWidth="1.2" />
            <path d="M7.5 17h9a1 1 0 0 1 1 1v2.5h-11V18a1 1 0 0 1 1-1z" fill={fill} stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M8.4 5v2.6a3.6 3.6 0 0 0 1.5 2.9" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.2" strokeLinecap="round" />
            {league === "diamond" && <path d="M12 5.2l1.8 1.8L12 9.3 10.2 7z" fill="#fff" stroke={stroke} strokeWidth="0.9" strokeLinejoin="round" />}
        </svg>
    );
};

const Badge = styled(InfoPill)<{ $compact: boolean }>`
    gap: 5px;

    /* На вузькому екрані (поруч із привітанням) - лише кубок, без назви ліги. */
    ${({ $compact }) =>
        $compact
            ? `
        @media (max-width: 420px) {
            padding: 0 8px;
            & > span { display: none; }
        }
    `
            : ""}
`;

// Плашка ліги: кубок і назва (за потреби - з рейтингом).
export const LeagueBadge = ({ rating, withRating = false, compact = false }: { rating: number; withRating?: boolean; compact?: boolean }) => {
    const t = useT();
    const league = leagueFor(rating);
    const name = t(`league_${league}`);
    return (
        <Badge $compact={compact} title={t("leagueTitle", { league: name })}>
            <LeagueCup league={league} />
            <span>
                {name}
                {withRating ? ` · ${rating}` : ""}
            </span>
        </Badge>
    );
};

// Ліги в профілі - пласкі бейджі з кубками: досягнуті - у кольорі своєї ліги, поточна - з обвідкою,
// ще не досягнуті - приглушені (сірий кубок).
const LEAGUE_STYLES: Record<League, string> = {
    wood: "background: linear-gradient(180deg, #a06a3a, #7a4a22);",
    bronze: "background: linear-gradient(180deg, #d08a4a, #9c5a24);",
    silver: "background: linear-gradient(180deg, #d7dde3, #9aa5b1); color: #2f3a45; text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);",
    gold: "background: linear-gradient(180deg, #ffd56a, #e0a10e); color: #4a2c0c; text-shadow: 0 1px 0 rgba(255, 240, 200, 0.6);",
    diamond: "background: linear-gradient(180deg, #8fe3f5, #2aa8c9); color: #08394a; text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);",
};

const LeagueList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const LeagueItem = styled.span<{ $league: League; $got: boolean; $now: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 14px;
    background: rgba(139, 101, 60, 0.08);
    color: #a8957c;

    ${({ $got, $league }) => ($got ? `color: #fff7e8; text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25); ${LEAGUE_STYLES[$league]}` : "")}
    ${({ $now }) => ($now ? "box-shadow: 0 0 0 2px #fff7e8, 0 0 0 4px #49301f; font-weight: 700;" : "")}

    .cup {
        ${({ $got }) => ($got ? "" : "filter: grayscale(1) opacity(0.55);")}
    }
`;

export const LeagueLadder = ({ rating }: { rating: number }) => {
    const t = useT();
    const current = leagueFor(rating);
    return (
        <LeagueList role="list">
            {LEAGUES.map((league) => (
                <LeagueItem
                    key={league.id}
                    role="listitem"
                    $league={league.id}
                    $got={rating >= league.min}
                    $now={current === league.id}
                    aria-current={current === league.id ? "true" : undefined}
                >
                    <LeagueCup league={league.id} size={18} />
                    {t(`league_${league.id}`)} · {league.min}+
                </LeagueItem>
            ))}
        </LeagueList>
    );
};
