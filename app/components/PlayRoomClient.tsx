"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/app/components/gameStyles";
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
} from "@/app/components/onlineStyles";
import { OnlineBoard } from "@/app/components/OnlineBoard";
import { isFirebaseConfigured } from "@/app/lib/firebase";
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
} from "@/app/lib/onlineGame";

type PlayRoomClientProps = {
    roomId: string;
};

const HEARTBEAT_INTERVAL_MS = 8000;

type ConnectionState = "connecting" | "ready" | "not-found" | "full" | "error";

export const PlayRoomClient: React.FC<PlayRoomClientProps> = ({ roomId }) => {
    const router = useRouter();
    const [connection, setConnection] = useState<ConnectionState>(
        isFirebaseConfigured ? "connecting" : "error"
    );
    const [uid, setUid] = useState<string | null>(null);
    const [mySymbol, setMySymbol] = useState<PlayerSymbol | null>(null);
    const [room, setRoom] = useState<RoomDoc | null>(null);
    const [copied, setCopied] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const [leftBannerDismissed, setLeftBannerDismissed] = useState(false);

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
        Boolean(opponent) &&
        (opponentExplicitlyLeft || opponentStale) &&
        !leftBannerDismissed;

    useEffect(() => {
        if (!showOpponentLeft) setLeftBannerDismissed(false);
    }, [showOpponentLeft]);

    const inviteLink =
        typeof window !== "undefined" ? `${window.location.origin}/play/${roomId}` : `/play/${roomId}`;

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
        router.push("/");
    };

    if (!isFirebaseConfigured) {
        return (
            <Container>
                <ModalCard style={{ position: "static", transform: "none" }}>
                    <ModalTitle>Firebase не налаштовано</ModalTitle>
                    <ModalSubtitle>
                        Заповніть NEXT_PUBLIC_FIREBASE_* змінні у .env.local (див. .env.local.example) і перезапустіть
                        сервер, щоб онлайн-режим запрацював.
                    </ModalSubtitle>
                    <PillButton type="button" onClick={() => router.push("/")}>
                        Повернутися в меню
                    </PillButton>
                </ModalCard>
            </Container>
        );
    }

    if (connection === "connecting") {
        return (
            <Container>
                <ModalCard style={{ position: "static", transform: "none" }}>
                    <ModalTitle>Підключення...</ModalTitle>
                    <WaitingText>Заходимо в кімнату {roomId}</WaitingText>
                </ModalCard>
            </Container>
        );
    }

    if (connection === "not-found") {
        return (
            <Container>
                <ModalCard style={{ position: "static", transform: "none" }}>
                    <ModalTitle>Кімнату не знайдено</ModalTitle>
                    <ModalSubtitle>Можливо, посилання застаріло або гра вже завершилась і кімнату очищено.</ModalSubtitle>
                    <PillButton type="button" onClick={() => router.push("/")}>
                        Повернутися в меню
                    </PillButton>
                </ModalCard>
            </Container>
        );
    }

    if (connection === "full") {
        return (
            <Container>
                <ModalCard style={{ position: "static", transform: "none" }}>
                    <ModalTitle>Кімната вже заповнена</ModalTitle>
                    <ModalSubtitle>У цій грі вже двоє гравців.</ModalSubtitle>
                    <PillButton type="button" onClick={() => router.push("/")}>
                        Повернутися в меню
                    </PillButton>
                </ModalCard>
            </Container>
        );
    }

    if (connection === "error" || !room || !mySymbol || !uid) {
        return (
            <Container>
                <ModalCard style={{ position: "static", transform: "none" }}>
                    <ModalTitle>Щось пішло не так</ModalTitle>
                    <ErrorText>Не вдалося підключитися до кімнати. Перевірте зʼєднання й спробуйте ще раз.</ErrorText>
                    <PillButton type="button" onClick={() => router.push("/")}>
                        Повернутися в меню
                    </PillButton>
                </ModalCard>
            </Container>
        );
    }

    if (room.status === "waiting") {
        return (
            <Container>
                <ModalCard style={{ position: "static", transform: "none" }}>
                    <RoomCodeBadge>{roomId}</RoomCodeBadge>
                    <ModalTitle>Ваше запрошення</ModalTitle>
                    <InviteLinkRow>
                        <InviteLinkBox>{inviteLink}</InviteLinkBox>
                        <CopyIconButton type="button" onClick={handleCopy}>
                            📋 Копіювати
                        </CopyIconButton>
                    </InviteLinkRow>
                    {copied && <CopyFeedback>✓ Посилання скопійовано</CopyFeedback>}
                    <WaitingText>Очікування другого гравця...</WaitingText>
                    <PillButton type="button" $variant="ghost" onClick={handleReturnToMenu}>
                        Повернутися в меню
                    </PillButton>
                </ModalCard>
            </Container>
        );
    }

    return (
        <Container>
            <OnlineBoard roomId={roomId} room={room} mySymbol={mySymbol} uid={uid} />

            {showOpponentLeft && (
                <OpponentLeftCard>
                    <ModalTitle style={{ paddingRight: 0 }}>Суперник покинув гру</ModalTitle>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <PillButton type="button" onClick={handleReturnToMenu}>
                            Повернутися в меню
                        </PillButton>
                        <PillButton type="button" $variant="ghost" onClick={() => setLeftBannerDismissed(true)}>
                            Чекати повернення
                        </PillButton>
                    </div>
                </OpponentLeftCard>
            )}
        </Container>
    );
};
