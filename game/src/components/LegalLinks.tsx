import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { GameButton } from "@game/components/GameButton";
import { useT } from "@game/lib/i18n";
import { addGameEventListener } from "@game/lib/firebase";

// Умови використання й політика конфіденційності - вимога CrazyGames для ігор, що збирають дані
// поза їхнім SDK (у нас: ім'я гравця, статистика й журнал партій, аналітика). Посилання на ці
// сторінки - дозволений виняток із заборони зовнішніх посилань. Лише в білді CrazyGames:
// сайт має їх у футері, портал - власні правила.
export const LEGAL_LINKS_ENABLED = process.env.GAME_TARGET === "crazygames";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
const TERMS_URL = `${SITE}/terms`;
const PRIVACY_URL = `${SITE}/privacy`;
const SEEN_KEY = "ttt-legal-notice-seen";

const Links = styled.div`
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px 16px;
    font-size: 13px;

    a {
        color: #0f6f8c;
        font-weight: 700;
        text-decoration: underline;
        text-underline-offset: 2px;
    }
`;

export const LegalLinks: React.FC<{ className?: string }> = ({ className }) => {
    const t = useT();
    return (
        <Links className={className}>
            <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">
                {t("legalTerms")}
            </a>
            <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
                {t("legalPrivacy")}
            </a>
        </Links>
    );
};

const SettingsLinks = styled(LegalLinks)`
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px dashed rgba(139, 101, 60, 0.3);
`;

// Рядок у налаштуваннях - посилання доступні будь-коли.
export const SettingsLegalLinks: React.FC = () => (LEGAL_LINKS_ENABLED ? <SettingsLinks /> : null);

const Bar = styled.div`
    position: fixed;
    left: 50%;
    bottom: 12px;
    transform: translateX(-50%);
    z-index: 1700;
    width: min(94vw, 520px);
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px 10px 16px;
    border-radius: 16px;
    background: #fff6e6;
    color: #5b3f22;
    box-shadow: 0 8px 24px rgba(73, 48, 31, 0.3);
    font-size: 13px;
    line-height: 1.35;

    p {
        margin: 0 0 4px;
    }

    & > div:first-child {
        flex: 1;
        min-width: 0;
    }

    ${Links} {
        justify-content: flex-start;
        font-size: 12px;
    }
`;

const readSeen = (): boolean => {
    try {
        return localStorage.getItem(SEEN_KEY) === "1";
    } catch {
        return false;
    }
};

// Плашка для нового гравця: показується, доки її не закрили (вибір пам'ятається в браузері).
// Поки відкрите навчання (картка теж унизу екрана) - ховається, щоб не перекривати його кнопки.
export const LegalNotice: React.FC = () => {
    const t = useT();
    const [visible, setVisible] = useState(() => LEGAL_LINKS_ENABLED && !readSeen());
    const [tutorialOpen, setTutorialOpen] = useState(false);
    useEffect(() => {
        if (!LEGAL_LINKS_ENABLED) return;
        return addGameEventListener((name) => {
            if (name === "tutorial_shown") setTutorialOpen(true);
            else if (name === "tutorial_closed") setTutorialOpen(false);
        });
    }, []);
    if (!visible || tutorialOpen) return null;
    const dismiss = () => {
        try {
            localStorage.setItem(SEEN_KEY, "1");
        } catch {
            // Сховище недоступне - плашка просто з'явиться знову наступного разу.
        }
        setVisible(false);
    };
    return (
        <Bar role="region" aria-label={t("legalPrivacy")}>
            <div>
                <p>{t("legalNotice")}</p>
                <LegalLinks />
            </div>
            <GameButton size="sm" onClick={dismiss}>
                {t("legalOk")}
            </GameButton>
        </Bar>
    );
};
