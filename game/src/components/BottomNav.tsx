"use client";
import React from "react";
import styled, { createGlobalStyle } from "styled-components";
import { gameButtonCss } from "@game/components/GameButton";
import { useT } from "@game/lib/i18n";
import { openPanel, type Panel } from "@game/lib/ui";

// Нижнє меню розділів - і на головній, і під час партії (тоді "Головна" - вихід у меню).
// Підкладка напівпрозора з розмиттям: поле й небо під нею проглядають.

const Nav = styled.nav`
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1400;
    padding: 8px max(10px, env(safe-area-inset-right, 0px)) calc(8px + env(safe-area-inset-bottom, 0px)) max(10px, env(safe-area-inset-left, 0px));
    pointer-events: none;

    & > div {
        max-width: 560px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 4px;
        padding: 6px;
        border-radius: 22px;
        background: rgba(255, 246, 230, 0.55);
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
        box-shadow: 0 6px 18px rgba(70, 40, 10, 0.1);
        pointer-events: auto;
    }
`;

const NavButton = styled.button`
    ${gameButtonCss("lg")}
    flex-direction: column;
    gap: 2px;
    padding: 0;
    font-size: 11px;

    svg {
        width: 20px;
        height: 20px;
    }
`;

// На екрані гри поле не повинно ховатися під меню: резерв місця знизу для Container
// (gameStyles.ts) - і у відступі, і в розрахунку розміру поля (--board-chrome).
const ReserveSpace = createGlobalStyle`
    :root {
        --nav-space: 84px;
    }
`;

type NavItem = "home" | "campaign" | "shop" | "awards" | "profile";
const ITEMS: NavItem[] = ["home", "campaign", "shop", "awards", "profile"];

const NAV_ICONS: Record<NavItem, React.ReactNode> = {
    home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    campaign: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />,
    shop: <path d="M4 8h16l-1.5 12h-13zM8 8a4 4 0 0 1 8 0" />,
    awards: (
        <>
            <circle cx="12" cy="9" r="6" />
            <path d="M8.5 14 7 22l5-3 5 3-1.5-8" />
        </>
    ),
    profile: (
        <>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" />
        </>
    ),
};

type BottomNavProps = {
    // Що робить "Головна": на головній - прокрутка вгору, у грі - вихід у меню.
    onHome: () => void;
    // На головній "Головна" - поточна вкладка; у грі жодна не виділена.
    homeCurrent: boolean;
    // Резерв місця під меню (екран гри).
    reserveSpace?: boolean;
};

export const BottomNav: React.FC<BottomNavProps> = ({ onHome, homeCurrent, reserveSpace }) => {
    const t = useT();
    return (
        <>
            {reserveSpace && <ReserveSpace />}
            <Nav aria-label={t("navLabel")}>
                <div>
                    {ITEMS.map((item) => (
                        <NavButton
                            key={item}
                            type="button"
                            aria-current={item === "home" && homeCurrent ? "page" : undefined}
                            onClick={() => (item === "home" ? onHome() : openPanel(item as Panel))}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
                                {NAV_ICONS[item]}
                            </svg>
                            {t(`nav_${item}`)}
                        </NavButton>
                    ))}
                </div>
            </Nav>
        </>
    );
};
