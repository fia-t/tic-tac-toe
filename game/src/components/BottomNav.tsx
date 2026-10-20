"use client";
import React from "react";
import styled from "styled-components";
import { gameButtonCss } from "@game/components/GameButton";
import { useT } from "@game/lib/i18n";

// Нижнє меню розділів (як у прототипі) - на головній і сторінках розділів; на екрані партії
// його немає (вихід у меню - логотип у шапці). Кнопки стоять прямо на фоні, без плашки й тіні,
// а під ними - м'яке згасання в пісочний колір низу сторінки, щоб картки плавно зникали під меню.

// Кампанія - лише вкладкою на головній (одна точка входу), тож у меню її немає.
export type NavItem = "home" | "campaign" | "shop" | "awards" | "profile";
const ITEMS: NavItem[] = ["home", "shop", "awards", "profile"];
const ITEMS_COUNT = ITEMS.length;

const Nav = styled.nav`
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1400;
    padding: 18px max(16px, env(safe-area-inset-right, 0px)) calc(8px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
    background: linear-gradient(to top, rgba(243, 226, 196, 0.97) 0%, rgba(243, 226, 196, 0.9) 55%, rgba(243, 226, 196, 0) 100%);
    pointer-events: none;

    & > div {
        max-width: 760px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(${ITEMS_COUNT}, minmax(0, 1fr));
        gap: 4px;
        pointer-events: auto;
    }
`;

// Колір розділу при наведенні: зірки (кампанія), монети (магазин), вогник (нагороди);
// головна - горіховий (як вибрані кнопки), профіль - зелений (як "Легкий").
const HOVER: Record<NavItem, string> = {
    home: "#80532f",
    campaign: "#0f8fb0",
    shop: "#c98a12",
    awards: "#e8662f",
    profile: "#2f8a3e",
};

const NavButton = styled.button<{ $item: NavItem }>`
    ${gameButtonCss("md")}
    --gb-c: 13px;
    flex-direction: column;
    gap: 1px;
    min-height: 58px;
    padding: 0;
    font-size: 14px;
    /* Кремовий верхній бортик зливався б із пісочним згасанням: тонкий теплий контур по краю
       і ледь помітна тінь виділяють кнопку. Наведення й натискання ставлять свій filter. */
    filter: drop-shadow(0 -1px 0 rgba(139, 101, 60, 0.45)) drop-shadow(0 0 0.5px rgba(139, 101, 60, 0.5)) drop-shadow(0 3px 5px rgba(73, 48, 31, 0.14));
    transition:
        transform 0.12s ease,
        filter 0.12s ease,
        color 0.12s ease;

    svg {
        width: 24px;
        height: 24px;
    }

    @media (hover: hover) {
        &:not([aria-current="page"]):hover {
            color: ${({ $item }) => HOVER[$item]};
            text-shadow: none;
        }
    }

    /* На телефоні - трохи менші, щоб «Нагороди» вміщались. */
    @media (max-width: 640px) {
        --gb-c: 12px;
    }

    @media (max-width: 480px) {
        min-height: 54px;
        font-size: 13px;

        svg {
            width: 22px;
            height: 22px;
        }
    }
`;


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
    // Поточний розділ - виділений.
    current: NavItem;
    onNavigate: (item: NavItem) => void;
};

export const BottomNav: React.FC<BottomNavProps> = ({ current, onNavigate }) => {
    const t = useT();
    return (
        <Nav aria-label={t("navLabel")}>
            <div>
                {ITEMS.map((item) => (
                    <NavButton
                        key={item}
                        type="button"
                        $item={item}
                        aria-current={item === (current === "campaign" ? "home" : current) ? "page" : undefined}
                        onClick={() => onNavigate(item)}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
                            {NAV_ICONS[item]}
                        </svg>
                        {t(`nav_${item}`)}
                    </NavButton>
                ))}
            </div>
        </Nav>
    );
};
