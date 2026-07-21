"use client";
import React, { useEffect, useMemo, useState } from "react";
import { GameLogEntry, getGameLogsInRange } from "@/app/lib/gameLog";
import { ErrorText } from "@/app/components/onlineStyles";
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
};

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

    const byDay = useMemo(() => {
        const map = new Map<string, number>();
        (logs ?? []).forEach((log) => {
            const date = log.createdAt?.toDate();
            const key = date ? toDateInputValue(date) : "?";
            map.set(key, (map.get(key) ?? 0) + 1);
        });
        return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
    }, [logs]);

    const byMode = useMemo(() => {
        const map = new Map<string, Map<string, number>>();
        (logs ?? []).forEach((log) => {
            const outcomes = map.get(log.mode) ?? new Map<string, number>();
            outcomes.set(log.outcome, (outcomes.get(log.outcome) ?? 0) + 1);
            map.set(log.mode, outcomes);
        });
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [logs]);

    const total = logs?.length ?? 0;
    const hasData = logs !== null && logs.length > 0;

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

                {error && <ErrorText>{error}</ErrorText>}

                <StatCardRow>
                    <StatCard>
                        <StatValue>{loading ? "…" : total}</StatValue>
                        <StatLabel>Зіграно партій за період</StatLabel>
                    </StatCard>
                </StatCardRow>
            </Section>

            {!loading && !hasData && !error && (
                <Section>
                    <EmptyState>Немає даних</EmptyState>
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
                                    </tr>
                                </thead>
                                <tbody>
                                    {byDay.map(([date, count]) => (
                                        <tr key={date}>
                                            <Td>{date}</Td>
                                            <Td>{count}</Td>
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
                                        <Th>Розбивка</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {byMode.map(([mode, outcomes]) => {
                                        const modeTotal = Array.from(outcomes.values()).reduce((a, b) => a + b, 0);
                                        const breakdown = Array.from(outcomes.entries())
                                            .map(([outcome, count]) => `${OUTCOME_LABEL[outcome] ?? outcome}: ${count}`)
                                            .join(", ");
                                        return (
                                            <tr key={mode}>
                                                <Td>{MODE_LABEL[mode] ?? mode}</Td>
                                                <Td>{modeTotal}</Td>
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
