import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { assetUrl } from "@game/lib/assets";
import { trackEvent } from "@game/lib/firebase";
import { isFullscreenSupported, toggleFullscreen } from "@game/lib/fullscreen";
import { useT } from "@game/lib/i18n";
import { isHalloweenEmbed } from "@game/lib/embed";

// Гра в новині на телефоні: портал дає iframe пропорцій банера (на телефоні ~370×190) - у такій
// смузі поле не вміщається. Тоді поверх гри - заставка з кнопкою "Грати", що розгортає гру на весь
// екран (там телефонна розкладка GameScreen). Де повного екрана немає (iPhone) - гра в новій вкладці.
const COMPACT_QUERY = "(max-width: 760px) and (max-height: 479px)";

export const useEmbedCompact = (): boolean => {
    const [compact, setCompact] = useState(() => typeof window !== "undefined" && window.matchMedia(COMPACT_QUERY).matches);
    useEffect(() => {
        const query = window.matchMedia(COMPACT_QUERY);
        const update = () => setCompact(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);
    return compact;
};

const Splash = styled.div<{ $halloween: boolean }>`
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
    padding: 12px 18px;
    /* Непрозора - гра під заставкою не просвічує. Гелловінський скін - нічне небо, інші - морське. */
    background: ${({ $halloween }) =>
        $halloween ? "linear-gradient(180deg, #2c2150 0%, #4b2d61 70%, #8a4a3c 100%)" : "linear-gradient(180deg, #1f6f8c 0%, #2f9bb0 70%, #e2c48f 100%)"};
    color: #fff6e6;
    font-family: var(--font-body);
`;

const Avatar = styled.div`
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: min(116px, 58vh);
    aspect-ratio: 1;
    border-radius: 50%;
    background: #fff6e6;
    box-shadow:
        0 0 0 4px rgba(255, 246, 230, 0.35),
        0 8px 18px rgba(0, 0, 0, 0.35);

    img {
        width: 78%;
        height: 78%;
        object-fit: contain;
    }
`;

const Body = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    min-width: 0;
`;

const Title = styled.div`
    font: 400 clamp(20px, 7vw, 28px) / 1.05 var(--font-heading);
    text-shadow: 0 2px 0 rgba(0, 0, 0, 0.3);
`;

const Sub = styled.div`
    font-size: 14px;
    font-weight: 600;
    opacity: 0.85;
`;

const PlayButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 150px;
    height: 48px;
    margin-top: 6px;
    padding: 0 24px;
    border: none;
    border-radius: 24px;
    background: #5bbf3a;
    box-shadow: 0 4px 0 #2f7d1d;
    color: #fff;
    font: 400 22px/1 var(--font-heading);
    letter-spacing: 0.02em;
    cursor: pointer;

    &:active {
        transform: translateY(2px);
        box-shadow: 0 2px 0 #2f7d1d;
    }

    &:focus-visible {
        outline: 3px solid #fff6e6;
        outline-offset: 3px;
    }
`;

export const EmbedSplash: React.FC = () => {
    const t = useT();
    const [started, setStarted] = useState(false);

    const play = async () => {
        trackEvent("embed_splash_play", { again: started });
        setStarted(true);
        if (isFullscreenSupported()) {
            await toggleFullscreen();
            if (document.fullscreenElement) return;
        }
        window.open(window.location.href, "_blank", "noopener");
    };

    return (
        <Splash $halloween={isHalloweenEmbed()} role="dialog" aria-label={t("embedChallenge")}>
            <Avatar aria-hidden="true">
                <img src={assetUrl("icons/mentor.a5788621.avif")} alt="" />
            </Avatar>
            <Body>
                <Title>{t("embedChallenge")}</Title>
                <Sub>{t("embedGame")}</Sub>
                <PlayButton type="button" onClick={() => void play()}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M7 4l13 8-13 8z" />
                    </svg>
                    {started ? t("embedContinue") : t("embedPlay")}
                </PlayButton>
            </Body>
        </Splash>
    );
};
