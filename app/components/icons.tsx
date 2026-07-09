"use client";
import React from "react";
import styled from "styled-components";

// Спільна палітра для іконок кнопок: тепла піщано-бежева лінія (темніша за
// плитку кнопки) + коралово-червоний X і бірюзовий O для декоративних фішок
// на іконках Easy/Hard - узгоджено з кольорами реальних фішок гри.
const LINE_COLOR = "#a97a46";
const X_GRADIENT_ID = "buttonIconXGradient";
const O_GRADIENT_ID = "buttonIconOGradient";

// Легкий рельєф: світлий відблиск зверху-зліва + темніша тінь знизу-справа,
// щоб лінії поля/стрілка виглядали трохи втопленими в пісочну плитку кнопки.
const IconSvg = styled.svg`
    width: 62%;
    height: 62%;
    display: block;
    overflow: visible;
    filter: drop-shadow(1px 1.5px 0.5px rgba(93, 64, 29, 0.45))
            drop-shadow(-0.75px -0.75px 0.5px rgba(255, 250, 236, 0.6));
`;

const IconDefs = () => (
    <defs>
        <linearGradient id={X_GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff9884" />
            <stop offset="100%" stopColor="#df4a34" />
        </linearGradient>
        <linearGradient id={O_GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#79eaec" />
            <stop offset="100%" stopColor="#1c9ba0" />
        </linearGradient>
    </defs>
);

// Easy: справжнє поле 3x3 з парою фішок для впізнаваності режиму.
export const EasyModeIcon = () => (
    <IconSvg viewBox="0 0 100 100">
        <IconDefs />
        <rect x="6" y="6" width="88" height="88" rx="12" fill="none" stroke={LINE_COLOR} strokeWidth="7" strokeLinejoin="round" />
        <line x1="35.3" y1="10" x2="35.3" y2="90" stroke={LINE_COLOR} strokeWidth="5" strokeLinecap="round" />
        <line x1="64.7" y1="10" x2="64.7" y2="90" stroke={LINE_COLOR} strokeWidth="5" strokeLinecap="round" />
        <line x1="10" y1="35.3" x2="90" y2="35.3" stroke={LINE_COLOR} strokeWidth="5" strokeLinecap="round" />
        <line x1="10" y1="64.7" x2="90" y2="64.7" stroke={LINE_COLOR} strokeWidth="5" strokeLinecap="round" />

        <g stroke={`url(#${X_GRADIENT_ID})`} strokeWidth="6.5" strokeLinecap="round">
            <line x1="70" y1="16" x2="83" y2="29" />
            <line x1="83" y1="16" x2="70" y2="29" />
        </g>
        <circle cx="76.5" cy="76.5" r="9" fill="none" stroke={`url(#${O_GRADIENT_ID})`} strokeWidth="6" />
    </IconSvg>
);

// Hard: повне поле 9x9, розбите на 9 блоків 3x3 - товсті "мажорні" лінії між
// блоками і тонші внутрішні лінії всередині кожного блока.
export const HardModeIcon = () => {
    const majorPositions = [35.3, 64.7];
    const minorPositions = [15.8, 25.6, 45.1, 54.9, 74.4, 84.2];

    return (
        <IconSvg viewBox="0 0 100 100">
            <IconDefs />
            <rect x="6" y="6" width="88" height="88" rx="12" fill="none" stroke={LINE_COLOR} strokeWidth="6.5" strokeLinejoin="round" />

            {minorPositions.map((pos) => (
                <React.Fragment key={`v-${pos}`}>
                    <line x1={pos} y1="6" x2={pos} y2="94" stroke={LINE_COLOR} strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
                </React.Fragment>
            ))}
            {minorPositions.map((pos) => (
                <React.Fragment key={`h-${pos}`}>
                    <line x1="6" y1={pos} x2="94" y2={pos} stroke={LINE_COLOR} strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
                </React.Fragment>
            ))}

            {majorPositions.map((pos) => (
                <React.Fragment key={`mv-${pos}`}>
                    <line x1={pos} y1="6" x2={pos} y2="94" stroke={LINE_COLOR} strokeWidth="4.5" strokeLinecap="round" />
                </React.Fragment>
            ))}
            {majorPositions.map((pos) => (
                <React.Fragment key={`mh-${pos}`}>
                    <line x1="6" y1={pos} x2="94" y2={pos} stroke={LINE_COLOR} strokeWidth="4.5" strokeLinecap="round" />
                </React.Fragment>
            ))}

            <g stroke={`url(#${X_GRADIENT_ID})`} strokeWidth="4" strokeLinecap="round">
                <line x1="72" y1="12" x2="80" y2="20" />
                <line x1="80" y1="12" x2="72" y2="20" />
            </g>
            <circle cx="30" cy="50" r="5.5" fill="none" stroke={`url(#${O_GRADIENT_ID})`} strokeWidth="3.6" />
            <g stroke={`url(#${X_GRADIENT_ID})`} strokeWidth="4" strokeLinecap="round">
                <line x1="16" y1="76" x2="24" y2="84" />
                <line x1="24" y1="76" x2="16" y2="84" />
            </g>
        </IconSvg>
    );
};

// Restart: кругова стрілка того ж стилю, що й лінії поля - трохи темніша
// бежева, з тим самим легким рельєфом.
export const RestartIcon = () => (
    <IconSvg viewBox="0 0 24 24">
        <path
            fill={LINE_COLOR}
            d="M17.65,6.35 C16.2,4.9,14.21,4,12,4 c-4.42,0-7.99,3.58-7.99,8 s3.57,8,7.99,8 c3.73,0,6.84-2.55,7.73-6 h-2.08 c-0.82,2.33-3.04,4-5.65,4 c-3.31,0-6-2.69-6-6 s2.69-6,6-6 c1.66,0,3.14,0.69,4.22,1.78 L13,11 h7 V4 L17.65,6.35 z"
        />
    </IconSvg>
);
