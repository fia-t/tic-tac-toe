"use client";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import type { BannerResult } from "@game/sdk/types";

// Рекламні банери порталу (QSPlay SDK, https://docs-dev.quartsoft.com/sdk/banner-module).
// Контекст задає лише білд для порталу (App.tsx) - на сайті й у грі з новини його немає,
// і банери там не рендеряться взагалі.

export type BannerApi = {
    show: (id: string, width: number, height: number) => Promise<BannerResult>;
    clear: (id: string) => Promise<void>;
};

export const AdBannerContext = createContext<BannerApi | null>(null);

// Портал не дає повторно запитувати той самий слот частіше, ніж раз на 30 с.
const COOLDOWN_MS = 30_000;

const SlotBox = styled.div`
    flex-shrink: 0;
    overflow: hidden;
`;

// Один слот: елемент з id, у який SDK малює банер. Запит - лише коли елемент повністю
// видно (інакше портал не зарахує показ), при знятті банер прибирається.
const AdSlot: React.FC<{
    id: string;
    width: number;
    height: number;
    style?: React.CSSProperties;
}> = ({ id, width, height, style }) => {
    const api = useContext(AdBannerContext);
    const ref = useRef<HTMLDivElement>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!api || !node) return;
        let cancelled = false;
        let requested = false;
        let retry: ReturnType<typeof setTimeout> | undefined;
        const request = async () => {
            const result = await api.show(id, width, height);
            if (cancelled) return;
            if (result === "cooldown") retry = setTimeout(() => void request(), COOLDOWN_MS);
            else if (result === "failed") setFailed(true);
        };
        const observer = new IntersectionObserver(
            (entries) => {
                if (requested || !entries.some((entry) => entry.intersectionRatio >= 0.99)) return;
                requested = true;
                observer.disconnect();
                void request();
            },
            { threshold: [0.99, 1] }
        );
        observer.observe(node);
        return () => {
            cancelled = true;
            clearTimeout(retry);
            observer.disconnect();
            void api.clear(id);
        };
    }, [api, id, width, height]);

    if (!api || failed) return null;
    return <SlotBox ref={ref} id={id} style={{ width, height, ...style }} />;
};

// Горизонтальний банер шириною колонки: 728×90, на вужчому - 320×50 чи 300×50.
const INLINE_SIZES: [number, number][] = [
    [728, 90],
    [320, 50],
    [300, 50],
];

const InlineRow = styled.div`
    display: flex;
    justify-content: center;
    width: 100%;
`;

export const InlineBanner: React.FC<{ id: string }> = ({ id }) => {
    const api = useContext(AdBannerContext);
    const ref = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const observer = new ResizeObserver(() => setWidth(node.clientWidth));
        observer.observe(node);
        return () => observer.disconnect();
    }, [api]);

    if (!api) return null;
    const size = INLINE_SIZES.find(([w]) => w <= width);
    return <InlineRow ref={ref}>{size && <AdSlot key={size.join("x")} id={id} width={size[0]} height={size[1]} />}</InlineRow>;
};

// Бокові банери - у вільному місці ліворуч і праворуч від центрального блоку (колонка меню
// або поле з кнопками), по центру по вертикалі між шапкою й нижнім краєм.
const SIDE_SIZES: [number, number][] = [
    [300, 600],
    [160, 600],
    [120, 600],
];
const SIDE_GAP = 16;

type SideSlot = { width: number; height: number; left: number; top: number };

const rectOf = (selector: string): DOMRect | null => {
    const nodes = [...document.querySelectorAll<HTMLElement>(selector)].filter((node) => node.offsetParent !== null);
    if (!nodes.length) return null;
    const rects = nodes.map((node) => node.getBoundingClientRect());
    const left = Math.min(...rects.map((r) => r.left));
    const right = Math.max(...rects.map((r) => r.right));
    const top = Math.min(...rects.map((r) => r.top));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    return new DOMRect(left, top, right - left, bottom - top);
};

export type SideBannerLayout = {
    // Центральний блок, який банери не перекривають.
    center: string;
    // Елемент ліворуч від центру (плитки полів на екрані гри) - лівий банер стоїть між ним і центром.
    leftEdge?: string;
    // Що обмежує банер згори (шапка) і знизу (нижнє меню).
    topEdge: string;
    bottomEdge?: string;
};

const placeSides = (layout: SideBannerLayout): [SideSlot | null, SideSlot | null] => {
    const center = rectOf(layout.center);
    if (!center) return [null, null];
    const top = (rectOf(layout.topEdge)?.bottom ?? 0) + SIDE_GAP;
    const bottom = (layout.bottomEdge ? rectOf(layout.bottomEdge)?.top : undefined) ?? window.innerHeight;
    const band = bottom - SIDE_GAP - top;
    const leftStart = layout.leftEdge ? (rectOf(layout.leftEdge)?.right ?? 0) : 0;
    const place = (from: number, to: number): SideSlot | null => {
        const size = SIDE_SIZES.find(([w, h]) => w + SIDE_GAP * 2 <= to - from && h <= band);
        if (!size) return null;
        const [width, height] = size;
        return {
            width,
            height,
            left: Math.round(from + (to - from - width) / 2),
            top: Math.round(top + (band - height) / 2),
        };
    };
    return [place(leftStart, center.left), place(center.right, document.documentElement.clientWidth)];
};

const SideBox = styled.div`
    position: fixed;
    z-index: 5;
`;

export const SideBanners: React.FC<{
    id: string;
    layout: SideBannerLayout;
}> = ({ id, layout }) => {
    const api = useContext(AdBannerContext);
    const [slots, setSlots] = useState<[SideSlot | null, SideSlot | null]>([null, null]);
    const { center, leftEdge, topEdge, bottomEdge } = layout;

    useEffect(() => {
        if (!api) return;
        let frame = 0;
        const update = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => setSlots(placeSides({ center, leftEdge, topEdge, bottomEdge })));
        };
        update();
        // Розкладка ще може осісти (картинки, шрифти) - перемірюємо при будь-якій зміні розміру сторінки.
        const observer = new ResizeObserver(update);
        observer.observe(document.body);
        window.addEventListener("resize", update);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            window.removeEventListener("resize", update);
        };
    }, [api, center, leftEdge, topEdge, bottomEdge]);

    if (!api) return null;
    return (
        <>
            {slots.map(
                (slot, index) =>
                    slot && (
                        <SideBox key={`${index}-${slot.width}x${slot.height}`} style={{ left: slot.left, top: slot.top }}>
                            <AdSlot id={`${id}-${index ? "right" : "left"}`} width={slot.width} height={slot.height} />
                        </SideBox>
                    )
            )}
        </>
    );
};
