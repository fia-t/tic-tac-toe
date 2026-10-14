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

export const IconSettings = (p: IconProps) => (
    <Svg {...p}>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
    </Svg>
);
