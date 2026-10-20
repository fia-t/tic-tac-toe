"use client";
import { IconClose } from "@game/components/GameIcons";
import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Overlay } from "@game/components/gameStyles";
import { ModalCard, ModalCloseButton, ModalTitle, ModalSubtitle, PillButton } from "@game/components/onlineStyles";
import { MatchUnavailableError, cancelQueue, joinQueue, useMyRating, watchQueue } from "@game/lib/matchmaking";
import { displayLeague } from "@game/lib/rating";
import { setPresence } from "@game/lib/presence";
import { getProfile, setProfileName } from "@game/lib/profile";
import { trackEvent } from "@game/lib/firebase";
import { closePanel } from "@game/lib/ui";
import { useT } from "@game/lib/i18n";

// Вікно швидкого матчу: черга на сервері, оновлення "я ще тут" раз на 10 с, миттєве
// повідомлення про знайденого суперника через свій запис у matchQueue. Без суперника за
// 20 с - чесна пропозиція зіграти з ботом без рейтингу.

const HEARTBEAT_MS = 10_000;
const OFFER_BOT_AFTER_S = 20;

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

const Spinner = styled.div`
    width: 52px;
    height: 52px;
    margin: 8px auto;
    border-radius: 50%;
    border: 6px solid #f1c88c;
    border-top-color: #0f6f8c;
    animation: ${spin} 0.9s linear infinite;

    @media (prefers-reduced-motion: reduce) {
        animation-duration: 3s;
    }
`;

const Muted = styled.p`
    margin: 0 0 8px;
    color: #6b4a25;
    font-size: 14px;
    line-height: 1.4;
    text-align: center;
`;

type Phase = "searching" | "timeout" | "unavailable";

type QuickMatchProps = {
    fallbackName: string | null;
    onMatched: (roomId: string) => void;
    onPlayBot: () => void;
};

export const QuickMatch: React.FC<QuickMatchProps> = ({ fallbackName, onMatched, onPlayBot }) => {
    const t = useT();
    const { rating, played } = useMyRating();
    const [phase, setPhase] = useState<Phase>("searching");
    const [elapsed, setElapsed] = useState(0);
    const [searchId, setSearchId] = useState(0);
    const doneRef = useRef(false);

    useEffect(() => {
        doneRef.current = false;
        let unsubscribe: (() => void) | null = null;
        let heartbeat: ReturnType<typeof setInterval> | null = null;
        const startedAt = Date.now();
        const clock = setInterval(() => {
            const seconds = Math.floor((Date.now() - startedAt) / 1000);
            setElapsed(seconds);
            if (seconds >= OFFER_BOT_AFTER_S) setPhase((p) => (p === "searching" ? "timeout" : p));
        }, 500);

        const matched = (roomId: string) => {
            if (doneRef.current) return;
            doneRef.current = true;
            trackEvent("quick_match_found", { waited: Math.round((Date.now() - startedAt) / 1000) });
            // Свій запис у черзі більше не потрібен - наступний пошук почнеться з нуля.
            void cancelQueue();
            closePanel();
            onMatched(roomId);
        };

        const name = getProfile().name ?? fallbackName ?? "Player";
        // Ім'я в лідерборді має бути сталим - фіксуємо його в профілі при першому матчі.
        if (!getProfile().name && fallbackName) setProfileName(fallbackName);

        const ping = async () => {
            try {
                const res = await joinQueue(name);
                if (res.status === "matched" && res.roomId) matched(res.roomId);
            } catch (error) {
                if (error instanceof MatchUnavailableError && !doneRef.current) setPhase("unavailable");
            }
        };

        void (async () => {
            trackEvent("quick_match_search", {});
            await ping();
            if (doneRef.current) return;
            unsubscribe = await watchQueue(matched).catch(() => null);
            heartbeat = setInterval(() => void ping(), HEARTBEAT_MS);
        })();

        return () => {
            clearInterval(clock);
            if (heartbeat) clearInterval(heartbeat);
            unsubscribe?.();
            if (!doneRef.current) void cancelQueue();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- новий пошук лише за "Шукати далі"
    }, [searchId]);

    // Поки гравець у черзі - інші гравці в меню бачать запрошення "шукає суперника" (presence.ts).
    useEffect(() => {
        setPresence({ searching: phase !== "unavailable" });
        return () => setPresence({ searching: false });
    }, [phase]);

    const mm = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;
    const close = () => closePanel();

    return (
        <>
            <Overlay onClick={close} style={{ zIndex: 1600 }} />
            <ModalCard role="dialog" aria-modal="true" aria-labelledby="match-title" onClick={(e) => e.stopPropagation()} style={{ zIndex: 1601 }}>
                <ModalCloseButton onClick={close} aria-label={t("close")}>
                    <IconClose size={16} />
                </ModalCloseButton>
                <ModalTitle id="match-title">{t("matchTitle")}</ModalTitle>
                <ModalSubtitle>
                    {t("matchRatingLine", { rating: String(rating), league: played ? t(`league_${displayLeague(rating, played)}`) : t("leagueNone") })}
                </ModalSubtitle>

                {phase === "unavailable" ? (
                    <Muted>{t("matchUnavailable")}</Muted>
                ) : (
                    <>
                        <Spinner aria-hidden="true" />
                        <Muted aria-live="polite">{t("matchSearching", { t: mm })}</Muted>
                        <Muted>{phase === "timeout" ? t("matchTimeout") : t("matchHint")}</Muted>
                    </>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {phase === "timeout" && (
                        <PillButton
                            type="button"
                            onClick={() => {
                                setPhase("searching");
                                setElapsed(0);
                                setSearchId((id) => id + 1);
                            }}
                        >
                            {t("matchKeepSearching")}
                        </PillButton>
                    )}
                    {phase !== "searching" && (
                        <PillButton
                            type="button"
                            $variant={phase === "timeout" ? "ghost" : undefined}
                            onClick={() => {
                                trackEvent("quick_match_bot", { phase });
                                closePanel();
                                onPlayBot();
                            }}
                        >
                            {t("matchBot")}
                        </PillButton>
                    )}
                    <PillButton type="button" $variant="ghost" onClick={close}>
                        {t("matchCancel")}
                    </PillButton>
                </div>
            </ModalCard>
        </>
    );
};
