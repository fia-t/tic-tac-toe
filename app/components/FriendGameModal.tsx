"use client";
import React, { useState } from "react";
import { Overlay } from "@/app/components/gameStyles";
import {
    ModalCard,
    ModalCloseButton,
    ModalTitle,
    ModalSubtitle,
    ModeOptionGroup,
    ModeOption,
    ModeOptionHint,
    PillButton,
    ButtonRow,
    TextInput,
    ErrorText,
} from "@/app/components/onlineStyles";
import { createRoom } from "@/app/lib/onlineGame";
import { isFirebaseConfigured } from "@/app/lib/firebase";
import { OnlineGameMode } from "@/app/components/onlineGameLogic";

type FriendGameModalProps = {
    onClose: () => void;
    // Замість router.push всередині модалки (next/navigation) - викликається з готовим
    // roomId, а куди саме перейти/що показати, вирішує викликач. Так цей компонент
    // лишається portable для не-Next.js оточення (напр. standalone-білд для агрегаторів).
    onRoomReady: (roomId: string) => void;
    // Який режим підсвітити першим - відповідно до офлайн-режиму, з якого відкрили модалку.
    defaultMode?: OnlineGameMode;
};

// Приймає або "сирий" код кімнати, або повне посилання-запрошення
// (?room=CODE чи /play/CODE) і повертає лише код.
const extractRoomId = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return "";

    try {
        const url = new URL(trimmed);
        const fromQuery = url.searchParams.get("room");
        if (fromQuery) return fromQuery.trim().toUpperCase();

        const segments = url.pathname.split("/").filter(Boolean);
        if (segments.length > 0) return segments[segments.length - 1].toUpperCase();
    } catch {
        // Не URL - трактуємо весь ввід як код кімнати.
    }

    return trimmed.toUpperCase();
};

export const FriendGameModal: React.FC<FriendGameModalProps> = ({ onClose, onRoomReady, defaultMode }) => {
    const [mode, setMode] = useState<OnlineGameMode>(defaultMode ?? "3x3");
    const [view, setView] = useState<"select" | "join">("select");
    const [joinInput, setJoinInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!isFirebaseConfigured) {
            setError("Firebase не налаштовано. Заповніть .env.local (див. .env.local.example) і перезапустіть сервер.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const { roomId } = await createRoom(mode);
            onRoomReady(roomId);
        } catch (err) {
            console.error("createRoom failed:", err);
            setError("Не вдалося створити кімнату. Спробуйте ще раз.");
            setLoading(false);
        }
    };

    const handleJoin = () => {
        const roomId = extractRoomId(joinInput);
        if (!roomId) {
            setError("Вставте посилання-запрошення або код кімнати.");
            return;
        }
        onRoomReady(roomId);
    };

    return (
        <>
            <Overlay onClick={onClose} />
            <ModalCard onClick={(e) => e.stopPropagation()}>
                <ModalCloseButton onClick={onClose} aria-label="Закрити">
                    ×
                </ModalCloseButton>

                {view === "select" ? (
                    <>
                        <ModalTitle>🎮 Гра з другом</ModalTitle>
                        <ModalSubtitle>Оберіть режим гри</ModalSubtitle>
                        <ModeOptionGroup>
                            <ModeOption type="button" $active={mode === "3x3"} onClick={() => setMode("3x3")}>
                                Звичайна гра
                                <ModeOptionHint>3×3</ModeOptionHint>
                            </ModeOption>
                            <ModeOption type="button" $active={mode === "9x9"} onClick={() => setMode("9x9")}>
                                Розширена гра
                                <ModeOptionHint>9×9</ModeOptionHint>
                            </ModeOption>
                            <ModeOption type="button" $active={mode === "5x5"} onClick={() => setMode("5x5")}>
                                Велике поле
                                <ModeOptionHint>5×5</ModeOptionHint>
                            </ModeOption>
                        </ModeOptionGroup>

                        <PillButton type="button" onClick={handleCreate} disabled={loading}>
                            {loading ? "Створюємо..." : "Створити гру"}
                        </PillButton>
                        <PillButton
                            type="button"
                            $variant="ghost"
                            disabled={loading}
                            onClick={() => {
                                setError(null);
                                setView("join");
                            }}
                        >
                            Приєднатися
                        </PillButton>

                        {error && <ErrorText>{error}</ErrorText>}
                    </>
                ) : (
                    <>
                        <ModalTitle>Приєднатися до гри</ModalTitle>
                        <ModalSubtitle>Вставте посилання-запрошення або код кімнати</ModalSubtitle>
                        <TextInput
                            value={joinInput}
                            onChange={(e) => setJoinInput(e.target.value)}
                            placeholder="https://.../play/ABC123 або ABC123"
                            autoFocus
                        />
                        {error && <ErrorText>{error}</ErrorText>}
                        <ButtonRow>
                            <PillButton
                                type="button"
                                $variant="ghost"
                                onClick={() => {
                                    setError(null);
                                    setView("select");
                                }}
                            >
                                Назад
                            </PillButton>
                            <PillButton type="button" onClick={handleJoin}>
                                Приєднатися
                            </PillButton>
                        </ButtonRow>
                    </>
                )}
            </ModalCard>
        </>
    );
};
