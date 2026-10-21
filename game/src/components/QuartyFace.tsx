"use client";
import React from "react";

// Мордочка лисеня Кварті - суперника в рахунку гри з новини (замість безликого "Бот").
export const QuartyFace: React.FC<{ size?: number }> = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ flexShrink: 0, display: "block" }}>
        <defs>
            <linearGradient id="quarty-fur" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ff9a3d" />
                <stop offset="1" stopColor="#e8691c" />
            </linearGradient>
        </defs>
        {/* вуха */}
        <path d="M6 31 L11 3 Q13 1 15 3 L30 17 Z" fill="url(#quarty-fur)" />
        <path d="M58 31 L53 3 Q51 1 49 3 L34 17 Z" fill="url(#quarty-fur)" />
        <path d="M11 25 L13.5 9 L24 18 Z" fill="#ffd2b0" />
        <path d="M53 25 L50.5 9 L40 18 Z" fill="#ffd2b0" />
        {/* голова */}
        <path d="M32 13 C47 13 58 21 59 33 C60 47 47 59 32 59 C17 59 4 47 5 33 C6 21 17 13 32 13 Z" fill="url(#quarty-fur)" />
        {/* світла мордочка й щічки */}
        <path d="M7 37 Q19 33 32 43 Q45 33 57 37 Q53 56 32 58 Q11 56 7 37 Z" fill="#fff4e6" />
        <path d="M27 15 Q32 22 37 15 Q32 13 27 15 Z" fill="#ffc48a" />
        {/* рум'янець */}
        <ellipse cx="14" cy="44" rx="4.5" ry="2.6" fill="#ff8a80" opacity="0.5" />
        <ellipse cx="50" cy="44" rx="4.5" ry="2.6" fill="#ff8a80" opacity="0.5" />
        {/* очі */}
        <ellipse cx="22" cy="33" rx="5" ry="6" fill="#3a2416" />
        <ellipse cx="42" cy="33" rx="5" ry="6" fill="#3a2416" />
        <circle cx="23.8" cy="30.6" r="2" fill="#fff" />
        <circle cx="43.8" cy="30.6" r="2" fill="#fff" />
        <circle cx="20.6" cy="35.6" r="0.9" fill="#fff" />
        <circle cx="40.6" cy="35.6" r="0.9" fill="#fff" />
        {/* носик і усмішка */}
        <ellipse cx="32" cy="45" rx="3.8" ry="2.7" fill="#3a2416" />
        <path d="M27.5 49.5 Q32 53.5 36.5 49.5" fill="none" stroke="#3a2416" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
);
