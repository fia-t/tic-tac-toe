"use client";
import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { ErrorText } from "@game/components/onlineStyles";
import { GameBuild, GameBuildStatus, requestGameBuild, subscribeToGameBuilds } from "@/app/lib/gameBuilds";
import { Section, SectionTitle, EmptyState, TableWrap, Table, Th, Td } from "@/app/admin/adminStyles";

const STATUS_LABEL: Record<GameBuildStatus, string> = {
    queued: "У черзі",
    building: "Збирається",
    success: "Готово",
    failed: "Помилка",
};

const formatDate = (ts?: Timestamp | null): string => (ts ? ts.toDate().toLocaleString("uk-UA") : "—");

const formatSize = (bytes?: number): string => (bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : "");

const shortCommit = (commit?: string): string => (commit ? commit.slice(0, 7) : "—");

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    flex-wrap: wrap;
`;

const Description = styled.p`
    margin: 0;
    max-width: 560px;
    line-height: 1.5;
    opacity: 0.85;
`;

const BuildButton = styled.button`
    padding: 12px 22px;
    border: none;
    border-radius: 12px;
    background: #8b4513;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;

    &:disabled {
        opacity: 0.55;
        cursor: default;
    }
`;

const InfoRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 24px;
    margin-top: 18px;
`;

const Muted = styled.span`
    opacity: 0.7;
`;

const ActionLink = styled.a`
    color: #8b4513;
    font-weight: 700;
    text-decoration: none;

    &:hover {
        text-decoration: underline;
    }
`;

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

const Spinner = styled.span`
    display: inline-block;
    width: 14px;
    height: 14px;
    margin-right: 8px;
    vertical-align: -2px;
    border: 2px solid rgba(139, 69, 19, 0.25);
    border-top-color: #8b4513;
    border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
`;

const StatusBadge = styled.span<{ $status: GameBuildStatus }>`
    font-weight: 700;
    color: ${({ $status }) =>
        $status === "success" ? "#2e7d32" : $status === "failed" ? "#c62828" : "#8b4513"};
`;

// Аналог панелі "Game build": гравці отримують гру такою, якою її зібрано.
// Кнопка запускає GitHub Actions (app/api/admin/game-build), статус оновлюється
// наживо через onSnapshot - сторінку перезавантажувати не треба.
export const GameBuildSection: React.FC<{ user: User }> = ({ user }) => {
    const [builds, setBuilds] = useState<GameBuild[] | null>(null);
    const [requesting, setRequesting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(
        () =>
            subscribeToGameBuilds(setBuilds, (err) => {
                console.error(err);
                setError("Не вдалося завантажити історію білдів.");
            }),
        []
    );

    const latest = builds?.[0];
    const lastSuccess = builds?.find((b) => b.status === "success");
    const inProgress = latest && (latest.status === "queued" || latest.status === "building") ? latest : null;

    const handleBuild = async () => {
        setError(null);
        setRequesting(true);
        try {
            await requestGameBuild(user);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не вдалося запустити збірку.");
        } finally {
            setRequesting(false);
        }
    };

    return (
        <>
            <Section>
                <Header>
                    <div>
                        <SectionTitle>Білд гри</SectionTitle>
                        <Description>
                            Гравці отримують гру такою, якою її зібрано. Після змін у коді гри (запушених у main)
                            зберіть гру знову: оновиться версія за посиланням «Відкрити гру», і буде готовий новий
                            ZIP для завантаження на портал.
                        </Description>
                    </div>
                    <BuildButton type="button" onClick={handleBuild} disabled={requesting || Boolean(inProgress)}>
                        {inProgress || requesting ? "Збирається…" : "Зібрати гру"}
                    </BuildButton>
                </Header>

                {inProgress && (
                    <InfoRow>
                        <span>
                            <Spinner />
                            {STATUS_LABEL[inProgress.status]} · запит {formatDate(inProgress.requestedAt)}
                        </span>
                        {inProgress.runUrl && (
                            <ActionLink href={inProgress.runUrl} target="_blank" rel="noreferrer">
                                Лог збірки ↗
                            </ActionLink>
                        )}
                    </InfoRow>
                )}

                {latest?.status === "failed" && (
                    <InfoRow>
                        <ErrorText style={{ margin: 0 }}>Остання збірка не вдалася: {latest.error ?? "невідома помилка"}</ErrorText>
                        {latest.runUrl && (
                            <ActionLink href={latest.runUrl} target="_blank" rel="noreferrer">
                                Лог збірки ↗
                            </ActionLink>
                        )}
                    </InfoRow>
                )}

                {lastSuccess ? (
                    <InfoRow>
                        <span>
                            Зібрано <b>{formatDate(lastSuccess.finishedAt)}</b>{" "}
                            <Muted>· код {shortCommit(lastSuccess.commit)}</Muted>
                        </span>
                        <Muted>
                            {lastSuccess.target ?? "portal"} · {lastSuccess.fileCount ?? "?"} файлів
                        </Muted>
                        {lastSuccess.zipUrl && (
                            <ActionLink href={lastSuccess.zipUrl}>
                                Завантажити ZIP для порталу ({formatSize(lastSuccess.zipSizeBytes)})
                            </ActionLink>
                        )}
                        <ActionLink href="/game/index.html" target="_blank" rel="noreferrer">
                            Відкрити гру ↗
                        </ActionLink>
                    </InfoRow>
                ) : (
                    builds !== null && !inProgress && <InfoRow><Muted>Гру ще жодного разу не зібрано.</Muted></InfoRow>
                )}

                {error && <ErrorText>{error}</ErrorText>}
            </Section>

            <Section>
                <SectionTitle>Історія білдів</SectionTitle>
                {builds === null ? (
                    <EmptyState>Завантаження…</EmptyState>
                ) : builds.length === 0 ? (
                    <EmptyState>Немає даних</EmptyState>
                ) : (
                    <TableWrap>
                        <Table>
                            <thead>
                                <tr>
                                    <Th>Запит</Th>
                                    <Th>Статус</Th>
                                    <Th>Код</Th>
                                    <Th>Розмір</Th>
                                    <Th>Хто</Th>
                                    <Th />
                                </tr>
                            </thead>
                            <tbody>
                                {builds.map((b) => (
                                    <tr key={b.id}>
                                        <Td>{formatDate(b.requestedAt)}</Td>
                                        <Td>
                                            <StatusBadge $status={b.status}>{STATUS_LABEL[b.status]}</StatusBadge>
                                        </Td>
                                        <Td>{shortCommit(b.commit)}</Td>
                                        <Td>{formatSize(b.zipSizeBytes) || "—"}</Td>
                                        <Td>{b.requestedBy ?? "—"}</Td>
                                        <Td>
                                            {b.zipUrl ? (
                                                <ActionLink href={b.zipUrl}>ZIP</ActionLink>
                                            ) : b.runUrl ? (
                                                <ActionLink href={b.runUrl} target="_blank" rel="noreferrer">
                                                    Лог ↗
                                                </ActionLink>
                                            ) : null}
                                        </Td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </TableWrap>
                )}
            </Section>
        </>
    );
};
