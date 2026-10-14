"use client";
import React from "react";
import styled from "styled-components";
import { GameButton, gameButtonCss } from "@game/components/GameButton";
import { IconClose, IconSettings } from "@game/components/GameIcons";
import { Overlay } from "@game/components/gameStyles";
import { ModalCard, ModalCloseButton, ModalTitle, PillButton } from "@game/components/onlineStyles";
import { setMuted, useMuted } from "@game/lib/sound";
import { chooseLocale, useLocale, useT, type Locale } from "@game/lib/i18n";
import { closePanel, openPanel, useOpenPanel } from "@game/lib/ui";

// Кнопка-шестерня в правому верхньому куті (на місці колишнього перемикача звуку) і вікно
// налаштувань: звук і мова. Над полем, але під BlockingOverlay порталу (z-index 2000).
const GearButton = styled.button`
    ${gameButtonCss("sm", { square: true })}
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 1500;
`;

const Row = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px dashed rgba(139, 101, 60, 0.25);

    &:last-of-type {
        border-bottom: none;
    }
`;

const RowLabel = styled.span`
    font-size: 16px;
    font-weight: 800;
    color: #49301f;
`;

const Choices = styled.div`
    display: flex;
    gap: 6px;
`;

const LANGUAGES: { id: Locale; label: string }[] = [
    { id: "uk", label: "Українська" },
    { id: "en", label: "English" },
];

export const SettingsButton: React.FC = () => {
    const t = useT();
    const open = useOpenPanel() === "settings";
    const muted = useMuted();
    const locale = useLocale();

    return (
        <>
            <GearButton type="button" onClick={() => openPanel("settings")} aria-label={t("settings")} title={t("settings")}>
                <IconSettings size={22} />
            </GearButton>

            {open && (
                <>
                    <Overlay onClick={closePanel} style={{ zIndex: 1600 }} />
                    <ModalCard role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(e) => e.stopPropagation()} style={{ zIndex: 1601 }}>
                        <ModalCloseButton onClick={closePanel} aria-label={t("close")}>
                            <IconClose size={16} />
                        </ModalCloseButton>
                        <ModalTitle id="settings-title">{t("settings")}</ModalTitle>

                        <Row>
                            <RowLabel>{t("settingsSound")}</RowLabel>
                            <Choices role="group" aria-label={t("settingsSound")}>
                                <GameButton size="sm" aria-pressed={!muted} onClick={() => setMuted(false)}>
                                    {t("settingsOn")}
                                </GameButton>
                                <GameButton size="sm" aria-pressed={muted} onClick={() => setMuted(true)}>
                                    {t("settingsOff")}
                                </GameButton>
                            </Choices>
                        </Row>

                        <Row>
                            <RowLabel>{t("settingsLanguage")}</RowLabel>
                            <Choices role="group" aria-label={t("settingsLanguage")}>
                                {LANGUAGES.map((item) => (
                                    <GameButton key={item.id} size="sm" lang={item.id} aria-pressed={locale === item.id} onClick={() => chooseLocale(item.id)}>
                                        {item.label}
                                    </GameButton>
                                ))}
                            </Choices>
                        </Row>

                        <PillButton type="button" onClick={closePanel}>
                            {t("close")}
                        </PillButton>
                    </ModalCard>
                </>
            )}
        </>
    );
};
