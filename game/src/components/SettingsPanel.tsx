"use client";
import React from "react";
import styled, { css, keyframes } from "styled-components";
import { GameButton, gameButtonCss } from "@game/components/GameButton";
import { IconClose, IconExitFullscreen, IconFullscreen, IconSettings } from "@game/components/GameIcons";
import { Overlay } from "@game/components/gameStyles";
import { ModalCard, ModalCloseButton, ModalTitle } from "@game/components/onlineStyles";
import { setMuted, useMuted } from "@game/lib/sound";
import { LOCALES, LOCALE_NAMES, chooseLocale, useLocale, useT, type Locale } from "@game/lib/i18n";
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

// Мов дев'ять - список, а не ряд кнопок.
const LanguageSelect = styled.select`
    min-width: 0;
    height: 40px;
    padding: 0 34px 0 12px;
    border: 0;
    border-radius: 12px;
    background:
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2349301f' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 9l7 7 7-7'/%3E%3C/svg%3E")
            right 12px center no-repeat,
        #f6e2b8;
    box-shadow: inset 0 -3px 0 #ebcb98;
    color: #49301f;
    font: inherit;
    font-size: 15px;
    font-weight: 800;
    appearance: none;
    cursor: pointer;

    &:focus-visible {
        outline: 3px solid #1fb3d9;
        outline-offset: 2px;
    }
`;

const Choices = styled.div`
    display: flex;
    gap: 6px;
`;

// Кнопка повного екрана - поруч із шестернею, такого самого розміру. Де розгорнути гру
// неможливо (напр. iPhone Safari поза порталом), її немає.
// Підказка "розгорни на весь екран": кнопка пульсує й світиться.
const nudgePulse = keyframes`
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(242, 140, 27, 0.7); }
    50% { transform: scale(1.25); box-shadow: 0 0 0 14px rgba(242, 140, 27, 0); }
`;

const NudgeButton = styled(GearButton)<{ $nudge: boolean }>`
    ${({ $nudge }) =>
        $nudge &&
        css`
            animation: ${nudgePulse} 1s ease-in-out 3;
            @media (prefers-reduced-motion: reduce) {
                animation: none;
                outline: 3px solid #f28c1b;
            }
        `}
`;

// Перша підказка - одразу, далі - повтор, поки гравець так і не розгорнув гру.
const NUDGE_MS = 3000;
const NUDGE_REPEAT_MS = 40000;

// nudge - рекомендувати повний екран (великі поля в грі з новини): 3 с пульсації, потім пауза й знову.
export const FullscreenButton: React.FC<{ nudge?: boolean }> = ({ nudge = false }) => {
    const t = useT();
    const isFullscreen = useFullscreen();
    const [supported, setSupported] = React.useState(false);
    const [pulsing, setPulsing] = React.useState(false);
    React.useEffect(() => setSupported(isFullscreenSupported()), []);
    React.useEffect(() => {
        if (!supported || !nudge || isFullscreen) {
            setPulsing(false);
            return;
        }
        // Поки відкрите вікно (напр. правила гіга-поля) - чекаємо: пульсація почнеться після закриття.
        // Перша перевірка - з невеликою затримкою, щоб вікно, яке відкривається разом із полем, встигло з'явитись.
        let stop: ReturnType<typeof setTimeout> | undefined;
        let nextAt = Date.now() + 600;
        const tick = setInterval(() => {
            if (Date.now() < nextAt || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
            setPulsing(true);
            stop = setTimeout(() => setPulsing(false), NUDGE_MS);
            nextAt = Date.now() + NUDGE_REPEAT_MS;
        }, 300);
        return () => {
            clearInterval(tick);
            clearTimeout(stop);
        };
    }, [supported, nudge, isFullscreen]);
    if (!supported) return null;
    const label = isFullscreen ? t("fullscreenExit") : t("fullscreen");
    return (
        <NudgeButton type="button" $inline $nudge={pulsing} onClick={() => void toggleFullscreen()} aria-label={label} title={label}>
            {isFullscreen ? <IconExitFullscreen size={18} /> : <IconFullscreen size={18} />}
        </NudgeButton>
    );
};

// inline - кнопка у верхньому ряду меню (TopBar); без нього - закріплена в правому верхньому
// куті (екран онлайн-кімнати).
export const SettingsButton: React.FC<{ inline?: boolean }> = ({ inline = false }) => {
    const t = useT();
    const open = useOpenPanel() === "settings";
    const muted = useMuted();
    const invites = useInvitesEnabled();
    const locale = useLocale();

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
                            <RowLabel id="settings-language">{t("settingsLanguage")}</RowLabel>
                            <LanguageSelect aria-labelledby="settings-language" value={locale} onChange={(e) => chooseLocale(e.target.value as Locale)}>
                                {LOCALES.map((item) => (
                                    <option key={item} value={item} lang={item}>
                                        {LOCALE_NAMES[item]}
                                    </option>
                                ))}
                            </LanguageSelect>
                        </Row>
                    </ModalCard>
                </>
            )}
        </>
    );
};
