"use client";
import React from "react";

// SVG-іконки для GameButton - окремий шар поверх еталонної форми кнопки (button-base-gold.png).
// Колір ліній - currentColor (береться з кнопки), фішки X/O - фірмові червоний і бірюзовий.
// Усі іконки - viewBox 24×24, розмір задає кнопка.

const X_COLOR = "#e8452f";
const O_COLOR = "#1fb3d9";

type IconProps = { size?: number };

const Svg: React.FC<IconProps & { children: React.ReactNode; strokeWidth?: number }> = ({ size = 22, strokeWidth = 2.2, children }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {children}
    </svg>
);

export const IconHome = (p: IconProps) => (
    <Svg {...p}>
        <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </Svg>
);

export const IconCalendar = (p: IconProps) => (
    <Svg {...p}>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4" />
    </Svg>
);

export const IconMap = (p: IconProps) => (
    <Svg {...p}>
        <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />
    </Svg>
);

export const IconSoundOn = (p: IconProps) => (
    <Svg {...p}>
        <path d="M4 9h4l5-4v14l-5-4H4z" />
        <path d="M16.5 8.5a5 5 0 0 1 0 7M19.5 5.5a9 9 0 0 1 0 13" />
    </Svg>
);

export const IconSoundOff = (p: IconProps) => (
    <Svg {...p}>
        <path d="M4 9h4l5-4v14l-5-4H4z" />
        <path d="M17 9l5 6M22 9l-5 6" />
    </Svg>
);

export const IconHelp = (p: IconProps) => (
    <Svg {...p} strokeWidth={2.6}>
        <path d="M9.2 9a3 3 0 1 1 4.3 2.7c-.9.4-1.5 1.2-1.5 2.2v.6" />
        <path d="M12 18.2h.01" />
    </Svg>
);

export const IconClose = (p: IconProps) => (
    <Svg {...p} strokeWidth={2.8}>
        <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
);

export const IconRestart = (p: IconProps) => (
    <Svg {...p} strokeWidth={2.6}>
        <path d="M20 12a8 8 0 1 1-2.6-5.9" />
        <path d="M20 4v5h-5" />
    </Svg>
);

// Фішки для іконок режимів.
const MiniX = ({ x, y, s }: { x: number; y: number; s: number }) => (
    <path d={`M${x - s} ${y - s}L${x + s} ${y + s}M${x + s} ${y - s}L${x - s} ${y + s}`} stroke={X_COLOR} strokeWidth={s * 0.9} strokeLinecap="round" />
);
const MiniO = ({ x, y, s }: { x: number; y: number; s: number }) => (
    <circle cx={x} cy={y} r={s} stroke={O_COLOR} strokeWidth={s * 0.75} fill="none" />
);

const gridLines = (n: number, from: number, to: number) => {
    const step = (to - from) / n;
    const lines: string[] = [];
    for (let i = 1; i < n; i++) {
        const v = from + step * i;
        lines.push(`M${v} ${from}V${to}`, `M${from} ${v}H${to}`);
    }
    return lines.join("");
};

export const IconMode3 = ({ size = 30 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <rect x="3" y="3" width="18" height="18" rx="2.5" stroke="#b98a4f" strokeWidth="1.4" />
        <path d={gridLines(3, 3, 21)} stroke="#b98a4f" strokeWidth="1.2" />
        <MiniX x={18} y={6} s={1.6} />
        <MiniO x={18} y={12} s={1.7} />
        <MiniO x={18} y={18} s={1.7} />
    </svg>
);

export const IconMode5 = ({ size = 30 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <rect x="2.5" y="2.5" width="19" height="19" rx="2.5" stroke="#b98a4f" strokeWidth="1.3" />
        <path d={gridLines(5, 2.5, 21.5)} stroke="#b98a4f" strokeWidth="0.9" />
        <MiniX x={4.4} y={4.4} s={1.1} />
        <MiniO x={19.6} y={4.4} s={1.15} />
        <MiniX x={12} y={12} s={1.1} />
        <MiniO x={8.2} y={8.2} s={1.15} />
        <MiniX x={4.4} y={19.6} s={1.1} />
        <MiniO x={15.8} y={19.6} s={1.15} />
    </svg>
);

export const IconModeUltimate = ({ size = 30 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <rect x="2.5" y="2.5" width="19" height="19" rx="2.5" stroke="#b98a4f" strokeWidth="1.3" />
        <path d={gridLines(3, 2.5, 21.5)} stroke="#b98a4f" strokeWidth="1.3" />
        <path d={gridLines(9, 2.5, 21.5)} stroke="#b98a4f" strokeWidth="0.45" />
        <MiniX x={5.7} y={5.7} s={0.9} />
        <MiniO x={18.3} y={5.7} s={0.95} />
        <MiniX x={12} y={12} s={0.9} />
        <MiniO x={8.8} y={15.2} s={0.95} />
        <MiniX x={18.3} y={18.3} s={0.9} />
    </svg>
);

export const IconFriends = ({ size = 30 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <circle cx="5.2" cy="7" r="2.6" fill={O_COLOR} />
        <path d="M1.5 17.5c0-3.4 1.7-5.6 3.7-5.6s3.7 2.2 3.7 5.6z" fill={O_COLOR} />
        <circle cx="18.8" cy="7" r="2.6" fill="#f5b82e" />
        <path d="M15.1 17.5c0-3.4 1.7-5.6 3.7-5.6s3.7 2.2 3.7 5.6z" fill="#f5b82e" />
        <rect x="8.4" y="9.5" width="7.2" height="7.2" rx="1" stroke="#b98a4f" strokeWidth="0.9" fill="#fff6e6" />
        <path d="M10.8 9.5V16.7M13.2 9.5V16.7M8.4 11.9H15.6M8.4 14.3H15.6" stroke="#b98a4f" strokeWidth="0.6" />
        <MiniX x={10.6} y={11.7} s={0.7} />
        <MiniO x={13.4} y={14.5} s={0.75} />
    </svg>
);
