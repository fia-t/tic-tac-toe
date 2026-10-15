"use client";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Container } from "@game/components/gameStyles";
import { AppColumn, ShellVars } from "@game/components/pageStyles";
import { RoomTopBar } from "@game/components/TopBar";
import {
    ModalCard,
    ModalTitle,
    ModalSubtitle,
    InviteLinkRow,
    InviteLinkBox,
    CopyIconButton,
    CopyFeedback,
    WaitingText,
    ErrorText,
    PillButton,
    RoomCodeBadge,
    OpponentLeftCard,
} from "@game/components/onlineStyles";
import { OnlineBoard } from "@game/components/OnlineBoard";
import { isFirebaseConfigured } from "@game/lib/firebase";
import {
    ensureAnonymousUser,
    joinRoom,
    subscribeRoom,
    sendHeartbeat,
    leaveRoom,
    RoomDoc,
    PlayerSymbol,
    RoomNotFoundError,
    RoomFullError,
    PRESENCE_TIMEOUT_MS,
} from "@game/lib/onlineGame";
import { useT } from "@game/lib/i18n";

// Екран кімнати - у тій самій колонці гри до 760px, що й меню: шапка з логотипом ("На головну" -
// вихід із кімнати) і шестернею, під нею - картка запрошення / стан підключення / поле.
const RoomBody = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding-bottom: 24px;
`;

const RoomShell: React.FC<{ onHome: () => void; children: React.ReactNode }> = ({ onHome, children }) => (
    <Container>
        <ShellVars />
        <AppColumn>
            <RoomTopBar onHome={onHome} />
            <RoomBody>{children}</RoomBody>
        </AppColumn>
    </Container>
);

type PlayRoomClientProps = {
    roomId: string;
    // Заміна router.push("/") (next/navigation) - викликач вирішує, що значить "вийти з
    // кімнати" (перехід на "/" на сайті, скидання локального стану в standalone-білді).
    onExit: () => void;
    // Канонічний origin для invite-лінку (напр. NEXT_PUBLIC_SITE_URL/siteConfig.url на
    // сайті). Без нього лінк будувався б з window.location.origin, а це всередині
    // portal-iframe (play-dev.quartsoft.com) повертає origin вбудованого документа
    // (сирий *.vercel.app), а не домен, з якого гру справді відкрив користувач.
    // Не передано - викликач не потребує кастомного домену (напр. standalone-білд).
    siteUrl?: string;
    // Альтернативне джерело invite-лінку (напр. game.inviteLink() SDK порталу, що веде на
    // сторінку гри на порталі). null/помилка - фолбек на `${siteUrl}/play/${roomId}`.
    createInviteLink?: (roomId: string) => Promise<string | null>;
    // Зміна статусу кімнати (waiting/playing/finished) - для gameplayStart/Stop у SDK.
    onStatusChange?: (status: RoomDoc["status"]) => void;
};

const HEARTBEAT_INTERVAL_MS = 8000;

type ConnectionState = "connecting" | "ready" | "not-found" | "full" | "error";

export const PlayRoomClient: React.FC<PlayRoomClientProps> = ({
    roomId,
    onExit,
    siteUrl,
    createInviteLink,
    onStatusChange,
}) => {
    const t = useT();
    const [connection, setConnection] = useState<ConnectionState>(
        isFirebaseConfigured ? "connecting" : "error"
    );
    const [uid, setUid] = useState<string | null>(null);
    const [mySymbol, setMySymbol] = useState<PlayerSymbol | null>(null);
    const [room, setRoom] = useState<RoomDoc | null>(null);
    const [copied, setCopied] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const [leftBannerDismissed, setLeftBannerDismissed] = useState(false);
    const [customInviteLink, setCustomInviteLink] = useState<string | null>(null);

    useEffect(() => {
        if (!createInviteLink) return;
        let cancelled = false;
        createInviteLink(roomId)
            .then((link) => {
                if (!cancelled) setCustomInviteLink(link);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [roomId, createInviteLink]);

    const roomStatus = room?.status;
    useEffect(() => {
        if (roomStatus) onStatusChange?.(roomStatus);
    }, [roomStatus, onStatusChange]);

    // Приєднання до кімнати (або підтвердження власної участі, якщо це творець) + підписка на живі оновлення.
    useEffect(() => {
        if (!isFirebaseConfigured) return;
        let unsubscribe: (() => void) | null = null;
        let cancelled = false;

        (async () => {
            try {
                const myUid = await ensureAnonymousUser();
                const { symbol } = await joinRoom(roomId);
                if (cancelled) return;

                setUid(myUid);
                setMySymbol(symbol);
                setConnection("ready");

                unsubscribe = subscribeRoom(roomId, (data) => {
                    if (!data) {
                        setRoom(null);
                        return;
                    }
                    setRoom(data);
                });
            } catch (err) {
                if (cancelled) return;
                if (err instanceof RoomNotFoundError) setConnection("not-found");
                else if (err instanceof RoomFullError) setConnection("full");
                else setConnection("error");
            }
        })();

        return () => {
            cancelled = true;
            unsubscribe?.();
        };
    }, [roomId]);

    // Heartbeat - періодично освіжає lastSeen, щоб суперник міг помітити відключення.
    useEffect(() => {
        if (!mySymbol) return;
        const interval = setInterval(() => {
            void sendHeartbeat(roomId, mySymbol);
        }, HEARTBEAT_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [roomId, mySymbol]);

    // Найкраще зусилля: явно позначити вихід при закритті вкладки/переході на іншу сторінку.
    useEffect(() => {
        if (!mySymbol) return;
        const handleUnload = () => {
            void leaveRoom(roomId, mySymbol);
        };
        window.addEventListener("pagehide", handleUnload);
        return () => window.removeEventListener("pagehide", handleUnload);
    }, [roomId, mySymbol]);

    // Годинник для перерахунку "чи давно мовчить суперник" (heartbeat-таймаут).
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 3000);
        return () => clearInterval(interval);
    }, []);

    const opponentSymbol: PlayerSymbol | null = mySymbol === "X" ? "O" : mySymbol === "O" ? "X" : null;
    const opponent = room && opponentSymbol ? room.players[opponentSymbol] : null;
    const opponentLastSeenMs = opponent?.lastSeen?.toMillis?.() ?? null;
    const opponentStale = opponentLastSeenMs !== null && now - opponentLastSeenMs > PRESENCE_TIMEOUT_MS;
    const opponentExplicitlyLeft = Boolean(room && opponentSymbol && room.leftPlayer === opponentSymbol);
    const showOpponentLeft =
        Boolean(room) &&
        room?.status !== "waiting" &&
        // Рейтингова партія: замість цього вікна - відлік часу на хід і технічна перемога.
        !room?.rated &&
        Boolean(opponent) &&
        (opponentExplicitlyLeft || opponentStale) &&
        !leftBannerDismissed;

    useEffect(() => {
        if (!showOpponentLeft) setLeftBannerDismissed(false);
    }, [showOpponentLeft]);

    const origin = siteUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
    const inviteLink = customInviteLink ?? `${origin}/play/${roomId}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Буфер обміну недоступний (напр. немає HTTPS) - посилання й так видно в полі.
        }
    };

    const handleReturnToMenu = () => {
        if (mySymbol) void leaveRoom(roomId, mySymbol);
        onExit();
    };

    if (!isFirebaseConfigured) {
        return (
            <RoomShell onHome={handleReturnToMenu}>
                <ModalCard style={{ position: "static", transform: "none" }}>
                    <ModalTitle>{t("firebaseTitle")}</ModalTitle>
                    <ModalSubtitle>
                        {t("firebaseBody")}
                    </ModalSubtitle>
                    <PillButton type="button" onClick={onExit}>
                        {t("backToMenu")}
                    </PillButton>
                </ModalCard>
            </RoomShell>
        );
    }

    if (connection === "connecting") {
        return (
            <RoomShell onHome={handleReturnToMenu}>
                <ModalCard style={{ position: "static", transform: "none" }}>
                    <ModalTitle>{t("connecting")}</ModalTitle>
                    <WaitingText>{t("joiningRoom", { room: roomId })}</WaitingText>
                </ModalCard>
            </RoomShell>
        );
    }

    if (connection === "not-found") {
        return (
            <RoomShell onHome={handleReturnToMenu}>
                <ModalCard style={{ position: "static", transform: "none" }}>
                    <ModalTitle>{t("roomNotFound")}</ModalTitle>
                    <ModalSubtitle>{t("roomNotFoundBody")}</ModalSubtitle>
                    <PillButton type="button" onClick={onExit}>
                        {t("backToMenu")}
                    </PillButton>
                </ModalCard>
            </RoomShell>
        );
    }

    if (connection === "full") {
        return (
            <RoomShell onHome={handleReturnToMenu}>
                <ModalCard style={{ position: "static", transform: "none" }}>
                    <ModalTitle>{t("roomFull")}</ModalTitle>
                    <ModalSubtitle>{t("roomFullBody")}</ModalSubtitle>
                    <PillButton type="button" onClick={onExit}>
                        {t("backToMenu")}
                    </PillButton>
                </ModalCard>
            </RoomShell>
        );
    }

    if (connection === "error" || !room || !mySymbol || !uid) {
        return (
            <RoomShell onHome={handleReturnToMenu}>
                <ModalCard style={{ position: "static", transform: "none" }}>
                    <ModalTitle>{t("errorTitle")}</ModalTitle>
                    <ErrorText>{t("errorBody")}</ErrorText>
                    <PillButton type="button" onClick={onExit}>
                        {t("backToMenu")}
                    </PillButton>
                </ModalCard>
            </RoomShell>
        );
    }

    if (room.status === "waiting") {
        return (
            <RoomShell onHome={handleReturnToMenu}>
                <ModalCard style={{ position: "static", transform: "none" }}>
                    <RoomCodeBadge>{roomId}</RoomCodeBadge>
                    <ModalTitle>{t("inviteTitle")}</ModalTitle>
                    <InviteLinkRow>
                        <InviteLinkBox>{inviteLink}</InviteLinkBox>
                        <CopyIconButton type="button" onClick={handleCopy}>
                            {t("copy")}
                        </CopyIconButton>
                    </InviteLinkRow>
                    {copied && <CopyFeedback>{t("copied")}</CopyFeedback>}
                    <WaitingText>{t("waitingPlayer")}</WaitingText>
                    <PillButton type="button" $variant="ghost" onClick={handleReturnToMenu}>
                        {t("backToMenu")}
                    </PillButton>
                </ModalCard>
            </RoomShell>
        );
    }

    return (
        <RoomShell onHome={handleReturnToMenu}>
            <OnlineBoard roomId={roomId} room={room} mySymbol={mySymbol} uid={uid} onExit={handleReturnToMenu} />

            {showOpponentLeft && (
                <OpponentLeftCard>
                    <ModalTitle style={{ paddingRight: 0 }}>{t("opponentLeft")}</ModalTitle>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <PillButton type="button" onClick={handleReturnToMenu}>
                            {t("backToMenu")}
                        </PillButton>
                        <PillButton type="button" $variant="ghost" onClick={() => setLeftBannerDismissed(true)}>
                            {t("waitReturn")}
                        </PillButton>
                    </div>
                </OpponentLeftCard>
            )}
        </RoomShell>
    );
};
