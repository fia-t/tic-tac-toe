"use client";
import { IconClose, IconEdit } from "@game/components/GameIcons";
import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Overlay } from "@game/components/gameStyles";
import { ModalCard, ModalCloseButton, ModalTitle, ModalSubtitle, PillButton } from "@game/components/onlineStyles";
import { Card, Eyebrow, InfoPill, Muted, Page, Progress, Row, Spread } from "@game/components/pageStyles";
import { LeagueBadge, LeagueLadder } from "@game/components/LeagueCup";
import { InfoTip } from "@game/components/HomeScreen";
import { Star } from "@game/components/DailyChallenge";
import { ACHIEVEMENTS, levelBounds, levelForXp, setProfileName, useProfile } from "@game/lib/profile";
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

// Іконка кожного досягнення (своя тема замість однакових зірок); невідоме - зірка.
const ACH_ICONS: Record<string, React.ReactNode> = {
    first_win: <path d="M6 21V4M6 4h11l-2.5 4L17 12H6" />,
    streak5: <path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5.5 1-8.5z" />,
    master_draw: <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" />,
    master_win: <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" />,
    ultimate3: <path d="M9 4v16M15 4v16M4 9h16M4 15h16" />,
    online_win: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </>
    ),
    daily7: (
        <>
            <rect x="4" y="5" width="16" height="15" rx="2" />
            <path d="M4 10h16M8 3v4M16 3v4" />
        </>
    ),
    skins3: (
        <>
            <path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z" />
            <circle cx="7.5" cy="11" r="1" />
            <circle cx="10" cy="7" r="1" />
            <circle cx="15" cy="7" r="1" />
        </>
    ),
    beach: (
        <>
            <circle cx="15" cy="8" r="3" />
            <path d="M3 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
        </>
    ),
};

const AchIcon = ({ id, on }: { id: string; on: boolean }) =>
    ACH_ICONS[id] ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={on ? "#7a4a0c" : "#a8957c"} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ACH_ICONS[id]}
        </svg>
    ) : (
        <Star on={on} size={26} />
    );

// Олівець біля імені й поле для нового імені в картці профілю.
const NameEditButton = styled.button`
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 10px;
    background: rgba(139, 101, 60, 0.12);
    color: #7a5530;
    cursor: pointer;

    &:hover {
        background: rgba(139, 101, 60, 0.22);
    }
`;

const NameInput = styled.input`
    min-width: 0;
    flex: 1 1 auto;
    max-width: 360px;
    height: 44px;
    padding: 0 12px;
    border: 0;
    border-radius: 12px;
    background: #fff;
    box-shadow: inset 0 0 0 2px #0f6f8c;
    color: #49301f;
    font: 800 22px/1 var(--font-heading);
    outline: none;
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
                                <AchIcon id={a.id} on={done} />
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
    const shownName = profile.name ?? fallbackName ?? t("player");
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");
    const startEdit = () => {
        setDraft(shownName);
        setEditing(true);
    };
    const saveName = () => {
        setProfileName(draft);
        setEditing(false);
    };
    const xpText = t("profileXp", { n: String(profile.xp - from), total: String(to - from), next: String(level + 1) });
    return (
        <Page>
            <Card aria-labelledby="profile-title">
                <Eyebrow>{t("nav_profile")}</Eyebrow>
                {/* Ім'я, рівень і ліга - в одному ряду, рівень і ліга - по правому краю;
                    якщо ім'я не вміщається (телефон), рівень і ліга переходять під нього. */}
                <Spread>
                    {editing ? (
                        <NameInput
                            id="profile-title"
                            autoFocus
                            maxLength={40}
                            value={draft}
                            aria-label={t("profileRename")}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={saveName}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") saveName();
                                if (e.key === "Escape") setEditing(false);
                            }}
                        />
                    ) : (
                        <Row style={{ minWidth: 0, flexWrap: "nowrap", gap: 8 }}>
                            <h2 id="profile-title" style={{ minWidth: 0, overflowWrap: "break-word" }}>
                                {shownName}
                            </h2>
                            <NameEditButton type="button" onClick={startEdit} aria-label={t("profileRename")} title={t("profileRename")}>
                                <IconEdit size={16} />
                            </NameEditButton>
                        </Row>
                    )}
                    <Row style={{ flexShrink: 0, flexWrap: "nowrap", gap: 6 }}>
                        <InfoPill>{t("profileLevel", { n: String(level) })}</InfoPill>
                        <LeagueBadge rating={myRating.rating} played={myRating.played} withRating compact />
                    </Row>
                </Spread>
                <Progress role="img" aria-label={xpText}>
                    <i style={{ width: `${((profile.xp - from) / (to - from)) * 100}%` }} />
                </Progress>
                <Muted>{xpText}</Muted>
            </Card>
            <Card aria-labelledby="profile-stats">
                <h3 id="profile-stats">{t("profileStats")}</h3>
                <Stats>
                    {stats.map(([key, value]) => (
                        <Stat key={key}>
                            <b>{value}</b>
                            {t(key as Parameters<typeof t>[0], { n: String(value) })}
                        </Stat>
                    ))}
                </Stats>
            </Card>
            <Card aria-labelledby="profile-leagues">
                {/* Як рахується рейтинг - під "?", щоб не було стіни тексту одразу під ім'ям. */}
                <h3 id="profile-leagues" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {t("leaguesTitle")}
                    <InfoTip text={t("ratingExplain", { rating: String(myRating.rating), start: String(START_RATING) })} />
                </h3>
                <Muted>{myRating.played ? t("leaguesHint") : t("leagueNoneHint")}</Muted>
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
