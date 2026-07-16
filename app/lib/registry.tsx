"use client";
import React, { useState } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { ServerStyleSheet, StyleSheetManager } from "styled-components";

// Стандартний патерн Next.js App Router для styled-components v6: збирає
// стилі, згенеровані під час серверного рендеру, і вставляє їх у HTML ще до
// гідратації - інакше клієнт стартує з порожнім stylesheet і race-ить із
// сервером за тим, які класи вважати "джерелом істини".
export default function StyledComponentsRegistry({ children }: { children: React.ReactNode }) {
    const [styledComponentsStyleSheet] = useState(() => new ServerStyleSheet());

    useServerInsertedHTML(() => {
        const styles = styledComponentsStyleSheet.getStyleElement();
        styledComponentsStyleSheet.instance.clearTag();
        return <>{styles}</>;
    });

    if (typeof window !== "undefined") return <>{children}</>;

    return <StyleSheetManager sheet={styledComponentsStyleSheet.instance}>{children}</StyleSheetManager>;
}
