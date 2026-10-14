"use client";
import { IconSoundOff, IconSoundOn } from "@game/components/GameIcons";
import styled from "styled-components";
import { gameButtonCss } from "@game/components/GameButton";

import { setMuted, useMuted } from "@game/lib/sound";
import { useT } from "@game/lib/i18n";

// Та сама пісочна плитка, що й тултіпи (gameStyles.ts), - у правому верхньому куті,
// над ігровим полем, але під BlockingOverlay порталу (z-index 2000).
const ToggleButton = styled.button`
    ${gameButtonCss("sm", { square: true })}
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 1500;
`;

export const SoundToggle = () => {
    const muted = useMuted();
    const t = useT();
    const label = muted ? t("soundOn") : t("soundOff");

    return (
        <ToggleButton type="button" onClick={() => setMuted(!muted)} aria-label={label} title={label} aria-pressed={muted}>
            {muted ? <IconSoundOff size={22} /> : <IconSoundOn size={22} />}
        </ToggleButton>
    );
};
