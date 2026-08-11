"use client";
import { useEffect, useState } from "react";

// SSR/перший клієнтський рендер завжди показує children (щоб не було
// hydration mismatch - сервер не знає, чи сторінка в iframe) і ховає їх
// одразу після маунту, якщо window.self !== window.top. Використовується
// для нижньої навігації на "/" (app/page.tsx) - клік по ній вивів би гравця
// з iframe порталу на маркетингові сторінки сайту.
export const HideWhenEmbedded = ({ children }: { children: React.ReactNode }) => {
    const [embedded, setEmbedded] = useState(false);

    useEffect(() => {
        setEmbedded(window.self !== window.top);
    }, []);

    if (embedded) return null;
    return <>{children}</>;
};
