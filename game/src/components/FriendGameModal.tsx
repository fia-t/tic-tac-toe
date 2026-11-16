"use client";
import { IconClose } from "@game/components/GameIcons";
import React, { useState } from "react";
import { Overlay } from "@game/components/gameStyles";
import {
    ModalCard,
    ModalCloseButton,
    ModalTitle,
    ModalSubtitle,
    ModeOptionGroup,
    ModeOption,
    ModeOptionIcon,
    ModeOptionHint,
    PillButton,
    ButtonRow,
    TextInput,
    ErrorText,
} from "@game/components/onlineStyles";
import { createRoom, onlineModifiers } from "@game/lib/onlineGame";
import styled, { css } from "styled-components";
import { ModButton, ModIcon, ModRow } from "@game/components/GameOptions";
import { Eyebrow } from "@game/components/pageStyles";
import { ALL_MODIFIERS, type Modifier } from "@game/lib/modifiers";


// Вибір модифікатора - як у "Швидкій грі" на головній: підпис, ряд іконок із тултіпами
// (під кнопками) і опис вибраного; місце під два рядки опису зарезервоване.
const ModPicker = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: -6px 0 6px;
`;

const ModEdgeRow = styled(ModRow)`
    padding: 2px 0 32px;
    margin-bottom: -32px;

    /* Телефон: усі сім іконок в один ряд без горизонтальної прокрутки - кнопки менші. */
    @media (max-width: 480px) {
        gap: 3px;

        && > button {
            --gb-c: 10px;
            width: min(40px, calc((100vw - 92px) / 7));
            height: min(40px, calc((100vw - 92px) / 7));
            min-height: 0;
        }
    }

    & > button:nth-child(-n + 2)::after {
        left: calc(-1 * var(--gb-c, 0px));
        transform: none;
    }

    & > button:nth-last-child(-n + 2)::after {
        left: auto;
        right: calc(-1 * var(--gb-c, 0px));
        transform: none;
    }
`;

// Низький екран (CrazyGames на ноутбуці, телефон горизонтально): вікно не вміщалось і "Приєднатися"
// ховалось під прокруткою. Компактний вигляд - лише в standalone-білдах (портал, CrazyGames);
// на сайті й у грі в новині (GAME_TARGET не задано) вікно не змінюється.
const COMPACT_ON_SHORT = Boolean(process.env.GAME_TARGET);
const SHORT = "@media (max-height: 640px)";

const Card = styled(ModalCard)`
    ${COMPACT_ON_SHORT &&
    css`
        ${SHORT} {
            padding: 14px 20px 16px;

            h2 {
                margin-bottom: 4px;
            }
            p {
                margin-bottom: 6px;
            }
            img {
                width: 60px;
                height: 60px;
            }
        }
    `}
`;

const CompactGroup = styled(ModeOptionGroup)`
    ${COMPACT_ON_SHORT &&
    css`
        ${SHORT} {
            margin-bottom: 12px;
        }
    `}
`;

const Actions = styled.div`
    ${COMPACT_ON_SHORT &&
    css`
        ${SHORT} {
            display: flex;
            gap: 10px;
            margin-top: 8px;

            & > button {
                flex: 1;
                width: auto;
                margin-top: 0;
            }
        }
    `}
`;

const ModInfo = styled.div`
    min-height: calc(2 * 1.35em);
    color: #7a5530;
    font-size: 14px;
    line-height: 1.35;

    strong {
        color: #49301f;
    }
`;
import { isFirebaseConfigured } from "@game/lib/firebase";
import { OnlineGameMode } from "@game/components/onlineGameLogic";
import { assetUrl } from "@game/lib/assets";
import { useT } from "@game/lib/i18n";

type FriendGameModalProps = {
    onClose: () => void;
    // Замість router.push всередині модалки (next/navigation) - викликається з готовим
    // roomId, а куди саме перейти/що показати, вирішує викликач. Так цей компонент
    // лишається portable для не-Next.js оточення (напр. standalone-білд для агрегаторів).
    onRoomReady: (roomId: string) => void;
    // Який режим підсвітити першим - відповідно до офлайн-режиму, з якого відкрили модалку.
    defaultMode?: OnlineGameMode;
    // "Маю код кімнати" на головній - одразу екран приєднання.
    initialView?: "select" | "join";
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

export const FriendGameModal: React.FC<FriendGameModalProps> = ({ onClose, onRoomReady, defaultMode, initialView = "select" }) => {
    const t = useT();
    const [mode, setMode] = useState<OnlineGameMode>(defaultMode ?? "3x3");
    const [view, setView] = useState<"select" | "join">(initialView);
    const [joinInput, setJoinInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Модифікатор партії - як на головному екрані; ті, що не пасують режиму, неактивні.
    const [modifier, setModifierChoice] = useState<Modifier | null>(null);
    const allowed = onlineModifiers(mode);
    const activeModifier = modifier && allowed.includes(modifier) ? modifier : null;
    const modTip = (m: Modifier | null) => (m ? t(`modifier_${m}`) : t("modifier_none"));

    const handleCreate = async () => {
        if (!isFirebaseConfigured) {
            setError(t("errorFirebaseShort"));
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const { roomId } = await createRoom(mode, activeModifier);
            onRoomReady(roomId);
        } catch (err) {
            console.error("createRoom failed:", err);
            setError(t("errorCreateRoom"));
            setLoading(false);
        }
    };

    const handleJoin = () => {
        const roomId = extractRoomId(joinInput);
        if (!roomId) {
            setError(t("errorJoinEmpty"));
            return;
        }
        onRoomReady(roomId);
    };

    return (
        <>
            <Overlay onClick={onClose} style={{ zIndex: 1600 }} />
            <Card onClick={(e) => e.stopPropagation()} style={{ zIndex: 1601 }}>
                <ModalCloseButton onClick={onClose} aria-label={t("close")}>
                    <IconClose size={16} />
                </ModalCloseButton>

                {view === "select" ? (
                    <>
                        <ModalTitle>{t("friendTitle")}</ModalTitle>
                        <ModalSubtitle>{t("chooseMode")}</ModalSubtitle>
                        <CompactGroup>
                            <ModeOption type="button" aria-pressed={mode === "3x3"} $active={mode === "3x3"} onClick={() => setMode("3x3")}>
                                <ModeOptionIcon src={assetUrl("images/traditional.png")} alt="3×3" />
                                <ModeOptionHint>3×3</ModeOptionHint>
                            </ModeOption>
                            <ModeOption type="button" aria-pressed={mode === "5x5"} $active={mode === "5x5"} onClick={() => setMode("5x5")}>
                                <ModeOptionIcon src={assetUrl("images/game-5x5.png")} alt="5×5" />
                                <ModeOptionHint>5×5</ModeOptionHint>
                            </ModeOption>
                            <ModeOption type="button" aria-pressed={mode === "9x9"} $active={mode === "9x9"} onClick={() => setMode("9x9")}>
                                <ModeOptionIcon src={assetUrl("images/difficult.png")} alt="9×9" />
                                <ModeOptionHint>9×9</ModeOptionHint>
                            </ModeOption>
                        </CompactGroup>

                        <ModPicker>
                            <Eyebrow id="friend-mod">{t("modifierLabel")}</Eyebrow>
                            <ModEdgeRow role="group" aria-labelledby="friend-mod">
                                {([null, ...ALL_MODIFIERS] as (Modifier | null)[]).map((m) => (
                                    <ModButton
                                        key={m ?? "none"}
                                        type="button"
                                        aria-pressed={activeModifier === m}
                                        aria-label={modTip(m)}
                                        data-tip={modTip(m)}
                                        disabled={m !== null && !allowed.includes(m)}
                                        onClick={() => setModifierChoice(m)}
                                    >
                                        <ModIcon id={m} />
                                    </ModButton>
                                ))}
                            </ModEdgeRow>
                            <ModInfo>
                                <strong>{modTip(activeModifier)}</strong> ·{" "}
                                {activeModifier ? t(`modifierDesc_${activeModifier}`) : t("modifierNoneDesc")}
                            </ModInfo>
                        </ModPicker>

                        <Actions>
                            <PillButton type="button" onClick={handleCreate} disabled={loading}>
                                {loading ? t("creating") : t("createGame")}
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
                                {t("join")}
                            </PillButton>
                        </Actions>

                        {error && <ErrorText>{error}</ErrorText>}
                    </>
                ) : (
                    <>
                        <ModalTitle>{t("joinTitle")}</ModalTitle>
                        <ModalSubtitle>{t("joinHint")}</ModalSubtitle>
                        <TextInput
                            value={joinInput}
                            onChange={(e) => setJoinInput(e.target.value)}
                            placeholder={t("joinPlaceholder")}
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
                                {t("back")}
                            </PillButton>
                            <PillButton type="button" onClick={handleJoin}>
                                {t("join")}
                            </PillButton>
                        </ButtonRow>
                    </>
                )}
            </Card>
        </>
    );
};
