"use client";
import React, { useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";
import { buttonTone, gameButtonCss } from "@game/components/GameButton";
import type { Difficulty } from "@game/lib/difficulty";
import { useT } from "@game/lib/i18n";
import type { Modifier } from "@game/lib/modifiers";

// Спільні елементи вибору партії - на головній ("Швидка гра") і в смузі над полем:
// складність бота ("світлофор"), іконки модифікаторів і тултіпи.

// Тултіп із data-tip: з'являється при наведенні або фокусі клавіатурою. За замовчуванням - під
// кнопкою (над кнопками стоять підписи груп, а над полем - шапка). Кнопка з відкритим тултіпом
// піднімається над сусідами: при наведенні вона отримує filter (окремий шар), і тултіп інакше
// ховався б під кнопками нижче.
export const tipCss = css`
    &::after {
        content: attr(data-tip);
        position: absolute;
        left: 50%;
        top: calc(100% + var(--gb-c, 0px) + 6px);
        transform: translateX(-50%);
        padding: 4px 9px;
        border-radius: 8px;
        background: #49301f;
        color: #fff7e8;
        font: 400 13px/1.2 var(--font-body);
        white-space: nowrap;
        text-shadow: none;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.12s ease;
        z-index: 25;
    }

    @media (hover: hover) {
        &:hover::after {
            opacity: 1;
        }
    }

    &:focus-visible::after {
        opacity: 1;
    }

    &:hover,
    &:focus-visible {
        z-index: 26;
    }
`;

// Складність бота - "світлофор": вибраний рівень у своєму кольорі.
const DIFF_TONE = { easy: "green", medium: "amber", master: "danger" } as const;

export const DiffButton = styled.button<{ $level: Difficulty }>`
    ${gameButtonCss("sm")}
    /* && - сильніше за мобільні розміри gameButtonCss (вони в @media). Висота - як у кнопок
       модифікаторів поруч (46 px, на телефоні 42), трохи ширші й з більшим текстом. */
    && {
        --gb-c: 13px;
        min-height: 46px;
        padding: 0 8px;
        font-size: 15px;
    }

    @media (max-width: 480px) {
        && {
            min-height: 42px;
            padding: 0 5px;
            font-size: 14px;
        }
    }

    &&[aria-pressed="true"] {
        ${({ $level }) => buttonTone(DIFF_TONE[$level])}
    }
`;

export const DiffGroup = styled.div`
    display: inline-flex;
    flex-wrap: nowrap;
    gap: 6px;
`;

// Іконки модифікаторів: назва - у тултіпі й aria-label.
const MOD_ICON_PATHS: Record<Modifier | "none", React.ReactNode> = {
    none: <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />,
    vanish: (
        <>
            <path d="M4 4l9 9M13 4l-9 9" />
            <path d="M15 15l5 5M20 15l-5 5" strokeDasharray="2 2.4" />
        </>
    ),
    gravity: <path d="M12 3v12M6.5 9.5 12 15l5.5-5.5M4 21h16" />,
    stones: (
        <>
            <ellipse cx="12" cy="17.2" rx="8.5" ry="4.2" />
            <ellipse cx="8.3" cy="10.8" rx="4.3" ry="3.1" transform="rotate(-12 8.3 10.8)" />
            <ellipse cx="16" cy="9.6" rx="3.5" ry="2.7" transform="rotate(10 16 9.6)" />
            <path d="M8 16.2c1.2-.8 2.6-1 4-.9M6.4 9.9c.6-.6 1.3-.9 2.1-1M15.2 8.7c.4-.3.9-.5 1.4-.5" strokeWidth="1.5" />
        </>
    ),
    timer: (
        <>
            <circle cx="12" cy="13.5" r="7.5" />
            <path d="M12 9.5v4l2.8 1.8M9 2.5h6" />
        </>
    ),
    misere: <path d="M7 4v15M3.5 15.5 7 19l3.5-3.5M17 20V5M13.5 8.5 17 5l3.5 3.5" />,
    // Кріт - контурний силует згори (як "Каміння"): тіло з носиком, кігті віялом, задні лапки, хвостик.
    mole: (
        <>
            <path d="M12 3c-.8 1.3-1.3 2.7-1.6 4C8.5 8 7.3 10.5 7.3 13.7c0 3.8 2 6.6 4.7 6.6s4.7-2.8 4.7-6.6c0-3.2-1.2-5.7-3.1-6.7C13.3 5.7 12.8 4.3 12 3z" />
            <path d="M7.8 9.3l-3.11 -2.18M7.5 10.2l-3.72 -0.79M7.35 11.1l-3.74 0.66M7.3 12l-3.22 2.01M16.2 9.3l3.11 -2.18M16.5 10.2l3.72 -0.79M16.65 11.1l3.74 0.66M16.7 12l3.22 2.01" strokeWidth="1.4" />
            <path d="M7.5 16.4l-2.25 0.4M7.8 17.3l-1.93 1.21M8.3 18.1l-1.31 1.87M16.5 16.4l2.25 0.4M16.2 17.3l1.93 1.21M15.7 18.1l1.31 1.87" strokeWidth="1.4" />
            <path d="M12 20.3c0 .7-.3 1.3-.9 1.6" strokeWidth="1.7" />
        </>
    ),
};

// Малюнки іконок різні за розміром і зміщенням у квадраті 24×24 - кожну вирівнюємо до центру й
// однакового візуального розміру (виміряно за межами малюнка); товщина лінії лишається 2.2.
// Усі, крім стрілок (гравітація, мізер), ще на 15% більші - так краще читаються на кнопці.
const MOD_FIT: Record<Modifier | "none", [number, number, number]> = { none: [-0.98,-0.98,1.082], vanish: [-2.41,-2.41,1.201], gravity: [0.71,0.71,0.941], stones: [-1.59,-3.74,1.135], timer: [-0.66,-0.41,1.056], mole: [-3.46,-4.03,1.288], misere: [0.13,0.13,0.99] };

export const ModIcon = ({ id, size = 22 }: { id: Modifier | null; size?: number }) => {
    const [tx, ty, k] = MOD_FIT[id ?? "none"];
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" overflow="visible">
            <g transform={`translate(${tx} ${ty}) scale(${k})`} strokeWidth={(2.2 / k).toFixed(2)}>
                {MOD_ICON_PATHS[id ?? "none"]}
            </g>
        </svg>
    );
};

export const ModButton = styled.button`
    ${gameButtonCss("xs", { square: true })}
    position: relative;
    flex-shrink: 0;
    ${tipCss}

    && {
        --gb-c: 13px;
        width: 46px;
        height: 46px;
        min-height: 46px;
        padding: 0;
    }

    /* -1px: центр світлої частини кнопки, без нижнього бортика основи. */
    & > svg {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, calc(-50% - 1px));
    }

    /* Неактивна іконка: приглушуємо саму кнопку (світла вуаль і бліда іконка), а не через filter
       на всій кнопці - інакше блідим ставав би й тултіп. */
    &&:disabled {
        filter: none;
    }

    &:disabled > svg {
        opacity: 0.35;
    }

    &:disabled::before {
        content: "";
        position: absolute;
        inset: calc(-1 * var(--gb-c, 0px));
        border-radius: 12px;
        background: rgba(255, 250, 240, 0.5);
        pointer-events: none;
    }

    @media (max-width: 480px) {
        && {
            width: 42px;
            height: 42px;
            min-height: 42px;
        }
    }
`;

export const ModRow = styled.div`
    display: flex;
    flex-wrap: nowrap;
    gap: 6px;

    @media (max-width: 480px) {
        gap: 4px;
    }
`;

// Іконки дій (заново, гра з другом, бустери) - круглі кремові кнопки.
const ACTION_ICONS = {
    restart: (
        <>
            <path d="M20 12a8 8 0 1 1-2.6-5.9" />
            <path d="M20 4v5h-5" />
        </>
    ),
    friend: (
        <>
            <circle cx="8" cy="8" r="3" />
            <circle cx="16.5" cy="8" r="3" />
            <path d="M2.5 19c.5-3.2 2.7-5 5.5-5s5 1.8 5.5 5" />
            <path d="M13.5 14.4c.9-.3 1.9-.4 3-.4 2.8 0 5 1.8 5.5 5" />
        </>
    ),
    hint: (
        <>
            <path d="M9 18h6M10 21h4" />
            <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3z" />
        </>
    ),
    undo: (
        <>
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
        </>
    ),
    pause: (
        <>
            <rect x="6.5" y="5" width="3.5" height="14" rx="1" />
            <rect x="14" y="5" width="3.5" height="14" rx="1" />
        </>
    ),
    // Сніжинка: шість рівних променів під 60°, на кожному - гілочка.
    freeze: (
        <>
            <path d="M12 2L12 22M20.66 7L3.34 17M20.66 17L3.34 7" />
            <path d="M14.12 19.32L12 17.2L9.88 19.32M6.72 17.5L7.5 14.6L4.6 13.82M4.6 10.18L7.5 9.4L6.72 6.5M9.88 4.68L12 6.8L14.12 4.68M17.28 6.5L16.5 9.4L19.4 10.18M19.4 13.82L16.5 14.6L17.28 17.5" strokeWidth="1.8" />
        </>
    ),
};

export const ActionIcon = ({ id }: { id: keyof typeof ACTION_ICONS }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ACTION_ICONS[id]}
    </svg>
);

export const RoundButton = styled.button`
    ${gameButtonCss("lg", { square: true })}
    position: relative;
    flex-shrink: 0;
    border-radius: 50%;
    ${tipCss}

    && {
        --gb-c: 13px;
        width: 52px;
        height: 52px;
        min-height: 52px;
    }

    & > svg {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
    }

    @media (max-width: 480px) {
        && {
            --gb-c: 11px;
            width: 44px;
            height: 44px;
            min-height: 44px;
        }
    }
`;

// Вибір модифікатора - одна кнопка з поточним (іконка + назва) і список під нею (назва й опис
// кожного) - іконки самі по собі не впізнаються, а на телефоні тултіпів немає. Ширина кнопки стала
// (--mod-w / --mod-w-sm), тож ряд не змінюється ні від вибору, ні від поля.
type MenuAlign = "left" | "right" | "auto";

export const ModPicker = styled.div`
    position: relative;
    min-width: 0;
`;

const ModToggle = styled.button<{ $desc?: boolean }>`
    ${gameButtonCss("sm")}

    && {
        --gb-c: 12px;
        justify-content: flex-start;
        gap: 6px;
        width: var(--mod-w, 204px);
        max-width: 100%;
        min-height: var(--mod-h, 40px);
        padding: 0 4px;
        font-size: 14px;
    }

    & > span {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: left;
    }

    & > svg:last-child {
        transition: transform 0.15s ease;
    }

    &[aria-expanded="true"] > svg:last-child {
        transform: rotate(180deg);
    }

    /* З описом: назва й під нею дрібніше - що робить модифікатор (як у розкритому списку). */
    ${({ $desc }) =>
        $desc &&
        css`
            && {
                width: var(--mod-w, 260px);
                /* Тонші бортики - два рядки вміщаються у висоту інших кнопок смуги. */
                --gb-c: 8px;
                gap: 10px;
                height: var(--mod-h, 46px);
                min-height: 0;
                padding: 0 8px 0 10px;
            }

            & > span {
                display: flex;
                flex-direction: column;
                gap: 0;
                line-height: 1.1;
            }

            & > span > * {
                overflow: hidden;
                text-overflow: ellipsis;
            }

            & > span > b {
                font-size: 15px;
            }

            & > span > small {
                font-size: 12px;
                font-weight: 600;
                opacity: 0.85;
            }

            @media (max-width: 480px) {
                && {
                    width: var(--mod-w-sm, 188px);
                    height: var(--mod-h-sm, 46px);
                }
            }
        `}

    @media (max-width: 480px) {
        && {
            --gb-c: 11px;
            width: var(--mod-w-sm, 188px);
            min-height: var(--mod-h-sm, 36px);
            font-size: 13px;
        }
    }
`;

const ModMenu = styled.div<{ $align: MenuAlign }>`
    position: absolute;
    top: calc(100% + 18px);
    ${({ $align }) => ($align === "left" ? "left: -12px;" : "right: -12px;")}
    z-index: 40;
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: min(300px, calc(100vw - 32px));
    padding: 6px;
    border-radius: 16px;
    background: #fff7e8;
    box-shadow:
        inset 0 0 0 2px #ebcb98,
        0 14px 30px rgba(73, 48, 31, 0.25);

    /* "auto" (смуга над полем): коли "Модифікатор" іде другим рядком від лівого краю - список теж
       від лівого краю. На телефоні список прив'язаний до всієї смуги (ModPicker там static) -
       по її правому краю, щоб не виходив за екран. */
    @media (max-width: 760px) {
        ${({ $align }) => ($align === "auto" ? "right: auto; left: -12px;" : "")}
    }

    @media (max-width: 480px) {
        ${({ $align }) => ($align === "auto" ? "top: calc(100% + 8px); right: 0; left: auto;" : "")}
    }
`;

const ModOption = styled.button`
    display: grid;
    grid-template-columns: 34px 1fr;
    align-items: center;
    column-gap: 10px;
    padding: 7px 8px;
    border: none;
    border-radius: 11px;
    background: transparent;
    color: #49301f;
    font: inherit;
    text-align: left;
    cursor: pointer;

    & > i {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border-radius: 10px;
        background: #f6e2b8;
        box-shadow: inset 0 -2px 0 #ebcb98;
    }

    b {
        display: block;
        font-size: 14px;
        font-weight: 800;
    }

    small {
        display: block;
        margin-top: 2px;
        color: #7a5530;
        font-size: 12px;
        line-height: 1.25;
    }

    em {
        margin-left: 6px;
        padding: 1px 6px;
        border-radius: 999px;
        background: #ffe3a3;
        color: #7a4a0c;
        font-size: 11px;
        font-style: normal;
        font-weight: 800;
        white-space: nowrap;
    }

    @media (hover: hover) {
        &:hover {
            background: #fbeccd;
        }
    }

    &[aria-checked="true"] {
        background: #f3dcae;
    }

    &[aria-checked="true"] > i {
        background: #815532;
        box-shadow: none;
        color: #fff7e8;
    }

    &:focus-visible {
        outline: 3px solid #1fb3d9;
        outline-offset: -3px;
    }
`;

const Chevron = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 9l7 7 7-7" />
    </svg>
);

export const ModifierSelect = ({
    value,
    options,
    weekly,
    labelledBy,
    menuAlign = "right",
    withDesc = false,
    plain = false,
    onPick,
}: {
    value: Modifier | null;
    options: Modifier[];
    weekly?: Modifier;
    labelledBy: string;
    menuAlign?: MenuAlign;
    // Під назвою на кнопці - опис вибраного модифікатора (гра з новини).
    withDesc?: boolean;
    // Світла кнопка, як бустери (гра з новини), замість коричневої "вибраної".
    plain?: boolean;
    onPick: (m: Modifier | null) => void;
}) => {
    const t = useT();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const name = (m: Modifier | null) => (m ? t(`modifier_${m}`) : t("modifier_none"));
    const desc = (m: Modifier | null) => (m ? t(`modifierDesc_${m}`) : t("modifierNoneDesc"));

    // Список закривається кліком поза ним і Escape.
    useEffect(() => {
        if (!open) return;
        const onDown = (event: PointerEvent) => {
            if (!ref.current?.contains(event.target as Node)) setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("pointerdown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <ModPicker ref={ref}>
            <ModToggle
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-labelledby={`${labelledBy} ${labelledBy}-value`}
                // Вибраний модифікатор (і "Без модифікатора" теж) - коричнева кнопка, як вибраний рівень бота
                // (у грі з новини - світла, як бустери).
                data-selected={plain ? undefined : true}
                $desc={withDesc}
                title={withDesc ? `${name(value)} · ${desc(value)}` : undefined}
                onClick={() => setOpen((v) => !v)}
            >
                <ModIcon id={value} size={20} />
                {withDesc ? (
                    <span id={`${labelledBy}-value`}>
                        <b>{name(value)}</b>
                        <small>{desc(value)}</small>
                    </span>
                ) : (
                    <span id={`${labelledBy}-value`}>{name(value)}</span>
                )}
                <Chevron />
            </ModToggle>
            {open && (
                <ModMenu role="menu" aria-labelledby={labelledBy} $align={menuAlign}>
                    {[null, ...options].map((m) => (
                        <ModOption
                            key={m ?? "none"}
                            type="button"
                            role="menuitemradio"
                            aria-checked={value === m}
                            onClick={() => {
                                onPick(m);
                                setOpen(false);
                            }}
                        >
                            <i>
                                <ModIcon id={m} size={20} />
                            </i>
                            <span>
                                <b>
                                    {name(m)}
                                    {m && m === weekly && <em>{t("weeklyModifierTag")}</em>}
                                </b>
                                <small>{desc(m)}</small>
                            </span>
                        </ModOption>
                    ))}
                </ModMenu>
            )}
        </ModPicker>
    );
};
