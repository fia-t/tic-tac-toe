"use client";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { PortalBridge } from "@/app/lib/portal/portalBridge";
import { addGameEventListener } from "@/app/lib/firebase";

// Прозорий - реальний рекламний оверлей малює батьківська сторінка порталу
// поверх iframe, тут потрібно лише перехопити клік/тач по самій грі,
// не змінюючи її вигляд (на відміну від Overlay у gameStyles.ts, що
// навмисно затемнює фон під попапами результату).
const BlockingOverlay = styled.div<{ $active: boolean }>`
    position: fixed;
    inset: 0;
    z-index: 2000;
    pointer-events: ${({ $active }) => ($active ? "all" : "none")};
`;

type PortalGameBridgeProps = {
    // Origin порталу - викликач резолвить його зі свого бандлера
    // (process.env.NEXT_PUBLIC_PORTAL_ORIGIN на сайті, import.meta.env.VITE_PORTAL_ORIGIN
    // в aggregator/), щоб сам цей файл лишався portable між Next.js і Vite.
    origin: string;
    children: React.ReactNode;
};

// Події з trackEvent (app/lib/firebase.ts), що означають завершення партії -
// приходять з усіх режимів (traditional/hard/five) і онлайн-гри однаково,
// тож тут не потрібно окремо знати про кожен ігровий компонент.
const GAME_OVER_EVENTS = new Set(["game_finished", "online_game_finished"]);

export const PortalGameBridge = ({ origin, children }: PortalGameBridgeProps) => {
    const [blocked, setBlocked] = useState(false);

    useEffect(() => {
        const bridge = new PortalBridge(origin);
        bridge.init();
        bridge.notifyReady();
        // Гра відразу playable (немає окремого "старт-екрану"), тому сесія
        // починається одразу після ready.
        bridge.notifyStarted();

        const unsubscribe = bridge.subscribe(setBlocked);

        const unsubscribeEvents = addGameEventListener((name, params) => {
            if (GAME_OVER_EVENTS.has(name)) {
                bridge.notifyGameOver({ event: name, ...params });
            }
        });

        return () => {
            unsubscribe();
            unsubscribeEvents();
            bridge.destroy();
        };
    }, [origin]);

    return (
        <>
            {children}
            <BlockingOverlay $active={blocked} aria-hidden="true" />
        </>
    );
};
