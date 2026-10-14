"use client";
import styled from "styled-components";
import { setMuted, useMuted } from "@game/lib/sound";
import { useT } from "@game/lib/i18n";

// Та сама пісочна плитка, що й тултіпи (gameStyles.ts), - у правому верхньому куті,
// над ігровим полем, але під BlockingOverlay порталу (z-index 2000).
const ToggleButton = styled.button`
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 1500;
    width: 44px;
    height: 44px;
    border: none;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #6b4a25;
    background: linear-gradient(155deg, #f5e0b6 0%, #e6c890 100%);
    box-shadow:
        3px 3px 6px rgba(101, 72, 35, 0.3),
        -1px -1px 2px rgba(255, 250, 235, 0.5);
    touch-action: manipulation;

    &:active {
        transform: translateY(1px) scale(0.97);
    }

    &:focus-visible {
        outline: 3px solid #1fb3d9;
        outline-offset: 2px;
    }
`;

export const SoundToggle = () => {
    const muted = useMuted();
    const t = useT();
    const label = muted ? t("soundOn") : t("soundOff");

    return (
        <ToggleButton type="button" onClick={() => setMuted(!muted)} aria-label={label} title={label} aria-pressed={muted}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 9h4l5-4v14l-5-4H4z" />
                {muted ? (
                    <>
                        <path d="M17 9l5 6" />
                        <path d="M22 9l-5 6" />
                    </>
                ) : (
                    <>
                        <path d="M16.5 8.5a5 5 0 0 1 0 7" />
                        <path d="M19.5 5.5a9 9 0 0 1 0 13" />
                    </>
                )}
            </svg>
        </ToggleButton>
    );
};
