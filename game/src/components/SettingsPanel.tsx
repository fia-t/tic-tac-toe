"use client";
import React from "react";
import styled from "styled-components";
import { GameButton, gameButtonCss } from "@game/components/GameButton";
import { IconClose, IconExitFullscreen, IconFullscreen, IconSettings } from "@game/components/GameIcons";
import { Overlay } from "@game/components/gameStyles";
import { ModalCard, ModalCloseButton, ModalTitle, PillButton } from "@game/components/onlineStyles";
import { setMuted, useMuted } from "@game/lib/sound";
import { chooseLocale, useLocale, useT, type Locale } from "@game/lib/i18n";
import { closePanel, openPanel, useOpenPanel } from "@game/lib/ui";
import { setInvitesEnabled, useInvitesEnabled } from "@game/lib/presence";
import { isFullscreenSupported, toggleFullscreen, useFullscreen } from "@game/lib/fullscreen";

// Кнопка-шестерня в правому верхньому куті (на місці колишнього перемикача звуку) і вікно
// налаштувань: звук і мова. Над полем, але під BlockingOverlay порталу (z-index 2000).
const GearButton = styled.button<{ $inline: boolean }>`
    ${gameButtonCss("sm", { square: true })}
    ${({ $inline }) =>
        $inline
            ? `
        /* У верхньому ряду меню (TopBar) - того ж розміру, що й плашки поруч. */
        --gb-c: 12px;
        width: 38px;
        height: 38px;
        min-height: 38px;
        flex-shrink: 0;
        @media (max-width: 420px) { --gb-c: 11px; width: 40px; height: 40px; min-height: 40px; }
    `
            : `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 1500;
    `}
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

// Кнопка повного екрана - поруч із шестернею, такого самого розміру. Де розгорнути гру
// неможливо (напр. iPhone Safari поза порталом), її немає.
export const FullscreenButton: React.FC = () => {
    const t = useT();
    const isFullscreen = useFullscreen();
    const [supported, setSupported] = React.useState(false);
    React.useEffect(() => setSupported(isFullscreenSupported()), []);
    if (!supported) return null;
    const label = isFullscreen ? t("fullscreenExit") : t("fullscreen");
    return (
        <GearButton type="button" $inline onClick={() => void toggleFullscreen()} aria-label={label} title={label}>
            {isFullscreen ? <IconExitFullscreen size={18} /> : <IconFullscreen size={18} />}
        </GearButton>
    );
};

// inline - кнопка у верхньому ряду меню (TopBar); без нього - закріплена в правому верхньому
// куті (екран онлайн-кімнати).
export const SettingsButton: React.FC<{ inline?: boolean }> = ({ inline = false }) => {
    const t = useT();
    const open = useOpenPanel() === "settings";
    const muted = useMuted();
    const locale = useLocale();
    const invites = useInvitesEnabled();

    return (
        <>
            <GearButton type="button" $inline={inline} onClick={() => openPanel("settings")} aria-label={t("settings")} title={t("settings")}>
                <IconSettings size={inline ? 18 : 22} />
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
                            <RowLabel>{t("settingsInvites")}</RowLabel>
                            <Choices role="group" aria-label={t("settingsInvites")}>
                                <GameButton size="sm" aria-pressed={invites} onClick={() => setInvitesEnabled(true)}>
                                    {t("settingsOn")}
                                </GameButton>
                                <GameButton size="sm" aria-pressed={!invites} onClick={() => setInvitesEnabled(false)}>
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
