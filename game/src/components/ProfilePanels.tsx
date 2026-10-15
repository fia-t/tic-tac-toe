"use client";
import { IconClose } from "@game/components/GameIcons";
import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Overlay } from "@game/components/gameStyles";
import { ModalCard, ModalCloseButton, ModalTitle, ModalSubtitle, PillButton } from "@game/components/onlineStyles";
import { Card, Eyebrow, InfoPill, Muted, Page, Progress, Row, Spread } from "@game/components/pageStyles";
import { LeagueBadge, LeagueLadder } from "@game/components/LeagueCup";
import { Star } from "@game/components/DailyChallenge";
import { ACHIEVEMENTS, levelBounds, levelForXp, useProfile } from "@game/lib/profile";
import { useCampaign } from "@game/lib/campaign";
import { useWallet } from "@game/lib/wallet";
import { closePanel, useOpenPanel, useToasts } from "@game/lib/ui";
import { useT } from "@game/lib/i18n";
import { LeaderboardRow, fetchLeaderboard, useMyRating } from "@game/lib/matchmaking";
import { START_RATING, leagueFor } from "@game/lib/rating";

// Сторінки "Нагороди" й "Профіль" (як у прототипі - розділи нижнього меню), вікно лідерборду
// й сповіщення про досягнення.

const Achievement = styled.div`
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr);
    gap: 12px;
    align-items: center;
`;

const Medal = styled.span<{ $on: boolean }>`
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: ${({ $on }) => ($on ? "radial-gradient(circle at 35% 30%, #ffe28a, #f5b82e 60%, #c98a12)" : "#e7dccb")};
    box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.12);
`;

const Stats = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
`;

const Stat = styled.div`
    padding: 10px;
    border-radius: 16px;
    background: #ffe9c8;
    text-align: center;
    color: #4a2c0c;

    b {
        display: block;
        font: 800 26px/1 var(--font-heading);
        font-variant-numeric: tabular-nums;
    }
`;

export const AwardsPage = () => {
    const t = useT();
    const profile = useProfile();
    useWallet();
    useCampaign();
    return (
        <Page>
            <Card aria-labelledby="awards-title">
                <h2 id="awards-title">{t("awardsTitle")}</h2>
                <Muted>{t("awardsHint")}</Muted>
            </Card>
            <Card aria-label={t("awardsTitle")}>
                {ACHIEVEMENTS.map((a) => {
                    const [have, need] = a.progress(profile);
                    const done = Boolean(profile.achieved[a.id]);
                    return (
                        <Achievement key={a.id}>
                            <Medal $on={done} aria-hidden="true">
                                <Star on={done} size={26} />
                            </Medal>
                            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                                <Spread>
                                    <strong>{t(`ach_${a.id}` as Parameters<typeof t>[0])}</strong>
                                    <Muted style={{ fontVariantNumeric: "tabular-nums" }}>
                                        {Math.min(have, need)} / {need}
                                    </Muted>
                                </Spread>
                                <Muted>
                                    {t(`achDesc_${a.id}` as Parameters<typeof t>[0])} · {t("awardsReward", { n: String(a.reward) })}
                                </Muted>
                                <Progress role="img" aria-label={`${Math.min(have, need)} / ${need}`}>
                                    <i style={{ width: `${Math.min(1, have / need) * 100}%` }} />
                                </Progress>
                            </div>
                        </Achievement>
                    );
                })}
            </Card>
        </Page>
    );
};

export const ProfilePage = ({ fallbackName }: { fallbackName: string | null }) => {
    const t = useT();
    const profile = useProfile();
    const myRating = useMyRating();
    const level = levelForXp(profile.xp);
    const [from, to] = levelBounds(level);
    const s = profile.stats;
    const stats: [string, number][] = [
        ["stat_games", s.games],
        ["stat_wins", s.wins],
        ["stat_draws", s.draws],
        ["stat_bestStreak", s.bestStreak],
        ["stat_masterDraws", s.masterDraws],
        ["stat_onlineWins", s.onlineWins],
    ];
    const xpText = t("profileXp", { n: String(profile.xp - from), total: String(to - from), next: String(level + 1) });
    return (
        <Page>
            <Card aria-labelledby="profile-title">
                <Eyebrow>{t("nav_profile")}</Eyebrow>
                {/* Ім'я, рівень і ліга - в одному ряду; рівень і ліга - по правому краю. */}
                <Spread style={{ flexWrap: "nowrap" }}>
                    <h2 id="profile-title" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {profile.name ?? fallbackName ?? t("player")}
                    </h2>
                    <Row style={{ flexShrink: 0, flexWrap: "nowrap", gap: 6 }}>
                        <InfoPill>{t("profileLevel", { n: String(level) })}</InfoPill>
                        <LeagueBadge rating={myRating.rating} played={myRating.played} withRating compact />
                    </Row>
                </Spread>
                <Progress role="img" aria-label={xpText}>
                    <i style={{ width: `${((profile.xp - from) / (to - from)) * 100}%` }} />
                </Progress>
                <Muted>{xpText}</Muted>
                <Muted>{t("ratingExplain", { rating: String(myRating.rating), start: String(START_RATING) })}</Muted>
            </Card>
            <Card aria-labelledby="profile-stats">
                <h3 id="profile-stats">{t("profileStats")}</h3>
                <Stats>
                    {stats.map(([key, value]) => (
                        <Stat key={key}>
                            <b>{value}</b>
                            {t(key as Parameters<typeof t>[0])}
                        </Stat>
                    ))}
                </Stats>
            </Card>
            <Card aria-labelledby="profile-leagues">
                <h3 id="profile-leagues">{t("leaguesTitle")}</h3>
                <Muted>{t("leaguesHint")}</Muted>
                <LeagueLadder rating={myRating.rating} played={myRating.played} />
            </Card>
        </Page>
    );
};

const Modal: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => {
    const t = useT();
    return (
        <>
            <Overlay onClick={closePanel} style={{ zIndex: 1600 }} />
            <ModalCard role="dialog" aria-modal="true" aria-labelledby={id} onClick={(e) => e.stopPropagation()} style={{ zIndex: 1601 }}>
                <ModalCloseButton onClick={closePanel} aria-label={t("close")}>
                    <IconClose size={16} />
                </ModalCloseButton>
                <ModalTitle id={id}>{title}</ModalTitle>
                {children}
                <PillButton type="button" $variant="ghost" onClick={closePanel}>
                    {t("close")}
                </PillButton>
            </ModalCard>
        </>
    );
};

const Board = styled.ol`
    list-style: none;
    margin: 8px 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const BoardRow = styled.li<{ $me: boolean }>`
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    padding: 8px 10px;
    border-radius: 14px;
    background: ${({ $me }) => ($me ? "rgba(15, 111, 140, 0.14)" : "rgba(255, 255, 255, 0.55)")};
    color: #4a2c0c;
    font-size: 14px;

    b {
        font-variant-numeric: tabular-nums;
    }

    span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

const LeaderboardPanel = () => {
    const t = useT();
    const me = useMyRating();
    const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let cancelled = false;
        fetchLeaderboard(20)
            .then((list) => !cancelled && setRows(list))
            .catch(() => !cancelled && setFailed(true));
        return () => {
            cancelled = true;
        };
    }, []);
    return (
        <Modal id="leaderboard-title" title={t("leaderboardTitle")}>
            <Muted>{t("leaderboardHint")}</Muted>
            <ModalSubtitle>
                <LeagueBadge rating={me.rating} played={me.played} withRating />
            </ModalSubtitle>
            {failed ? (
                <Muted>{t("leaderboardError")}</Muted>
            ) : rows === null ? (
                <Muted>…</Muted>
            ) : rows.length === 0 ? (
                <Muted>{t("leaderboardEmpty")}</Muted>
            ) : (
                <Board>
                    {rows.map((row, index) => {
                        const isMe = row.playerId === me.playerId;
                        return (
                            <BoardRow key={row.playerId} $me={isMe}>
                                <b>{index + 1}</b>
                                <span title={row.name}>
                                    {row.name}
                                    {isMe ? ` (${t("leaderboardYou")})` : ""} · {t(`league_${leagueFor(row.rating)}`)}
                                </span>
                                <b>{row.rating}</b>
                            </BoardRow>
                        );
                    })}
                </Board>
            )}
        </Modal>
    );
};

const toastIn = keyframes`
    from { opacity: 0; transform: translate(-50%, -8px); }
    to { opacity: 1; transform: translate(-50%, 0); }
`;

const ToastBox = styled.div`
    position: fixed;
    left: 50%;
    top: 60px;
    z-index: 1700;
    max-width: calc(100% - 32px);
    padding: 10px 16px;
    border-radius: 999px;
    background: #4a2c0c;
    color: #fff6e6;
    font-weight: 800;
    font-size: 14px;
    text-align: center;
    box-shadow: 0 10px 24px rgba(40, 24, 8, 0.35);
    transform: translateX(-50%);
    animation: ${toastIn} 0.3s ease both;
`;

// Вікно лідерборду й сповіщення про досягнення - один раз на сторінку.
export const ProfilePanels = () => {
    const panel = useOpenPanel();
    const toasts = useToasts();
    return (
        <>
            {panel === "leaderboard" && <LeaderboardPanel />}
            {toasts.map((toast, index) => (
                <ToastBox key={toast.id} role="status" style={{ top: 60 + index * 48 }}>
                    {toast.text}
                </ToastBox>
            ))}
        </>
    );
};
