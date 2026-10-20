"use client";
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { collection, getDocs, limit, orderBy, query, type Timestamp } from "firebase/firestore";
import { getFirebaseDb } from "@game/lib/firebase";
import type { PlayerRecord } from "@game/lib/players";
import { CAMPAIGN_LEVELS } from "@game/lib/campaign";
import { leagueFor } from "@game/lib/rating";
import { ErrorText, TextInput } from "@game/components/onlineStyles";
import { EmptyState, Section, StatCard, StatCardRow, StatLabel, StatValue, Table, TableWrap, Td, Th } from "@/app/admin/adminStyles";

// Гравці: картки з players/{uid}, які пише сама гра (game/src/lib/players.ts) - на старті й
// після кожної партії. Хто (ім'я або наше випадкове, акаунт порталу), де грав, коли востаннє
// і прогрес кампанії; рядок розгортається в подробиці.

type Row = PlayerRecord & { id: string };

const LIMIT = 500;
const MAX_STARS = CAMPAIGN_LEVELS.length * 3;

const SOURCE_LABEL: Record<string, string> = { site: "Сайт", embed: "Новини (iframe)", portal: "Портал", crazygames: "CrazyGames", poki: "Poki", itch: "itch.io" };
const LEAGUE_LABEL: Record<string, string> = { wood: "Дерево", bronze: "Бронза", silver: "Срібло", gold: "Золото", diamond: "Діамант" };

const toDate = (value: Timestamp | null | undefined): Date | null => (value && typeof value.toDate === "function" ? value.toDate() : null);

const formatDate = (date: Date | null): string =>
    date
        ? date.toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : "—";

const ago = (date: Date | null): string => {
    if (!date) return "";
    const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
    if (minutes < 1) return "щойно";
    if (minutes < 60) return `${minutes} хв тому`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} год тому`;
    return `${Math.floor(hours / 24)} дн тому`;
};

const RowButton = styled.tr<{ $open: boolean }>`
    cursor: pointer;
    background: ${({ $open }) => ($open ? "rgba(139, 101, 60, 0.06)" : "transparent")};

    &:hover {
        background: rgba(139, 101, 60, 0.06);
    }
`;

const Caret = styled.span<{ $open: boolean }>`
    display: inline-block;
    width: 12px;
    color: #a08b6d;
    transform: rotate(${({ $open }) => ($open ? 90 : 0)}deg);
    transition: transform 0.15s ease;
`;

const Id = styled.span`
    margin-right: 8px;
    color: #8a7660;
    font-family: ui-monospace, Consolas, monospace;
    font-size: 12px;
`;

const Name = styled.span`
    font-weight: 700;
    color: #4a2c0c;
`;

const QsBadge = styled.span`
    margin-left: 8px;
    padding: 2px 7px;
    border-radius: 6px;
    background: #efe6ff;
    color: #6b3fd6;
    font-family: ui-monospace, Consolas, monospace;
    font-size: 12px;
`;

const Chip = styled.span<{ $direct?: boolean }>`
    display: inline-block;
    margin: 2px 6px 2px 0;
    padding: 2px 10px;
    border-radius: 999px;
    border: 1.5px solid ${({ $direct }) => ($direct ? "#5b5b66" : "#b5700a")};
    background: ${({ $direct }) => ($direct ? "#eef0f4" : "#fff4dd")};
    color: ${({ $direct }) => ($direct ? "#3c3c46" : "#8a4e00")};
    font-size: 12px;
`;

const Sub = styled.div`
    color: #9a876d;
    font-size: 12px;
`;

const Bar = styled.span`
    display: inline-block;
    vertical-align: middle;
    width: 90px;
    height: 7px;
    margin-left: 8px;
    border-radius: 999px;
    background: #efe6d6;
    overflow: hidden;

    i {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: #1fb37a;
    }
`;

const Details = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 8px 16px;
    padding: 6px 0 10px 20px;
    white-space: normal;

    div {
        font-size: 13px;
    }

    b {
        display: block;
        color: #7a5a35;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }
`;

export const PlayersSection: React.FC = () => {
    const [rows, setRows] = useState<Row[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        getDocs(query(collection(getFirebaseDb(), "players"), orderBy("lastPlayed", "desc"), limit(LIMIT)))
            .then((snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as PlayerRecord) }))))
            .catch((err) => {
                console.error("players", err);
                setError("Не вдалося завантажити гравців. Перевірте, що опубліковано нові правила Firestore.");
            });
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!rows || !q) return rows ?? [];
        return rows.filter((r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || (r.qsId ?? "").toLowerCase().includes(q));
    }, [rows, search]);

    const stats = useMemo(() => {
        const list = rows ?? [];
        const day = Date.now() - 86_400_000;
        const week = Date.now() - 7 * 86_400_000;
        return {
            total: list.length,
            day: list.filter((r) => (toDate(r.lastPlayed)?.getTime() ?? 0) > day).length,
            week: list.filter((r) => (toDate(r.lastPlayed)?.getTime() ?? 0) > week).length,
            portal: list.filter((r) => r.qsId).length,
        };
    }, [rows]);

    return (
        <Section>
            <StatCardRow>
                <StatCard>
                    <StatValue>{stats.total}</StatValue>
                    <StatLabel>гравців{rows && rows.length >= LIMIT ? ` (останні ${LIMIT})` : ""}</StatLabel>
                </StatCard>
                <StatCard>
                    <StatValue>{stats.day}</StatValue>
                    <StatLabel>грали за добу</StatLabel>
                </StatCard>
                <StatCard>
                    <StatValue>{stats.week}</StatValue>
                    <StatLabel>за тиждень</StatLabel>
                </StatCard>
                <StatCard>
                    <StatValue>{stats.portal}</StatValue>
                    <StatLabel>з акаунтом порталу</StatLabel>
                </StatCard>
            </StatCardRow>

            <TextInput placeholder="Пошук за іменем або ID" value={search} onChange={(e) => setSearch(e.target.value)} style={{ margin: "14px 0" }} />

            {error && <ErrorText>{error}</ErrorText>}
            {!error && rows === null && <EmptyState>Завантаження...</EmptyState>}
            {!error && rows !== null && filtered.length === 0 && (
                <EmptyState>{rows.length === 0 ? "Поки що немає жодного гравця - картки з'являться після першого заходу в гру." : "Нікого не знайдено."}</EmptyState>
            )}

            {filtered.length > 0 && (
                <TableWrap>
                    <Table>
                        <thead>
                            <tr>
                                <Th>Гравець</Th>
                                <Th>Де грав</Th>
                                <Th>Остання гра</Th>
                                <Th>Кампанія (зірки)</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((r) => {
                                const last = toDate(r.lastPlayed);
                                const isOpen = open === r.id;
                                const hosts = r.hosts?.length ? r.hosts : [];
                                return (
                                    <React.Fragment key={r.id}>
                                        <RowButton $open={isOpen} onClick={() => setOpen(isOpen ? null : r.id)}>
                                            <Td>
                                                <Caret $open={isOpen}>▸</Caret>
                                                <Id>{r.qsId ? `qs-${r.qsId.slice(0, 5)}` : r.id.slice(0, 8)}</Id>
                                                <Name>{r.name || "Гравець"}</Name>
                                                {r.qsId && <QsBadge>{r.qsId.slice(0, 8)}</QsBadge>}
                                            </Td>
                                            <Td>
                                                {hosts.length === 0
                                                    ? "—"
                                                    : hosts.map((h) => (
                                                          <Chip key={h} $direct={h === "direct"}>
                                                              {h === "direct" ? "Пряме посилання" : h}
                                                          </Chip>
                                                      ))}
                                            </Td>
                                            <Td>
                                                {formatDate(last)}
                                                <Sub>{ago(last)}</Sub>
                                            </Td>
                                            <Td>
                                                {r.campaignStars ?? 0} / {MAX_STARS}
                                                <Bar>
                                                    <i style={{ width: `${Math.min(1, (r.campaignStars ?? 0) / MAX_STARS) * 100}%` }} />
                                                </Bar>
                                            </Td>
                                        </RowButton>
                                        {isOpen && (
                                            <tr>
                                                <Td colSpan={4}>
                                                    <Details>
                                                        <div>
                                                            <b>ID</b>
                                                            {r.id}
                                                        </div>
                                                        <div>
                                                            <b>Акаунт порталу</b>
                                                            {r.qsId ?? "гість"}
                                                        </div>
                                                        <div>
                                                            <b>Джерело</b>
                                                            {SOURCE_LABEL[r.source] ?? r.source}
                                                        </div>
                                                        <div>
                                                            <b>Перший візит</b>
                                                            {formatDate(toDate(r.firstSeen))}
                                                        </div>
                                                        <div>
                                                            <b>Партій</b>
                                                            {r.games} (перемог {r.wins}, нічиїх {r.draws}, поразок {r.losses})
                                                        </div>
                                                        <div>
                                                            <b>Онлайн-перемог</b>
                                                            {r.onlineWins ?? 0}
                                                        </div>
                                                        <div>
                                                            <b>Рівень</b>
                                                            {r.level} ({r.xp} досвіду)
                                                        </div>
                                                        <div>
                                                            <b>Монети</b>
                                                            {r.coins}
                                                        </div>
                                                        <div>
                                                            <b>Серія виклику дня</b>
                                                            {r.dailyStreak}
                                                        </div>
                                                        <div>
                                                            <b>Рейтинг</b>
                                                            {r.rating} · {r.ratedPlayed ? LEAGUE_LABEL[leagueFor(r.rating)] : "ще не грав рейтингових"}
                                                        </div>
                                                    </Details>
                                                </Td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </Table>
                </TableWrap>
            )}
        </Section>
    );
};
