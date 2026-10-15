"use client";
import React, { useState } from "react";
import styled, { keyframes } from "styled-components";
import { GameButton } from "@game/components/GameButton";
import { IconClose } from "@game/components/GameIcons";
import { openPanel, useOpenPanel } from "@game/lib/ui";
import { usePresence, useInvitesEnabled } from "@game/lib/presence";
import { useT } from "@game/lib/i18n";

// Запрошення в меню: хтось саме шукає суперника у "Швидкому матчі" - пропонуємо зіграти.
// "Зіграти" відкриває той самий пошук, і сервер зводить обох гравців. Не показується під час
// партії, коли гравець сам шукає, і для гравців, яких він уже закрив; вимикається в налаштуваннях.

const slideIn = keyframes`
    from { opacity: 0; transform: translate(-50%, -10px); }
    to { opacity: 1; transform: translate(-50%, 0); }
`;

const Bar = styled.div`
    position: fixed;
    left: 50%;
    top: calc(64px + env(safe-area-inset-top, 0px));
    z-index: 1450;
    display: flex;
    align-items: center;
    gap: 10px;
    width: min(calc(100% - 32px), 520px);
    padding: 8px 8px 8px 16px;
    border-radius: 18px;
    background: #fff6e6;
    box-shadow:
        inset 0 -4px 0 #ebcb98,
        0 12px 24px rgba(70, 40, 10, 0.22);
    color: #4a2c0c;
    font-weight: 800;
    font-size: 15px;
    transform: translateX(-50%);
    animation: ${slideIn} 0.3s ease both;

    span {
        flex: 1;
        min-width: 0;
    }
`;

const Dot = styled.i`
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #2f8a3e;
    box-shadow: 0 0 0 3px rgba(47, 138, 62, 0.2);
`;

export const MatchInvite: React.FC<{ hidden: boolean }> = ({ hidden }) => {
    const t = useT();
    const { seekers } = usePresence();
    const enabled = useInvitesEnabled();
    const panel = useOpenPanel();
    const [dismissed, setDismissed] = useState<string[]>([]);

    const seeker = seekers.find((s) => !dismissed.includes(s.uid));
    if (hidden || !enabled || panel === "match" || !seeker) return null;

    return (
        <Bar role="status" aria-live="polite">
            <Dot aria-hidden="true" />
            <span>{t("inviteSeeking", { name: seeker.name || t("player") })}</span>
            <GameButton
                tone="primary"
                size="sm"
                onClick={() => {
                    setDismissed((list) => [...list, seeker.uid]);
                    openPanel("match");
                }}
            >
                {t("invitePlay")}
            </GameButton>
            <GameButton size="sm" square aria-label={t("close")} onClick={() => setDismissed((list) => [...list, seeker.uid])} icon={<IconClose size={14} />} />
        </Bar>
    );
};

// Рядок на картці "Онлайн": скільки людей зараз у грі і скільки шукають суперника.
const Online = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    color: #4a2c0c;
    font-size: 14px;
    font-weight: 800;
`;

export const OnlineNow: React.FC = () => {
    const t = useT();
    const { online, searching } = usePresence();
    if (online === null) return null;
    return (
        <Online>
            <Dot aria-hidden="true" />
            {t("onlineNow", { n: String(online) })}
            {searching > 0 && ` · ${t("onlineSearching", { n: String(searching) })}`}
        </Online>
    );
};
