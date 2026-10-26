"use client";
import React, { useEffect, useMemo, useState } from "react";
import { GameLogEntry, getGameLogsInRange } from "@game/lib/gameLog";
import { ErrorText } from "@game/components/onlineStyles";
import {
    Section,
    SectionTitle,
    FilterBar,
    FilterButton,
    DateRangeRow,
    DateInput,
    StatCardRow,
    StatCard,
    StatValue,
    StatLabel,
    StatHint,
    EmptyState,
    TableWrap,
    Table,
    Th,
    Td,
} from "@/app/admin/adminStyles";

type Preset = "7" | "14" | "30" | "custom";

const MODE_LABEL: Record<string, string> = {
    "ai-easy": "ШІ - легкий",
    "ai-hard": "ШІ - складний",
    "friend-3x3": "З другом - 3x3",
    "friend-9x9": "З другом - 9x9",
    "ai-5x5": "ШІ - 5x5",
    "friend-5x5": "З другом - 5x5",
};

// "unknown" - записи до появи поля source (сайт чи портал - невідомо).
type SourceFilter = "all" | "site" | "embed" | "portal" | "crazygames" | "poki" | "itch" | "unknown";

const SOURCE_LABEL: Record<Exclude<SourceFilter, "all">, string> = {
    site: "Сайт",
    embed: "Новини (iframe)",
    portal: "Портал",
    crazygames: "CrazyGames",
    poki: "Poki",
    itch: "itch.io",
    unknown: "Не вказано",
};

const sourceKey = (log: GameLogEntry): Exclude<SourceFilter, "all"> => log.source ?? "unknown";

const OUTCOME_LABEL: Record<string, string> = {
    win: "Перемога гравця",
    lose: "Перемога ШІ",
    draw: "Нічия",
    x_win: "Переміг X",
    o_win: "Переміг O",
};

const toDateInputValue = (date: Date): string => date.toISOString().slice(0, 10);

const startOfDay = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const endOfDay = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
};

const describeError = (fallback: string, err: unknown): string => {
    const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : null;
    console.error(fallback, err);
    return code ? `${fallback} (${code})` : fallback;
};

// Дашборд: фільтр періоду (7/14/30 днів або довільний діапазон), загальний
// лічильник зіграних партій і таблиці розбивки по днях/режимах гри.
export const DashboardSection: React.FC = () => {
    const [preset, setPreset] = useState<Preset>("7");
    const today = useMemo(() => new Date(), []);
    const [customStart, setCustomStart] = useState(() => toDateInputValue(new Date(today.getTime() - 7 * 86400000)));
    const [customEnd, setCustomEnd] = useState(() => toDateInputValue(today));

    const [logs, setLogs] = useState<GameLogEntry[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const range = useMemo(() => {
        if (preset === "custom") {
            const start = customStart ? startOfDay(new Date(customStart)) : startOfDay(today);
            const end = customEnd ? endOfDay(new Date(customEnd)) : endOfDay(today);
            return { start, end };
        }
        const days = Number(preset);
        const start = startOfDay(new Date(today.getTime() - (days - 1) * 86400000));
        const end = endOfDay(today);
        return { start, end };
    }, [preset, customStart, customEnd, today]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        getGameLogsInRange(range.start, range.end)
            .then((data) => {
                if (!cancelled) setLogs(data);
            })
            .catch((err) => {
                if (!cancelled) setError(describeError("Не вдалося завантажити статистику ігор.", err));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [range]);

    const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

    // Розбивка по джерелах завжди по всіх логах періоду - щоб було видно, які
    // джерела взагалі є, навіть коли вибрано фільтр.
    const bySource = useMemo(() => {
        const map = new Map<Exclude<SourceFilter, "all">, number>();
        (logs ?? []).forEach((log) => map.set(sourceKey(log), (map.get(sourceKey(log)) ?? 0) + 1));
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    }, [logs]);

    const filteredLogs = useMemo(
        () => (logs ?? []).filter((log) => sourceFilter === "all" || sourceKey(log) === sourceFilter),
        [logs, sourceFilter]
    );

    // По днях: партії, гравці (пристрої з полем player) і скільки з них повернулися -
    // уже грали в один із попередніх днів періоду (у перший день періоду завжди 0).
    const byDay = useMemo(() => {
        const map = new Map<string, { games: number; players: Set<string> }>();
        filteredLogs.forEach((log) => {
            const date = log.createdAt?.toDate();
            const key = date ? toDateInputValue(date) : "?";
            const day = map.get(key) ?? { games: 0, players: new Set<string>() };
            day.games += 1;
            if (log.player) day.players.add(log.player);
            map.set(key, day);
        });
        const seen = new Set<string>();
        const rows = Array.from(map.entries())
            .sort((a, b) => (a[0] < b[0] ? -1 : 1))
            .map(([date, day]) => {
                const returning = Array.from(day.players).filter((p) => seen.has(p)).length;
                day.players.forEach((p) => seen.add(p));
                return { date, games: day.games, players: day.players.size, returning };
            });
        return rows.reverse();
    }, [filteredLogs]);

    const byMode = useMemo(() => {
        const map = new Map<string, { outcomes: Map<string, number>; mobile: number; desktop: number; unknown: number }>();
        filteredLogs.forEach((log) => {
            const row = map.get(log.mode) ?? { outcomes: new Map<string, number>(), mobile: 0, desktop: 0, unknown: 0 };
            row.outcomes.set(log.outcome, (row.outcomes.get(log.outcome) ?? 0) + 1);
            row[log.device ?? "unknown"] += 1;
            map.set(log.mode, row);
        });
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [filteredLogs]);

    // Колонка "Не вказано" - лише поки в періоді є старі записи без поля device.
    const hasUnknownDevice = byMode.some(([, row]) => row.unknown > 0);

    // Люди (пристрої) за періодом: скільки партій зіграв кожен і в скільки різних
    // днів (повернення). Рахуються лише записи з полем player - старі логи його не мають.
    const players = useMemo(() => {
        const map = new Map<string, { games: number; days: Set<string> }>();
        filteredLogs.forEach((log) => {
            if (!log.player) return;
            const entry = map.get(log.player) ?? { games: 0, days: new Set<string>() };
            entry.games += 1;
            const date = log.createdAt?.toDate();
            if (date) entry.days.add(toDateInputValue(date));
            map.set(log.player, entry);
        });
        const entries = Array.from(map.values());
        return {
            total: entries.length,
            repeat: entries.filter((e) => e.games > 1).length,
            returned: entries.filter((e) => e.days.size > 1).length,
        };
    }, [filteredLogs]);

    const total = filteredLogs.length;
    const hasData = logs !== null && filteredLogs.length > 0;

    return (
        <>
            <Section>
                <SectionTitle>Період</SectionTitle>
                <FilterBar>
                    <FilterButton type="button" $active={preset === "7"} onClick={() => setPreset("7")}>
                        7 днів
                    </FilterButton>
                    <FilterButton type="button" $active={preset === "14"} onClick={() => setPreset("14")}>
                        14 днів
                    </FilterButton>
                    <FilterButton type="button" $active={preset === "30"} onClick={() => setPreset("30")}>
                        30 днів
                    </FilterButton>
                    <FilterButton type="button" $active={preset === "custom"} onClick={() => setPreset("custom")}>
                        Період
                    </FilterButton>

                    {preset === "custom" && (
                        <DateRangeRow>
                            <DateInput
                                type="date"
                                value={customStart}
                                max={customEnd}
                                onChange={(e) => setCustomStart(e.target.value)}
                            />
                            <span>—</span>
                            <DateInput
                                type="date"
                                value={customEnd}
                                min={customStart}
                                max={toDateInputValue(today)}
                                onChange={(e) => setCustomEnd(e.target.value)}
                            />
                        </DateRangeRow>
                    )}
                </FilterBar>

                <SectionTitle>Джерело</SectionTitle>
                <FilterBar>
                    <FilterButton type="button" $active={sourceFilter === "all"} onClick={() => setSourceFilter("all")}>
                        Усі
                    </FilterButton>
                    {(Object.keys(SOURCE_LABEL) as Exclude<SourceFilter, "all">[]).map((key) => (
                        <FilterButton
                            key={key}
                            type="button"
                            $active={sourceFilter === key}
                            onClick={() => setSourceFilter(key)}
                        >
                            {SOURCE_LABEL[key]}
                        </FilterButton>
                    ))}
                </FilterBar>

                {error && <ErrorText>{error}</ErrorText>}

                <StatCardRow>
                    <StatCard>
                        <StatValue>{loading ? "…" : total}</StatValue>
                        <StatLabel>Зіграно партій за період</StatLabel>
                    </StatCard>
                    <StatCard>
                        <StatValue>{loading ? "…" : players.repeat}</StatValue>
                        <StatLabel>Зіграли більше однієї партії</StatLabel>
                        <StatHint>
                            {loading ? "" : `з ${players.total} гравців за період`}
                        </StatHint>
                    </StatCard>
                    <StatCard>
                        <StatValue>{loading ? "…" : players.returned}</StatValue>
                        <StatLabel>Повернулися (грали в різні дні)</StatLabel>
                        <StatHint>
                            {loading ? "" : `з ${players.total} гравців за період`}
                        </StatHint>
                    </StatCard>
                </StatCardRow>
            </Section>

            {!loading && !hasData && !error && (
                <Section>
                    <EmptyState>Немає даних</EmptyState>
                </Section>
            )}

            {logs !== null && logs.length > 0 && (
                <Section>
                    <SectionTitle>Партії по джерелах</SectionTitle>
                    <TableWrap>
                        <Table>
                            <thead>
                                <tr>
                                    <Th>Джерело</Th>
                                    <Th>Кількість партій</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {bySource.map(([key, count]) => (
                                    <tr key={key}>
                                        <Td>{SOURCE_LABEL[key]}</Td>
                                        <Td>{count}</Td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </TableWrap>
                </Section>
            )}

            {hasData && (
                <>
                    <Section>
                        <SectionTitle>Партії по днях</SectionTitle>
                        <TableWrap>
                            <Table>
                                <thead>
                                    <tr>
                                        <Th>Дата</Th>
                                        <Th>Кількість партій</Th>
                                        <Th>Гравців</Th>
                                        <Th>З них повернулися</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {byDay.map((day) => (
                                        <tr key={day.date}>
                                            <Td>{day.date}</Td>
                                            <Td>{day.games}</Td>
                                            <Td>{day.players}</Td>
                                            <Td>{day.returning}</Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </TableWrap>
                    </Section>

                    <Section>
                        <SectionTitle>Партії по режимах</SectionTitle>
                        <TableWrap>
                            <Table>
                                <thead>
                                    <tr>
                                        <Th>Режим</Th>
                                        <Th>Всього</Th>
                                        <Th>Мобільний</Th>
                                        <Th>Ноутбук/ПК</Th>
                                        {hasUnknownDevice && <Th>Пристрій не вказано</Th>}
                                        <Th>Розбивка</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {byMode.map(([mode, row]) => {
                                        const modeTotal = row.mobile + row.desktop + row.unknown;
                                        const breakdown = Array.from(row.outcomes.entries())
                                            .map(([outcome, count]) => `${OUTCOME_LABEL[outcome] ?? outcome}: ${count}`)
                                            .join(", ");
                                        return (
                                            <tr key={mode}>
                                                <Td>{MODE_LABEL[mode] ?? mode}</Td>
                                                <Td>{modeTotal}</Td>
                                                <Td>{row.mobile}</Td>
                                                <Td>{row.desktop}</Td>
                                                {hasUnknownDevice && <Td>{row.unknown}</Td>}
                                                <Td style={{ whiteSpace: "normal" }}>{breakdown}</Td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </TableWrap>
                    </Section>
                </>
            )}
        </>
    );
};
