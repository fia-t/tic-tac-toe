"use client";
import React from "react";

// SVG-іконки для GameButton - окремий шар поверх еталонної форми кнопки (button-base-gold.png).
// Колір ліній - currentColor (береться з кнопки). Плитки режимів лишаються готовими PNG.
// Усі іконки - viewBox 24×24, розмір задає кнопка.

type IconProps = { size?: number };

const Svg: React.FC<IconProps & { children: React.ReactNode; strokeWidth?: number }> = ({ size = 22, strokeWidth = 2.2, children }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {children}
    </svg>
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
