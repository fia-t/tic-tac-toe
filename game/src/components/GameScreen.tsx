"use client";
import { watchRewardedAd } from "@game/lib/adTracking";
import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { winterIce, winterIcicleRight } from "@game/components/themeFxStyles";
import { buttonTone, gameButtonCss } from "@game/components/GameButton";
import { ActionIcon, DifficultySelect, ModIcon, ModPicker, ModifierSelect, RoundButton, tipCss } from "@game/components/GameOptions";
import { FriendGameModal } from "@game/components/FriendGameModal";
import { InfoTip } from "@game/components/HomeScreen";
import { levelTitle } from "@game/lib/campaignContent";
import { MoveTimerBar, freezeMoveTimer, frozenTurns, pauseMoveTimer, resetMoveTimerBoosts, useMoveTimerBoost } from "@game/components/MoveTimer";
import { assetUrl } from "@game/lib/assets";
import { trackEvent } from "@game/lib/firebase";
import { isEmbed, isHalloweenEmbed } from "@game/lib/embed";
import { BoosterKind, FREE_SKIN_ID, boosterStock, equipSkin, getEquippedSkinId, getLiveEventSkinId, spendBooster, useWallet } from "@game/lib/wallet";
import { ScoreCobweb } from "@game/components/HalloweenDecor";
import { FullscreenButton, SettingsButton } from "@game/components/SettingsPanel";
import { useT } from "@game/lib/i18n";
import { DIFFICULTIES, Difficulty, setDifficulty, useDifficulty } from "@game/lib/difficulty";
import { dayOfYear, endDailyRun, nextRunId, setDailyRun, useDailyRun } from "@game/lib/daily";
import { GameModeKey, MODIFIERS_BY_MODE, Modifier, TIMER_SECONDS, effectiveModifier, setModifier, useModifierChoice, weeklyModifier } from "@game/lib/modifiers";

// Екран партії проти бота, спільний для 3×3, 5×5 і гіга-поля (на сайті - так само, як у грі з новини):
// - смуга над полем: "Назад", "Заново", "Гра з другом", складність бота й модифікатор (списки),
//   рахунок, підказка ("Твій хід", "Бот думає..."), повний екран і налаштування; у виклику дня чи
//   рівні кампанії - плашка з ціллю замість виборів;
// - плитки поля - колонкою зліва від поля (на телефоні - у смузі);
// - поле, праворуч від нього (або під ним на вузькому екрані) - бустери "Скасувати хід" і "Підказка";
//   у партії з таймером - ще "Пауза таймера" й "Заморозка часу".

// Rewarded-реклама агрегатора: є - бустер після безкоштовної спроби можна взяти за рекламу.
export const RewardedAdContext = createContext<(() => Promise<boolean>) | undefined>(undefined);

// Екран партії на сайті: кнопка-стрілка "Назад" у смузі повертає туди, звідки прийшли (замість шапки).
export const GameHomeContext = createContext<(() => void) | null>(null);

export const GameRoot = styled.div<{ $timer?: boolean; $embed?: boolean; $phone?: boolean; $compact?: boolean; $switch?: boolean; $sitePhone?: boolean }>`
    /* Ширина поля - і рядків над/під ним. Запас по висоті - шапка, смуга виборів, рядок рахунку
       й ряд бустерів під полем; від 800px бустери збоку, тож запас менший. Верхня межа 628px -
       щоб колонка бустерів вміщалась у 760px. Рядок таймера над полем забирає ще --timer-h. */
    --timer-h: ${({ $timer }) => ($timer ? "38px" : "0px")};
    /* Рядок "святкова / класична тема" під полем (під час івенту). */
    --switch-h: ${({ $switch }) => ($switch ? "34px" : "0px")};
    --board-w: min(100%, 628px, max(280px, calc(100dvh - 236px - var(--timer-h) - var(--switch-h))));
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding-bottom: 16px;

    @media (min-width: 800px) {
        --board-w: min(100%, 628px, max(280px, calc(100dvh - 184px - var(--timer-h) - var(--switch-h))));
    }

    /* Гра в новині й екран партії на сайті: шапки немає - поле займає всю висоту iframe (чи екрана
       в повноекранному режимі) і може бути ширшим за колонку; збоку лишається місце під бустери. */
    ${({ $embed }) =>
        $embed &&
        css`
            /* До 800px смуга у два рядки, бустери - рядком під полем: усе це вміщається по висоті
               iframe без прокрутки. */
            --board-w: min(100%, max(200px, calc(100dvh - 252px - var(--timer-h) - var(--switch-h))));

            /* Знизу - лише відступ контейнера (12px): інакше вміст на кілька пікселів вищий за
               iframe і з'являлась смуга прокрутки. */
            padding-top: 10px;
            padding-bottom: 4px;
            /* Тултіпи - більші, ніж на сайті, і кольору рахунку. */
            --tip-fs: 16px;
            --tip-pad: 6px 12px;
            --tip-bg: var(--score-bg, #fff6e6);
            --tip-ink: #5b3f22;
            --tip-shadow: 0 0 0 2px rgba(139, 101, 60, 0.35), 0 6px 16px rgba(40, 20, 10, 0.3);
            /* Список модифікаторів - теж крупніше. */
            --mod-menu-w: 340px;
            --mod-menu-b: 16px;
            --mod-menu-s: 14px;

            @media (min-width: 800px) {
                --board-w: min(calc(100vw - 180px), 1000px, max(280px, calc(100dvh - 84px - var(--timer-h) - var(--switch-h))));
            }

            /* Великий екран (повний екран): смуга й рахунок більші - під них більше висоти. */
            @media (min-width: 1200px) and (min-height: 800px) {
                --board-w: min(calc(100vw - 180px), 1000px, max(280px, calc(100dvh - 98px - var(--timer-h) * 1.2 - var(--switch-h))));
                --tip-fs: 21px;
                --tip-pad: 8px 16px;
            }
        `}

    /* Гра в новині на телефоні: над полем два ряди, під полем плитки поля й модифікатор. */
    ${({ $phone }) =>
        $phone &&
        css`
            --board-w: min(100%, max(200px, calc(100dvh - 276px - var(--timer-h) - var(--switch-h))));
            gap: 10px;
            /* По вертикальному центру екрана (AppColumn - flex-колонка). */
            margin-block: auto;
        `}

    /* Телефон на сайті й порталі: над полем шапка (44), рядок виборів (52) і рахунок (44), під полем -
       панель дій (~110) і відступи; колонка на всю висоту - панель дій притиснута донизу. */
    ${({ $sitePhone }) =>
        $sitePhone &&
        css`
            --board-w: min(100%, max(220px, calc(100dvh - 318px - var(--timer-h) - var(--switch-h))));
            flex: 1 0 auto;
            gap: 10px;
            padding-top: 8px;
            padding-bottom: 10px;
        `}

    /* Гра в новині на телефоні в самому iframe (~370×190): поле зліва на всю висоту, кнопки - справа. */
    ${({ $compact }) =>
        $compact &&
        css`
            --board-w: min(calc(100dvh - 16px), calc(100vw - 196px));
            flex-direction: row;
            justify-content: center;
            align-items: center;
            gap: 10px;
            padding: 0;
            margin-block: auto;
        `}
`;

// Смуга над полем: дії, а далі групи "Поле", "Бот", "Модифікатор" - без видимих підписів, "?" - у
// куточку групи.
// Кнопки вирівняні по низу. На широкому екрані - один рядок; від 760px
// і вужче "Бот" і "Модифікатор" завжди другим рядком, щоб розкладка не залежала від поля.
const Bar = styled.div<{ $embed?: boolean; $site?: boolean }>`
    position: relative;
    z-index: 25;
    display: flex;
    align-items: flex-end;
    flex-wrap: nowrap;
    gap: 8px 6px;
    width: 100%;
    min-width: 0;
    /* Кнопка модифікатора з описом - вужча, щоб уся смуга вміщалась в один рядок. */
    --mod-w: 220px;

    @media (max-width: 760px) {
        flex-wrap: wrap;
    }

    @media (max-width: 480px) {
        gap: 6px 4px;
    }

    /* Гра в новині: усі кнопки однієї висоти (46px) і по верхньому краю; під вибором поля -
       статус "чий хід" (і таймер). */
    ${({ $embed, $site }) =>
        $embed &&
        css`
            align-items: flex-start;
            --mod-h: 46px;
            --mod-h-sm: 46px;

            /* Ширший екран: смуга на всю ширину iframe з однаковими боковими відступами 48px;
               "Заново" - біля лівого краю, повний екран - біля правого, плитки поля, рахунок і
               модифікатор - між ними по центру (вільне місце порівну зліва й справа, EmbedSide). */
            @media (min-width: 761px) {
                /* Сітка: "Заново" | модифікатор | рахунок | підказка ходу | повний екран. Колонки
                   модифікатора й підказки рівні (1fr) - рахунок рівно по центру; коли місця бракує,
                   вони стискаються до свого min-width, і рахунок трохи зсувається. */
                display: grid;
                grid-template-columns: auto 1fr auto 1fr auto;
                column-gap: 48px;
                width: 100vw;
                padding: 0 48px;
                /* Модифікатор - сталої ширини (як із "Без модифікатора"), щоб смуга не "дихала" при
                   перемиканні; довший опис - з трикрапкою, повністю - при наведенні. */
                --mod-w: 188px;
                /* Список модифікаторів - одразу під кнопкою, щільніший і ширший (менше переносів),
                   щоб на 5×5 (шість модифікаторів) вміщався в iframe без прокрутки. */
                --mod-menu-gap: 2px;
                --mod-menu-x: 0px;
                --mod-menu-w: 400px;
                --mod-opt-pad: 4px 8px;
                /* Текст - якомога більший, але так, щоб список вміщався у висоту iframe. */
                --mod-menu-b: clamp(15px, 3.7dvh, 20px);
                --mod-menu-s: clamp(13px, 3.1dvh, 17px);
                --mod-menu-max-h: calc(100dvh - 70px);
            }

            /* Сайт до 1100px: у кнопці модифікатора лише іконка (назва й опис - у списку), підказка
               ходу й рахунок вужчі; до 1000px - ще менші проміжки. Так уся смуга в один рядок. */
            ${$site &&
            css`
                @media (min-width: 761px) and (max-width: 1099px) {
                    --mod-w: 64px;
                    --mod-label: none;
                    --hint-min: 200px;
                    --score-min: 0;
                }

                @media (min-width: 761px) and (max-width: 999px) {
                    column-gap: 16px !important;
                }
            `}

            /* Iframe до 1100px: менші проміжки - модифікатор і підказка ходу вміщаються повністю.
               На сайті кнопок у смузі більше (додому, гра з другом, бот, налаштування) - до 1400px. */
            @media (min-width: 761px) and (max-width: ${$site ? 1399 : 1099}px) {
                column-gap: 24px;
            }

            /* Вужчий iframe (до 940px): менші відступи - усе в один рядок. */
            @media (min-width: 761px) and (max-width: 939px) {
                column-gap: 24px;
                padding: 0 24px;
            }

            /* Повний екран: смуга на всю ширину (з урахуванням zoom), модифікатор - ширший, як із
               таймером. */
            @media (min-width: 1200px) and (min-height: 800px) {
                zoom: 1.3;
                width: calc(100vw / 1.3);
                --mod-w: 264px;
                --mod-menu-max-h: calc(100dvh / 1.3 - 70px);
                /* zoom збільшує й тултіпи - ділимо, щоб були як біля поля. */
                --tip-fs: 16px;
                --tip-pad: 6px 12px;
            }
        `}
`;

const BarGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
`;

// Складність бота: назва рівня без "..." - група не стискається, інакше стрілка вилазить
// за кнопку (повний екран, вузька смуга). Стискається модифікатор - у нього є "...".
const DiffGroup = styled(BarGroup)`
    flex: none;
`;

const BarGroupRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;

    @media (max-width: 480px) {
        gap: 4px;
    }
`;

// "Заново" і "Гра з другом" у смузі - менші за бустери біля поля.
const BarActions = styled(BarGroupRow)<{ $embed?: boolean }>`
    /* Гра в новині: "Заново" відокремлене від вибору поля. */
    ${({ $embed }) =>
        $embed &&
        css`
            @media (max-width: 760px) {
                margin-right: 12px;
            }

            @media (max-width: 480px) {
                margin-right: 2px;
            }
        `}

    && ${RoundButton} {
        width: 42px;
        height: 42px;
        min-height: 42px;
    }

    @media (max-width: 480px) {
        && ${RoundButton} {
            width: 40px;
            height: 40px;
            min-height: 40px;
        }
    }
`;

// Гра в новині: ліва ("Заново" і плитки поля) і права (модифікатор і повний екран) частини смуги.
const EmbedSide = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;

    /* Ширший екран: частини "розчиняються" в смузі. Якщо місця бракує - стискаються лише
       підказка ходу й модифікатор (з трикрапкою), решта - свого розміру. */
    @media (min-width: 761px) {
        display: contents;

        & > * {
            flex-shrink: 0;
        }

        & > :has([aria-haspopup="menu"]) {
            flex-shrink: 1;
        }
    }
`;

// Перед рахунком і перед повним екраном - вільне місце порівну: "Заново" біля лівого краю,
// повний екран - біля правого, рахунок, підказка ходу й модифікатор - між ними по центру.
const autoLeft = css`
    flex-shrink: 0;

    @media (min-width: 761px) {
        margin-left: auto;
    }

    /* Повний екран (zoom 1.3): 4px + проміжок 48px = 52px, на екрані - 68px. */
    @media (min-width: 1200px) and (min-height: 800px) {
        margin-left: 4px;
    }
`;

// Частини смуги лише для вузького (телефон) чи лише для ширшого екрана.
const NarrowOnly = styled.div`
    display: contents;

    @media (min-width: 761px) {
        display: none;
    }
`;

const WideOnly = styled.div`
    display: none;

    @media (min-width: 761px) {
        display: contents;
    }
`;

// Ширший екран: модифікатор - одразу після "Заново", впритул до рахунку.
const ModSlot = styled.div`
    justify-self: end;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    min-width: 140px;
    max-width: 100%;
`;

// Ширший екран: рахунок - рівно по центру; не стискається (стискаються модифікатор і підказка).
const ScoreMid = styled(BarGroup)`
    min-width: var(--score-min, max-content);
`;

// Ширший екран: підказка ходу - перед повним екраном, сталої ширини під найдовший переклад
// ("Du bist dran - in einem beliebigen offenen Feld"), щоб смуга не стрибала.
const HintSlot = styled.div`
    justify-self: start;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 332px;
    min-width: var(--hint-min, 240px);
`;

const StatusSlot = styled.div`
    display: flex;
    height: 46px;
    align-items: center;
    ${winterIcicleRight}

    /* Плашка - кольору рахунку, завжди висотою на два рядки; довга фраза переноситься, коротка -
       більшим шрифтом (розмір підбирає GameScreen). */
    && > * {
        flex: 1 1 auto;
        justify-content: center;
        min-width: 0;
        height: 46px;
        overflow: hidden;
        background: var(--score-bg, #fff6e6);
        color: #0f6f8c;
        text-shadow: none;
        text-align: center;
        line-height: 1.1;
        ${winterIce()}
    }
`;

// Ширший екран: плитки поля - колонкою зліва від поля, строго під "Заново" (left рахує
// GameScreen) і по вертикальному центру поля. Підказка - праворуч: назва й правило перемоги.
const TileColumn = styled.div<{ $site?: boolean }>`
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 14px;
    z-index: 2;

    /* На сайті плитки трохи більші, ніж у новині. */
    & > button {
        width: ${({ $site }) => ($site ? 74 : 60)}px;
        height: ${({ $site }) => ($site ? 74 : 60)}px;
    }

    /* Підказка - праворуч від плитки, у два рядки: назва й правило перемоги. */
    & > button::after {
        left: calc(100% + 12px);
        top: 50%;
        transform: translateY(-50%);
        width: max-content;
        max-width: 300px;
        white-space: pre-line;
        text-align: left;
    }

    /* Повний екран: плитки більші - під збільшену смугу. */
    @media (min-width: 1200px) and (min-height: 800px) {
        gap: 18px;

        & > button::after {
            max-width: 400px;
        }

        & > button {
            width: ${({ $site }) => ($site ? 94 : 78)}px;
            height: ${({ $site }) => ($site ? 94 : 78)}px;
        }
    }

    @media (max-width: 760px) {
        display: none;
    }
`;

// Повний екран (і на сайті - налаштування) - у смузі останніми, кнопки розміром як "Заново".
const BarFull = styled(BarGroup)`
    ${autoLeft}
    flex-direction: row;
    gap: 10px;

    && ${RoundButton} {
        width: 42px;
        height: 42px;
        min-height: 42px;
    }

    /* Кнопка біля правого краю - тултіп вирівняний по її правому краю, щоб не обрізався. */
    && ${RoundButton}::after {
        left: auto;
        right: 0;
        transform: none;
    }

    @media (max-width: 480px) {
        && ${RoundButton} {
            width: 40px;
            height: 40px;
            min-height: 40px;
        }
    }
`;

const BarLabel = styled.div<{ $hidden?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 18px;
    font: 800 11px/1 var(--font-body);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--bar-ink, #7a5530);
    white-space: nowrap;

    /* Підписів над кнопками не видно (лишаються для екранних читачів). */
    ${({ $hidden }) =>
        $hidden &&
        css`
            position: absolute;
            width: 1px;
            height: 1px;
            min-height: 0;
            overflow: hidden;
            clip-path: inset(50%);
        `}
`;

// Маленький "?" у верхньому правому куті гіга-поля, кнопок бота й модифікатора.
const CornerTip = styled.span`
    position: absolute;
    top: -6px;
    right: -6px;
    z-index: 3;
    display: flex;

    button {
        width: 15px;
        height: 15px;
        margin: 0;
        font-size: 10px;
        line-height: 15px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
    }
`;

// Кнопка модифікатора з "?" у куті. Без position: на телефоні список модифікаторів розкривається
// від ширшого блоку (ModPicker static), тож "?" - у потоці з від'ємними відступами.
const CornerBox = styled.div`
    display: flex;
    align-items: flex-start;
    min-width: 0;

    & > ${CornerTip} {
        position: relative;
        top: auto;
        right: auto;
        flex-shrink: 0;
        margin: -6px -6px 0 -9px;
    }
`;

// Гра в новині: статус "чий хід" - під вибором поля. contain: inline-size - довгий статус
// виходить праворуч за групу, але не розширює її (смуга не стрибає зі зміною тексту).
const BarStatus = styled.div`
    contain: inline-size;
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 4px;
    white-space: nowrap;

    /* Рядок статусу - посередині між першим рядком смуги і полем (по 12px зверху й знизу:
       плашка нижча за рядок на 4px). */
    @media (min-width: 761px) {
        gap: 40px;
        margin: 8px 0 4px;
    }

    /* Ширина групи - як у плиток поля; статус і таймер не стискаються, а виходять праворуч
       (подвійний клас - сильніше за flex самого рядка статусу). */
    && > * {
        flex-shrink: 0;
    }
`;

// Таймер ходу - над полем, рівно шириною поля.
const RowTimer = styled.div`
    width: var(--board-w);

    & > div {
        width: 100%;
    }

    /* Повний екран: підпис і секунди крупніші. */
    @media (min-width: 1200px) and (min-height: 800px) {
        & > div {
            font-size: 17px;
        }
    }
`;

// Хелловінська гра в новині: павутина в лівому верхньому куті модифікатора, з-під лівого краю
// звисає павучок.
const ModWeb = styled.div`
    position: relative;
    min-width: 0;
`;

// Аватар Кварті в рахунку гри з новини.
const QuartyFace = styled.img`
    display: block;
    flex-shrink: 0;
    width: 29px;
    height: 24px;
    object-fit: contain;
`;

const PushRight = styled.div<{ $embed?: boolean }>`
    margin-left: auto;
    display: flex;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 8px 10px;
    min-width: 0;

    /* Широкий екран: смуга на всю ширину (від логотипа до шестерні), один рядок. "Бот" і
       "Модифікатор" стають прямими елементами смуги з margin-left: auto - вільне місце ділиться
       порівну між проміжками поле-бот і бот-модифікатор, модифікатор - по правому краю. */
    @media (min-width: 761px) {
        display: contents;

        & > ${BarGroup} {
            margin-left: ${({ $embed }) => ($embed ? "0" : "auto")};
            flex-shrink: ${({ $embed }) => ($embed ? 0 : 1)};
        }
    }

    @media (max-width: 760px) {
        flex-basis: 100%;
        margin-left: 0;
    }

    /* На телефоні "Бот" і "Модифікатор" - одним рядком: у кнопці модифікатора лише іконка
       (назва й опис - у списку). */
    @media (max-width: 480px) {
        flex-wrap: nowrap;
        gap: 6px 10px;
        --mod-w-sm: 64px;

        [aria-haspopup]:not([data-diff]) > span {
            display: none;
        }

        ${ModPicker} {
            position: static;
        }
    }
`;

const ModeTile = styled.button`
    position: relative;
    flex-shrink: 0;
    width: 46px;
    height: 46px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    --gb-c: 0px;
    ${tipCss}

    img {
        display: block;
        width: 100%;
        height: 100%;
        transition:
            transform 0.12s ease,
            filter 0.12s ease;
    }

    @media (hover: hover) {
        &:hover img {
            transform: translateY(-1px);
            filter: drop-shadow(0 3px 5px rgba(73, 48, 31, 0.14));
        }
    }

    /* Вибране поле - не більше за інші, лише яскраве світіння. */
    &[aria-pressed="true"] img {
        filter: drop-shadow(0 0 1.5px rgba(215, 248, 255, 1)) drop-shadow(0 0 5px rgba(31, 179, 217, 0.95));
    }

    /* Онлайн посеред партії: інші поля приглушені й не натискаються (тултіп пояснює чому). */
    &:disabled {
        cursor: not-allowed;
    }

    &:disabled img,
    &:disabled:hover img {
        opacity: 0.45;
        transform: none;
        filter: grayscale(0.6);
    }

    &:focus-visible {
        outline: 3px solid #1fb3d9;
        outline-offset: 2px;
        border-radius: 12px;
    }

    @media (max-width: 480px) {
        width: 44px;
        height: 44px;
    }
`;


// Ціль виклику дня / рівня кампанії і кнопка "Звичайна гра".
const GoalBanner = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    /* Займає все місце, що лишилось (у смузі - колонку виборів бота й модифікатора), висотою як
       кнопки поруч; розмір тексту підбирає GameScreen, щоб ціль уміщалась. */
    flex: 1 1 0;
    min-width: 0;
    /* Не нижча за кнопки поруч; довша ціль - до трьох рядків читабельного розміру. */
    min-height: 46px;
    padding: 4px 4px 4px 16px;
    border-radius: 24px;
    background: linear-gradient(155deg, #ffe3a3, #f5c96a);
    box-shadow: 3px 3px 6px rgba(101, 72, 35, 0.25);
    color: #4a2c0c;
    font-size: 17px;
    font-weight: 800;

    & > span {
        flex: 1 1 auto;
        min-width: 0;
        max-height: 3.45em;
        overflow: hidden;
        line-height: 1.15;
    }
`;

const LeaveButton = styled.button`
    ${gameButtonCss("sm")}
    ${buttonTone("wood")}
    flex-shrink: 0;

    && {
        --gb-c: 13px;
        min-height: 38px;
        padding: 0 4px;
    }

    /* Ширший екран: лише хрестик (назва - у тултіпі), щоб цілі лишалось більше місця. */
    & > svg {
        display: none;
    }

    @media (min-width: 761px) {
        ${tipCss}
        position: relative;

        && {
            width: 38px;
            padding: 0;
        }

        & > span {
            display: none;
        }

        & > svg {
            display: block;
        }

        &::after {
            left: auto;
            right: calc(-1 * var(--gb-c, 0px));
            transform: none;
        }
    }
`;

// Рахунок - над полем; підказка - в одному ряду з ним, одразу після нього (на сайті - лише на
// телефоні: на ширшому екрані обидва в смузі).
export const ScoreTop = styled.div<{ $wide?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    /* Не вужчий за 560px (якщо екран дозволяє): на низькому, але широкому екрані (iframe у новині)
       поле маленьке, і підказка в плашці інакше розсипалась би у вузький стовпчик. */
    width: max(var(--board-w), min(100%, 560px));

    /* Гра в новині: ширше за телефон рядок до 720px, і статус завжди в один рядок. */
    ${({ $wide }) =>
        $wide &&
        css`
            /* Гра в новині: у рядку лише статус - по центру над полем. */
            justify-content: center;

            @media (min-width: 561px) {
                width: max(var(--board-w), min(100%, 720px));

                & > * {
                    white-space: nowrap;
                }
            }

            /* zoom множить і ширину - ділимо, щоб рядок лишався шириною поля. */
            @media (min-width: 1200px) and (min-height: 800px) {
                zoom: 1.2;
                width: calc(max(var(--board-w), min(100%, 720px)) / 1.2);
            }
        `}

    /* На телефоні рахунок і статус - в одному рядку сталої висоти (до двох рядків підказки),
       щоб поле стояло вище й не стрибало, коли статус змінюється. */
    @media (max-width: 560px) {
        gap: 8px;
        min-height: 40px;
    }
`;

// Перемикач святкова / класична тема під полем - як посилання, щоб не сперечатися з кнопками гри.
const ThemeSwitch = styled.button`
    height: 26px;
    padding: 0 10px;
    border: none;
    background: none;
    color: #0f6f8c;
    font: 800 15px/26px var(--font-heading);
    text-decoration: underline dotted rgba(15, 111, 140, 0.55);
    text-underline-offset: 4px;
    cursor: pointer;

    &:hover {
        color: #0a5a72;
        text-decoration-style: solid;
    }
`;

// Сайт: на ширшому екрані рахунок і підказка - у смузі (крім виклику дня й рівня кампанії).
const NarrowScoreTop = styled(ScoreTop)<{ $inBar?: boolean }>`
    @media (min-width: 761px) {
        ${({ $inBar }) => ($inBar ? "display: none;" : "")}
    }
`;

export const ScorePill = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    max-width: 100%;
    padding: 4px 14px;
    border-radius: 14px;
    border: 2px solid rgba(139, 101, 60, 0.35);
    box-shadow:
        inset 2px 2px 4px rgba(101, 72, 35, 0.35),
        inset -1px -1px 2px rgba(255, 255, 255, 0.35);
    background: var(--score-bg, rgba(255, 246, 230, 0.55));
    color: #5b3f22;
    font-size: 14px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    ${winterIce()}

    b {
        color: #b32f1c;
    }

    span {
        white-space: nowrap;
    }

    span:last-child {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* На телефоні довге ім'я обрізається, щоб статусу лишалось місце в тому ж рядку. */
    @media (max-width: 560px) {
        flex-shrink: 1;
        min-width: 0;
        max-width: 48%;
        gap: 6px;
        padding: 4px 10px;
    }
`;

// Гра в новині: рахунок - у смузі на місці вибору бота, висотою як кнопки поруч.
const BarScore = styled(ScorePill)`
    min-height: 46px;

    @media (min-width: 761px) {
        gap: 8px;
        padding: 4px 14px;
        font-size: 16px;
    }

    @media (max-width: 560px) {
        max-width: none;
    }
`;

const lineIn = keyframes`
    from { opacity: 0; transform: translateY(3px); }
    to { opacity: 1; transform: none; }
`;

const turnPulse = keyframes`
    0%, 100% { box-shadow: 0 0 0 0 rgba(15, 111, 140, 0.4); }
    50% { box-shadow: 0 0 0 6px rgba(15, 111, 140, 0); }
`;

// Підказка-статус: статичний рядок; новий текст плавно проявляється (key = текст).
// Хід гравця ($mine) - бірюзова плашка з легкою пульсацією, щоб "Твій хід" було видно одразу.
// Висота однакова з плашкою і без - рядок рахунку не стрибає.
export const TurnLine = styled.div<{ $mine?: boolean; $pill?: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1 1 auto;
    min-width: 0;
    min-height: 32px;
    color: #0f6f8c;
    font-size: 16px;
    font-weight: 800;
    line-height: 1.2;
    text-shadow: 0 1px 0 rgba(255, 250, 235, 0.8);
    animation: ${lineIn} 0.35s ease both;

    ${({ $mine }) =>
        $mine &&
        css`
            flex: 0 1 auto;
            padding: 3px 14px 3px 4px;
            border-radius: 18px;
            background: linear-gradient(180deg, #1a8aa8, #0f6f8c);
            color: #fff7e8;
            text-shadow: 0 1px 1px rgba(5, 40, 45, 0.35);
            animation:
                ${lineIn} 0.35s ease both,
                ${turnPulse} 1.8s ease-in-out 0.35s infinite;
        `}

    @media (max-width: 560px) {
        font-size: 14px;
        line-height: 1.15;
    }

    ${({ $mine }) =>
        !$mine &&
        css`
            color: #8a6a48;
        `}

    /* Хелловінська гра в новині: простий текст губився на нічному небі - кремова плашка,
       як у рахунку. */
    ${({ $mine, $pill }) =>
        !$mine &&
        $pill &&
        css`
            flex: 0 1 auto;
            padding: 5px 14px;
            border-radius: 18px;
            background: #fff6e6;
            color: #5b3f22;
            text-shadow: none;
        `}

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

// Значок фішки гравця (з поточного скіна) в плашці "Твій хід".
export const TurnMark = styled.span`
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #fff7e8;

    img {
        width: 21px;
        height: 21px;
        object-fit: contain;
    }
`;

const Cross = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d="M5 5l14 14M19 5 5 19" stroke="#e8452f" strokeWidth="4" strokeLinecap="round" />
    </svg>
);

// Обгортка має ширину поля (без неї поле стискалось би до нуля); колонка бустерів висить за її
// правим краєм - саме поле лишається по центру, на одній лінії з рядками над ним. Якщо збоку
// місця немає (вузький екран) - бустери рядком під полем по його правому краю.
export const BoardHolder = styled.div`
    position: relative;
    width: var(--board-w);

    & > :first-child {
        width: 100%;
    }
`;

const Boosters = styled.div<{ $site?: boolean }>`
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 8px;

    /* На сайті кнопки бустерів трохи більші, ніж у новині. */
    ${({ $site }) =>
        $site &&
        css`
            @media (min-width: 481px) {
                && ${RoundButton} {
                    --gb-c: 14px;
                    width: 60px;
                    height: 60px;
                    min-height: 60px;
                }

                && ${RoundButton} > svg {
                    width: 28px;
                    height: 28px;
                }
            }
        `}

    @media (min-width: 800px) {
        position: absolute;
        left: calc(100% + 24px);
        top: 50%;
        transform: translateY(-50%);
        flex-direction: column;
        gap: 14px;
        padding: 0;
        /* Вище за бічний банер (SideBox, z-index 5) - тултіпи праворуч від кнопок лягають поверх реклами. */
        z-index: 6;

        /* Тултіпи колонки - праворуч від кнопок. */
        & > button::after {
            left: calc(100% + var(--gb-c, 0px) + 6px);
            top: 50%;
            transform: translateY(-50%);
        }
    }
`;

// Телефон на сайті й порталі (до 560px): угорі лише навігація, вибори партії - один рядок-кнопка,
// що відкриває аркуш знизу; рахунок і статус - над полем; бустери й "Заново" - у панелі під пальцем.
const SitePhoneHead = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    min-width: 0;

    && ${RoundButton} {
        --gb-c: 9px;
        width: 44px;
        height: 44px;
        min-height: 44px;
    }

    @media (max-width: 380px) {
        gap: 5px;

        && ${RoundButton} {
            --gb-c: 8px;
            width: 40px;
            height: 40px;
            min-height: 40px;
        }
    }
`;

const SitePhoneTitle = styled.h1`
    /* Вузький телефон: назва дрібніше, щоб уміщалась поруч із чотирма кнопками. */
    @media (max-width: 380px) {
        && {
            font-size: 17px;
        }
    }

    flex: 1 1 auto;
    min-width: 0;
    margin: 0 0 0 4px;
    color: #4a2c0c;
    font: 900 19px/1.2 var(--font-heading);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const SetupChip = styled.button`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 52px;
    padding: 0 14px 0 8px;
    border: 2px solid #ebcb98;
    border-radius: 16px;
    background: var(--score-bg, #fff7e8);
    box-shadow: inset 0 -3px 0 #ebcb98;
    color: #4a2c0c;
    font: 800 16px/1.2 var(--font-body);
    text-align: left;
    cursor: pointer;

    img {
        width: 36px;
        height: 36px;
        object-fit: contain;
        flex-shrink: 0;
    }

    span {
        flex: 1 1 auto;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    &:disabled {
        cursor: default;
        opacity: 0.85;
    }

    &:disabled > svg {
        display: none;
    }
`;

const SitePhoneStatus = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 44px;

    && ${ScorePill} {
        max-width: 52%;
        min-height: 44px;
        padding: 4px 12px;
        font-size: 16px;
    }

    && ${ScorePill} b {
        font-size: 20px;
    }

    && ${TurnLine} {
        font-size: 17px;
    }
`;

const SitePhoneDock = styled.div`
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    gap: 2px;
    width: 100%;
    margin-top: auto;
    padding: 10px 4px 8px;
    border: 2px solid #ebcb98;
    border-radius: 22px;
    background: var(--score-bg, #fff7e8);
    box-shadow: 0 -2px 12px rgba(74, 44, 12, 0.08);
`;

const DockItem = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    min-width: 0;

    && ${RoundButton} {
        --gb-c: 11px;
        width: 54px;
        height: 54px;
        min-height: 54px;
    }

    && ${RoundButton} > svg {
        width: 26px;
        height: 26px;
    }

    /* Підпис дублює aria-label кнопки - для читачів екрана прихований. Один рядок: панель
       не росте в висоту на жодній мові. */
    & > span {
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #5b3f22;
        font: 800 13px/1.15 var(--font-body);
        text-align: center;
    }
`;

const SheetBackdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: flex-end;
    background: rgba(40, 24, 8, 0.55);
`;

const SheetPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    max-height: calc(100dvh - 24px);
    overflow-y: auto;
    padding: 10px 16px calc(16px + env(safe-area-inset-bottom, 0px));
    border-radius: 26px 26px 0 0;
    background: #fff7e8;
    color: #4a2c0c;
    font: 500 16px/1.35 var(--font-body);
    box-shadow: 0 -8px 24px rgba(40, 20, 10, 0.25);

    h2 {
        margin: 0;
        font: 900 22px/1.2 var(--font-heading);
    }

    h3 {
        margin: 0 0 8px;
        color: #7a5530;
        font: 800 15px/1.2 var(--font-body);
    }

    /* Низький екран (до 620px): щільніше, щоб аркуш і тут вміщався без прокрутки. */
    @media (max-height: 620px) {
        gap: 8px;

        h3 {
            margin-bottom: 5px;
        }

        img {
            width: 34px;
            height: 34px;
        }
    }
`;

const SheetHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
`;

const SheetClose = styled.button`
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 50%;
    background: #f6e2b8;
    color: #4a2c0c;
    cursor: pointer;
`;

const SheetGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
`;

const SheetChoice = styled.button<{ $on: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 48px;
    padding: 6px 4px;
    border: ${({ $on }) => ($on ? "3px solid #0f6f8c" : "2px solid #ebcb98")};
    border-radius: 14px;
    background: ${({ $on }) => ($on ? "#e6f4f8" : "#fff")};
    color: #4a2c0c;
    font: ${({ $on }) => ($on ? 900 : 800)} 16px/1.15 var(--font-body);
    cursor: pointer;

    img {
        width: 46px;
        height: 46px;
        object-fit: contain;
    }

    &:disabled {
        opacity: 0.45;
        cursor: default;
    }
`;

const SheetNote = styled.p`
    margin: 6px 0 0;
    color: #5b3f22;
    font-size: 14px;
    font-weight: 600;
`;

// Модифікатори - сіткою по два (іконка й назва), опис вибраного - під сіткою: так аркуш з усіма
// виборами вміщається на екран телефона без прокрутки на будь-якій мові.
const SheetMods = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
`;

const SheetChip = styled.button<{ $on: boolean }>`
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    min-height: 46px;
    padding: 4px 10px;
    border: ${({ $on }) => ($on ? "3px solid #0f6f8c" : "2px solid #ebcb98")};
    border-radius: 14px;
    background: ${({ $on }) => ($on ? "#e6f4f8" : "#fff")};
    color: #4a2c0c;
    font: ${({ $on }) => ($on ? 900 : 800)} 15px/1.12 var(--font-body);
    text-align: left;
    cursor: pointer;

    & > svg {
        flex-shrink: 0;
        color: ${({ $on }) => ($on ? "#0f6f8c" : "#7a5530")};
    }

    & > span {
        min-width: 0;
        overflow-wrap: anywhere;
    }

    /* Модифікатор тижня - помаранчева мітка в куточку (повна назва - в описі під сіткою). */
    em {
        position: absolute;
        top: -7px;
        right: 6px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #e8662f;
        box-shadow: 0 0 0 2px #fff7e8;
    }

    &:disabled {
        opacity: 0.45;
        cursor: default;
    }
`;

const SheetModNote = styled.p`
    min-height: calc(2 * 1.3em);
    margin: 8px 0 0;
    color: #5b3f22;
    font: 600 14px/1.3 var(--font-body);

    b {
        color: #4a2c0c;
        font-weight: 800;
    }

    em {
        display: inline-block;
        margin-right: 6px;
        padding: 0 8px;
        border-radius: 10px;
        background: #e8662f;
        color: #fff;
        font: 900 12px/1.6 var(--font-body);
        font-style: normal;
    }
`;

const SheetDone = styled.button`
    ${gameButtonCss("lg")}
    ${buttonTone("green")}
    width: 100%;
`;

// Гра в новині на телефоні (до 760px, зазвичай на весь екран після заставки "Грати"): шириною поля.
// Перший ряд - повний екран, рахунок, "Заново"; другий - бустери й статус ходу.
const PhoneBar = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: var(--board-w);

    && ${RoundButton} {
        flex-shrink: 0;
        width: 44px;
        height: 44px;
        min-height: 44px;
    }
`;

const PhoneRow = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
`;

// Рахунок і статус ходу - на все місце, що лишилось у ряду.
const PhoneFill = styled.div`
    flex: 1 1 0;
    min-width: 0;
    display: flex;

    && > * {
        flex: 1 1 auto;
        justify-content: center;
        min-width: 0;
        max-width: none;
    }
`;

const PhoneBoosters = styled.div`
    display: flex;
    gap: 14px;
`;

// Під полем: плитки поля рядком і модифікатор на всю ширину (список розкривається вгору).
const PhoneOptions = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: var(--board-w);
    --mod-w: 100%;
    --mod-w-sm: 100%;

    & ${ModeTile} {
        flex: 1 1 0;
        width: auto;
        max-width: 72px;
        height: auto;
        aspect-ratio: 1;
    }

    & ${BarGroup}, & ${CornerBox}, & ${ModWeb}, & ${ModPicker} {
        flex: 1 1 auto;
        width: 100%;
    }

    & [role="menu"] {
        top: auto;
        bottom: calc(100% + 8px);
        left: 0;
        right: auto;
        width: 100%;
    }
`;

// Компактна розкладка (iframe новини на телефоні): колонка праворуч від поля, усе дрібніше.
const CompactSide = styled.div`
    display: flex;
    flex-direction: column;
    gap: 7px;
    flex: 0 1 172px;
    min-width: 0;
    --mod-h: 36px;
    --mod-h-sm: 36px;
    --mod-w: 46px;
    --mod-w-sm: 46px;
    --mod-label: none;

    & ${PhoneRow} {
        justify-content: space-between;
        gap: 6px;
    }

    && ${RoundButton}, & ${ModeTile} {
        flex-shrink: 0;
        width: 36px;
        height: 36px;
        min-height: 36px;
    }

    && ${RoundButton} svg {
        width: 18px;
        height: 18px;
    }

    & ${ScorePill} {
        min-height: 32px;
        padding: 2px 8px;
        gap: 5px;
        font-size: 13px;
    }

    & ${TurnLine} {
        min-height: 32px;
        font-size: 13px;
    }

    /* Підказки "?" біля модифікатора тут немає місця. */
    & ${CornerTip} {
        display: none;
    }

    /* Модифікатор - лише іконка рівно по центру кнопки (без стрілки списку). */
    && [aria-haspopup="menu"] {
        justify-content: center;
        padding: 0;
    }

    & [aria-haspopup="menu"] > svg:last-child {
        display: none;
    }

    /* Список модифікаторів - поверх усього iframe (у смузі висотою ~190px він не вміщається під кнопкою). */
    & [role="menu"] {
        position: fixed;
        inset: 6px;
        width: auto;
        max-height: none;
        --mod-opt-pad: 3px 6px;
    }
`;

// Таймер ходу в компактній розкладці - на ширину колонки, дрібнішим шрифтом.
const CompactTimer = styled.div`
    display: flex;
    align-items: center;
    min-height: 32px;

    & > div {
        width: 100%;
        font-size: 11px;
    }
`;

const PhoneTiles = styled.div`
    display: flex;
    justify-content: center;
    gap: 14px;
`;

const Badge = styled.span<{ $free: boolean; $stock?: boolean }>`
    position: absolute;
    top: calc(-1 * var(--gb-c, 13px) - 4px);
    right: calc(-1 * var(--gb-c, 13px) - 6px);
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    border-radius: 999px;
    background: #2f8a3e;
    color: #fff7e8;
    font: 700 12px/20px var(--font-body);
    text-align: center;
    box-shadow: 0 0 0 2px #fff7e8;
    pointer-events: none;

    /* Бустери із запасу (подарунок дня) - бірюзовий ярлик "×N". */
    ${({ $stock }) => ($stock ? "background: #0f6f8c;" : "")}

    /* Безкоштовні спроби скінчились - помаранчевий ярлик "AD": наступна - за рекламу. */
    ${({ $free }) =>
        $free
            ? ""
            : `
        top: calc(-1 * var(--gb-c, 13px) - 6px);
        right: calc(-1 * var(--gb-c, 13px) - 12px);
        height: 22px;
        padding: 0 6px;
        border-radius: 7px;
        background: linear-gradient(180deg, #ffc247, #f08a1c);
        color: #fff;
        font: 800 13px/22px var(--font-heading);
        letter-spacing: 0.5px;
        text-shadow: 0 1px 0 rgba(140, 60, 0, 0.7);
        box-shadow: 0 0 0 2px #fff7e8, 0 2px 4px rgba(73, 48, 31, 0.3);
        transform: rotate(8deg);
    `}
`;

// Відлік на кнопці діючого бустера: секунди паузи (помаранчеві) або ходи заморозки (сині).
const BoosterCount = styled.span<{ $kind: BoosterKind }>`
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    font: 800 16px/1 var(--font-heading);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: ${({ $kind }) => ($kind === "pause" ? "#c46f0c" : "#0f6f8c")};
`;

// "Результат" після кінця партії - невеликий бірюзовий текст у рядку рахунку, по правому краю поля.
export const ResultLink = styled.button`
    flex-shrink: 0;
    margin-left: auto;
    padding: 4px 2px;
    border: none;
    background: none;
    color: var(--link-ink, #0f6f8c);
    font: 800 15px/1.2 var(--font-body);
    white-space: nowrap;
    cursor: pointer;

    @media (hover: hover) {
        &:hover {
            color: var(--link-ink-hover, #0a5068);
        }
    }

    &:focus-visible {
        outline: 3px solid #1fb3d9;
        outline-offset: 2px;
        border-radius: 6px;
    }
`;

const ALL_FREE: Record<BoosterKind, boolean> = { undo: true, hint: true, pause: true, freeze: true };

// Бустери: кожен один раз за партію безкоштовно, далі - із запасу (подарунок дня; не в новині),
// а коли запасу немає - за rewarded-рекламу (якщо вона є).
// Гра в новині на екрані до 760px - окрема телефонна розкладка (PhoneBar/PhoneOptions), а в самому
// iframe новини на телефоні (низький, ~370×190) - компактна (CompactSide). Вибір - у JS, а не CSS:
// так у DOM лише одна смуга, і навчання підсвічує саме її (data-tour).
const useMedia = (query: string, enabled: boolean): boolean => {
    const [match, setMatch] = useState(() => enabled && typeof window !== "undefined" && window.matchMedia(query).matches);
    useEffect(() => {
        if (!enabled) return;
        const list = window.matchMedia(query);
        const update = () => setMatch(list.matches);
        update();
        list.addEventListener("change", update);
        return () => list.removeEventListener("change", update);
    }, [query, enabled]);
    return enabled && match;
};
const usePhoneEmbed = (embed: boolean): boolean => useMedia("(max-width: 760px)", embed);
export const useEmbedCompact = (embed: boolean): boolean => useMedia("(max-width: 760px) and (max-height: 479px)", embed);

const useBoosters = (resetKey: unknown) => {
    const rewarded = useContext(RewardedAdContext);
    const wallet = useWallet();
    const withStock = !isEmbed();
    const stock = (kind: BoosterKind) => (withStock ? boosterStock(kind, wallet) : 0);
    const [free, setFree] = useState<Record<BoosterKind, boolean>>(ALL_FREE);
    useEffect(() => {
        setFree(ALL_FREE);
        resetMoveTimerBoosts();
    }, [resetKey]);
    const use = async (kind: BoosterKind, apply: () => void) => {
        if (free[kind]) {
            setFree((f) => ({ ...f, [kind]: false }));
            trackEvent("booster_used", { booster: kind, paid: false });
            apply();
            return;
        }
        if (stock(kind) > 0 && spendBooster(kind)) {
            trackEvent("booster_used", { booster: kind, paid: false, stock: true });
            apply();
            return;
        }
        if (!rewarded) return;
        if (await watchRewardedAd("booster", rewarded, { booster: kind })) {
            trackEvent("booster_used", { booster: kind, paid: true });
            apply();
        }
    };
    return { free, stock, canBuy: Boolean(rewarded), use };
};

export type BoosterProps = {
    canUndo: boolean;
    canHint: boolean;
    onUndo: () => void;
    onHint: () => void;
    // Нова партія - безкоштовні спроби знову доступні.
    resetKey: unknown;
};

type GameScreenProps = {
    mode: GameModeKey;
    onSetMode: (mode: GameModeKey) => void;
    onRestart: () => void;
    onRoomReady: (roomId: string) => void;
    onBeforeFriendOpen?: () => Promise<boolean>;
    score: { ai: number; human: number };
    humanName: string | null;
    status: string;
    // Зараз хід гравця - статус показується помітною плашкою.
    myTurn?: boolean;
    // Фішка гравця в поточному скіні - для плашки "Твій хід" (без неї - класичний хрестик).
    turnMarker?: string;
    // Підказка новачку замість статусу (перша партія, ще жодного ходу).
    firstHint?: boolean;
    over: boolean;
    timer?: number | null;
    board: React.ReactNode;
    boosters: BoosterProps;
    // Повторно відкрити вікно результату (якщо його закрили).
    onShowResult?: () => void;
    // Шар поверх поля (монетка "хто ходить першим").
    overlay?: React.ReactNode;
    // Онлайн-кімната (гра з другом, швидкий матч): той самий екран, але поле й модифікатор - з кімнати,
    // без бота, складності й бустерів.
    online?: OnlineScreen;
};

export type OnlineScreen = {
    modifier: Modifier | null;
    // Зміна поля / модифікатора (в обох гравців одразу). Немає - рейтинговий матч, вибору немає.
    onChange?: (mode: GameModeKey, modifier: Modifier | null) => void;
    // Посеред партії поле й модифікатор не міняє ніхто.
    locked: boolean;
    // Ім'я ліворуч на табло (замість "Бот").
    leftName: string;
    // Кнопка "Заново": реванш після партії.
    restart: { label: string; onClick: () => void; disabled: boolean };
};

const FRIEND_MODE: Record<GameModeKey, "3x3" | "5x5" | "9x9"> = { traditional: "3x3", five: "5x5", difficult: "9x9" };
// Коротка назва поля в рядку виборів на телефоні.
const BOARD_SHORT: Record<GameModeKey, string> = { traditional: "3×3", five: "5×5", difficult: "9×9" };
const MODE_TILES: { id: GameModeKey; img: string; label: "modeClassic" | "modeFive" | "tooltipHard" }[] = [
    { id: "traditional", img: "images/traditional.png", label: "modeClassic" },
    { id: "five", img: "images/game-5x5.png", label: "modeFive" },
    { id: "difficult", img: "images/difficult.png", label: "tooltipHard" },
];

export const GameScreen: React.FC<GameScreenProps> = ({
    mode,
    onSetMode,
    onRestart,
    onRoomReady,
    onBeforeFriendOpen,
    score,
    humanName,
    status,
    myTurn = false,
    turnMarker,
    firstHint = false,
    over,
    timer,
    board,
    boosters,
    onShowResult,
    overlay,
    online,
}) => {
    const t = useT();
    const goHome = useContext(GameHomeContext);
    const dailyRun = useDailyRun();
    // В онлайн-кімнаті виклику дня / кампанії немає, навіть якщо їх відкрито в меню.
    const run = online ? null : dailyRun;
    const difficulty = useDifficulty();
    const choice = useModifierChoice();
    const activeModifier = online ? online.modifier : effectiveModifier(mode, choice);
    // Онлайн: посеред партії (і в рейтинговому матчі) поле й модифікатор не змінюються.
    const setupLocked = Boolean(online && (online.locked || !online.onChange));
    const lockTip = online && !online.onChange ? t("roomSetupRated") : t("roomSetupLocked");
    // У грі з новини акції "модифікатор тижня" немає - мітку в списку не показуємо.
    const weekly = isEmbed() ? undefined : weeklyModifier();
    // У новині замість довгої підказки першого ходу - короткий статус "Твій хід" (у вузькому iframe - один рядок).
    const showFirstHint = firstHint && !isEmbed();
    const [friendOpen, setFriendOpen] = useState(false);
    const booster = useBoosters(boosters.resetKey);
    const timerBoost = useMoveTimerBoost();
    const quick = run === null;
    const openFriend = async () => {
        trackEvent("friend_modal_open", { from: mode });
        if (onBeforeFriendOpen && !(await onBeforeFriendOpen())) return;
        setFriendOpen(true);
    };

    // У виклику дня "Заново" недоступне, поки партію не зіграно (виклик не переграється);
    // рівень кампанії можна почати знову будь-коли.
    const restartDisabled = online ? online.restart.disabled : run?.kind === "daily" && !run.finished;
    const restart = () => {
        if (online) return online.restart.onClick();
        if (run?.kind === "campaign") {
            setDailyRun({ ...run, id: nextRunId(), finished: false });
            trackEvent("campaign_level_started", { level: run.template.id });
            return;
        }
        onRestart();
    };

    const pickDifficulty = (level: Difficulty) => {
        if (level === difficulty) return;
        trackEvent("select_difficulty", { difficulty: level });
        setDifficulty(level);
    };
    const pickModifier = (value: Modifier | null) => {
        if (value === activeModifier) return;
        if (online) return void (setupLocked || online.onChange?.(mode, value));
        trackEvent("select_modifier", { modifier: value ?? "none", mode });
        setModifier(value);
    };
    const pickMode = (target: GameModeKey) => {
        if (target === mode) return;
        if (online) {
            if (setupLocked) return;
            // Модифікатор, якого на новому полі немає, - знімаємо.
            return void online.onChange?.(target, activeModifier && MODIFIERS_BY_MODE[target].includes(activeModifier) ? activeModifier : null);
        }
        trackEvent("select_mode", { mode: target });
        onSetMode(target);
    };

    const embed = isEmbed();
    // Під час івенту - під полем перемикач між святковою темою і "Класикою" (навіть поки івент іде).
    // Тема змінює фішки, тож після перемикання - нова партія (інакше на полі змішались би скіни).
    const liveEventSkin = getLiveEventSkinId();
    const equippedSkin = getEquippedSkinId(useWallet());
    const themeSwitch =
        !embed && !online && liveEventSkin && (equippedSkin === liveEventSkin || equippedSkin === FREE_SKIN_ID)
            ? equippedSkin === liveEventSkin
                ? { label: t("eventThemeBack"), target: FREE_SKIN_ID }
                : { label: t("eventThemeGo"), target: liveEventSkin }
            : null;
    const switchTheme = () => {
        if (!themeSwitch) return;
        trackEvent("event_theme_switch", { to: themeSwitch.target === FREE_SKIN_ID ? "classic" : "event" });
        equipSkin(themeSwitch.target);
        restart();
    };
    const phone = usePhoneEmbed(embed);
    const compact = useEmbedCompact(embed);
    // Телефон на сайті й порталі (не новина): окрема розкладка з аркушем виборів партії.
    const sitePhone = useMedia("(max-width: 560px)", !embed && goHome !== null);
    const [setupOpen, setSetupOpen] = useState(false);
    const sheetClose = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!setupOpen) return;
        sheetClose.current?.focus();
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && setSetupOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [setupOpen]);
    // Розкладка гри з новини: у новині й на сайті (стрілка "Назад" замість шапки).
    const wide = embed || goHome !== null;
    const restartLabel = online ? online.restart.label : over ? t("playAgain") : t("restart");
    const homeButton = goHome && (
        <RoundButton type="button" data-tour="menu" onClick={goHome} aria-label={t("back")} data-tip={t("back")}>
            <ActionIcon id="back" />
        </RoundButton>
    );
    const restartButton = (
        <RoundButton type="button" onClick={restart} disabled={restartDisabled} aria-label={restartLabel} data-tip={restartLabel}>
            <ActionIcon id="restart" />
        </RoundButton>
    );
    // У грі з новини (iframe) - лише партія з ботом, без онлайн-кімнат.
    const friendButton = !isEmbed() && !online && (
        <RoundButton type="button" onClick={() => void openFriend()} aria-label={t("playWithFriend")} data-tip={t("playWithFriend")}>
            <ActionIcon id="friend" />
        </RoundButton>
    );
    // На сайті ліворуч - "Назад", повний екран і налаштування, праворуч - гра з другом і "Заново";
    // у новині - як було: дії ліворуч, повний екран праворуч.
    const actionButtons = goHome ? (
        <>
            {homeButton}
            <FullscreenButton round />
            <SettingsButton round />
        </>
    ) : (
        <>
            {homeButton}
            {restartButton}
            {friendButton}
        </>
    );


    const goal = run
        ? run.kind === "campaign"
            ? `${t("campaignLevel", { n: String((run.level ?? 0) + 1) })}: ${levelTitle(run.template)}`
            : `${t("dailyBadge", { n: String(dayOfYear()) })}: ${t(`daily_${run.template.id}` as Parameters<typeof t>[0])}`
        : "";

    const BOOSTER_NAME: Record<BoosterKind, string> = { undo: t("boosterUndo"), hint: t("boosterHint"), pause: t("boosterPause"), freeze: t("boosterFreeze") };
    // Поки діє пауза чи заморозка - на кнопці бустера замість іконки зворотний відлік.
    const countdown: Partial<Record<BoosterKind, string>> = {
        pause: timerBoost.paused ? t("timerSecs", { n: String(timerBoost.pauseLeft) }) : undefined,
        freeze: timerBoost.frozenNow ? String(frozenTurns(timerBoost)) : undefined,
    };
    const boosterButton = (kind: BoosterKind, enabled: boolean, onUse: () => void) => {
        const name = BOOSTER_NAME[kind];
        const running = countdown[kind];
        if (running)
            return (
                <RoundButton type="button" aria-live="polite" aria-label={`${name}: ${running}`} data-tip={name}>
                    <BoosterCount $kind={kind}>{running}</BoosterCount>
                </RoundButton>
            );
        const isFree = booster.free[kind];
        const stock = booster.stock(kind);
        const available = isFree || stock > 0 || booster.canBuy;
        // "AD" - і там, де реклами ще немає (сайт): видно, що наступна спроба буде за рекламу. У новині - як було.
        const showBadge = available || !embed;
        return (
            <RoundButton
                type="button"
                disabled={!enabled || !available}
                onClick={() => void booster.use(kind, onUse)}
                aria-label={`${name} (${isFree || stock > 0 ? t("boosterFree") : t("boosterForAd")})`}
                data-tip={name}
            >
                <ActionIcon id={kind} />
                {showBadge && (
                    <Badge $free={isFree || stock > 0} $stock={!isFree && stock > 0} aria-hidden="true">
                        {isFree ? "1" : stock > 0 ? `×${stock}` : "AD"}
                    </Badge>
                )}
            </RoundButton>
        );
    };

    // Список модифікаторів: у новині на ширшому екрані модифікатор зліва - список від його лівого краю.
    const modSelect = (menuAlign: "left" | "auto") => (
        <ModifierSelect
            value={activeModifier}
            options={MODIFIERS_BY_MODE[mode]}
            weekly={online ? undefined : weekly}
            labelledBy="bar-mod"
            menuAlign={menuAlign}
            withDesc
            plain={wide}
            disabled={setupLocked}
            disabledTip={lockTip}
            onPick={pickModifier}
        />
    );
    const turnLine = (
        <TurnLine
            key={showFirstHint ? "first" : timerBoost.expired ? "expired" : status}
            $mine={myTurn && !over && !timerBoost.expired}
            $pill={isHalloweenEmbed()}
            role="status"
            aria-live="polite"
        >
            {myTurn && !over && !timerBoost.expired && <TurnMark>{turnMarker ? <img src={turnMarker} alt="" /> : <Cross />}</TurnMark>}
            {showFirstHint ? t("firstMoveHint") : timerBoost.expired && !over ? t("timerExpired") : status}
            {/* Сайт: "Результат" - у плашці підказки. */}
            {goHome && over && quick && onShowResult && (
                <ResultLink type="button" onClick={onShowResult}>
                    {t("showResult")}
                </ResultLink>
            )}
        </TurnLine>
    );
    // У новині частини смуги - в обгортках EmbedSide (рахунок між ними по центру), на сайті - без них.
    const embedSide = (node: React.ReactNode) => (wide ? <EmbedSide>{node}</EmbedSide> : node);
    const hasTimer = timer !== null && timer !== undefined;
    const timerRunning = hasTimer && !over;

    // У новині частини лише для телефону чи лише для ширшого екрана; на сайті - завжди.
    const narrowOnly = (node: React.ReactNode) => (wide ? <NarrowOnly>{node}</NarrowOnly> : node);
    // Рахунок у смузі (на ширшому екрані - по центру; у новині на телефоні - у другому рядку
    // смуги): у новині - з Кварті, на сайті - бот і ім'я гравця.
    const scorePill = embed ? (
        <BarScore>
            <QuartyFace src={assetUrl("icons/mentor.a5788621.avif")} alt="" />
            <span>{t("quarty")}</span>
            <b>{score.ai}</b>
            <span>—</span>
            <b>{score.human}</b>
            <span>{t("you")}</span>
        </BarScore>
    ) : (
        <BarScore>
            <span>{online ? online.leftName : t("ai")}</span>
            <b>{score.ai}</b>
            <span>—</span>
            <b>{score.human}</b>
            <span>{humanName ?? t("player")}</span>
        </BarScore>
    );
    // Складність бота (сайт) - список, як у модифікатора.
    const diffSelect = goHome && !online && (
        <DiffGroup>
            <BarLabel id="bar-bot" $hidden>
                {t("barBot")}
            </BarLabel>
            <DifficultySelect value={difficulty} labelledBy="bar-bot" onPick={pickDifficulty} />
        </DiffGroup>
    );
    const modGroup = (menuAlign: "left" | "auto") => (
        <BarGroup>
            <BarLabel id="bar-mod" $hidden>
                {t("modifierLabel")}
            </BarLabel>
            <CornerBox>
                {isHalloweenEmbed() ? (
                    <ModWeb>
                        {modSelect(menuAlign)}
                        <ScoreCobweb />
                    </ModWeb>
                ) : (
                    modSelect(menuAlign)
                )}
                <CornerTip>
                    <InfoTip text={t("infoModGame")} />
                </CornerTip>
            </CornerBox>
        </BarGroup>
    );
    // Підказка ходу в новині (ширший екран): найбільший шрифт, з яким текст вміщається в плашку.
    const hintBox = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const box = hintBox.current;
        if (!box) return;
        const fit = () => {
            const line = box.firstElementChild as HTMLElement | null;
            if (!line || !line.clientHeight) return;
            for (let size = 21; size >= 13; size--) {
                line.style.fontSize = `${size}px`;
                if (line.scrollHeight <= line.clientHeight && line.scrollWidth <= line.clientWidth) break;
            }
        };
        fit();
        window.addEventListener("resize", fit);
        return () => window.removeEventListener("resize", fit);
    }, [status, showFirstHint, timerBoost.expired, over, myTurn]);
    // Підказка на плитці поля в новині: назва й правило перемоги (замість окремого "?").
    // Онлайн 9×9 - не "9 малих полів", а 5 в ряд на всьому полі.
    const tileTip = (tile: (typeof MODE_TILES)[number]) =>
        online && tile.id === "difficult" ? `9×9\n${t("boardRule_online9")}` : `${t(tile.label)}\n${t(`boardRule_${tile.id}`)}`;
    // Колонка плиток поля - строго під кнопкою "Заново" (по центру кнопки).
    const tileColumn = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const column = tileColumn.current;
        if (!column) return;
        const place = () => {
            const restart = document.querySelector('[data-tour="bar"] button');
            const holder = column.parentElement;
            if (!restart || !holder) return;
            const r = restart.getBoundingClientRect();
            column.style.left = `${Math.round(r.left + r.width / 2 - holder.getBoundingClientRect().left - column.offsetWidth / 2)}px`;
        };
        place();
        window.addEventListener("resize", place);
        return () => window.removeEventListener("resize", place);
    }, [mode, timerRunning]);

    // Ціль виклику: найбільший шрифт (17-13px), з яким вона вміщається в три рядки плашки.
    // Плашка є і в широкій, і у вузькій розкладці - підбираємо в кожній.
    useLayoutEffect(() => {
        const texts = [...document.querySelectorAll<HTMLElement>("[data-goal-text]")];
        if (!texts.length) return;
        const fit = () => {
            for (const text of texts) {
                for (let size = 17; size >= 13; size--) {
                    text.style.fontSize = `${size}px`;
                    if (text.scrollHeight <= text.clientHeight) break;
                }
            }
        };
        // Перераховуємо, коли змінюється ширина плашки і коли довантажився шрифт.
        const observer = new ResizeObserver(fit);
        for (const text of texts) observer.observe(text.parentElement ?? text);
        void document.fonts?.ready.then(fit);
        return () => observer.disconnect();
    }, [goal]);
    // Виклик дня / рівень кампанії: ціль і "Звичайна гра" - на місці виборів бота й модифікатора.
    const goalBanner = (
        <GoalBanner>
            <span data-goal-text title={goal}>
                {goal}
            </span>
            <LeaveButton type="button" onClick={endDailyRun} aria-label={t("dailyLeave")} data-tip={t("dailyLeave")}>
                <span>{t("dailyLeave")}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                </svg>
            </LeaveButton>
        </GoalBanner>
    );

    const mainButtons = (
        <>
            {boosterButton("undo", boosters.canUndo, boosters.onUndo)}
            {boosterButton("hint", boosters.canHint, boosters.onHint)}
        </>
    );
    const timerButtons = (
        <>
            {boosterButton("pause", boosters.canHint && !timerBoost.firstFree && !timerBoost.paused && !timerBoost.frozenNow, pauseMoveTimer)}
            {boosterButton("freeze", boosters.canHint && !timerBoost.firstFree && !timerBoost.frozenNow, freezeMoveTimer)}
        </>
    );

    // Плитка поля; онлайн посеред партії - вимкнена (вибране поле лишається яскравим).
    const renderTile = (tile: (typeof MODE_TILES)[number]) => (
        <ModeTile
            key={tile.id}
            type="button"
            aria-pressed={mode === tile.id}
            aria-label={t(tile.label)}
            data-tip={setupLocked && mode !== tile.id ? lockTip : tileTip(tile)}
            disabled={setupLocked && mode !== tile.id}
            onClick={() => pickMode(tile.id)}
        >
            <img src={assetUrl(tile.img)} alt="" />
        </ModeTile>
    );
    const modeTiles = MODE_TILES.map(renderTile);

    // Гра в новині на телефоні, у самому iframe новини: поле зліва; справа - "Заново", бустери й
    // повний екран, рахунок, статус ходу (з таймером - смуга таймера), плитки поля й модифікатор.
    if (compact)
        return (
            <GameRoot $embed $compact>
                <BoardHolder data-tour="board">
                    {board}
                    {overlay}
                </BoardHolder>
                <CompactSide data-tour="bar">
                    <PhoneRow>
                        <RoundButton type="button" onClick={restart} aria-label={restartLabel} data-tip={restartLabel}>
                            <ActionIcon id="restart" />
                        </RoundButton>
                        {mainButtons}
                        <FullscreenButton round nudge={mode !== "traditional"} />
                    </PhoneRow>
                    <PhoneFill>{scorePill}</PhoneFill>
                    <PhoneFill>
                        {timerRunning ? (
                            <CompactTimer>
                                <MoveTimerBar fraction={timer} seconds={TIMER_SECONDS} boosts />
                            </CompactTimer>
                        ) : (
                            turnLine
                        )}
                    </PhoneFill>
                    <PhoneRow role="group" aria-label={t("barBoard")}>
                        {modeTiles}
                        {modGroup("left")}
                    </PhoneRow>
                </CompactSide>
            </GameRoot>
        );

    // Гра в новині на телефоні: над полем - повний екран, рахунок і "Заново", під ними бустери й
    // статус ходу; під полем - плитки поля й модифікатор.
    if (phone)
        return (
            <GameRoot $timer={timerRunning} $embed $phone>
                <PhoneBar data-tour="bar">
                    <PhoneRow>
                        <FullscreenButton round />
                        <PhoneFill>{scorePill}</PhoneFill>
                        <RoundButton type="button" onClick={restart} aria-label={restartLabel} data-tip={restartLabel}>
                            <ActionIcon id="restart" />
                        </RoundButton>
                    </PhoneRow>
                    <PhoneRow>
                        <PhoneBoosters data-tour="boosters">
                            {mainButtons}
                            {hasTimer && timerButtons}
                        </PhoneBoosters>
                        <PhoneFill>{turnLine}</PhoneFill>
                    </PhoneRow>
                </PhoneBar>

                {timerRunning && (
                    <RowTimer>
                        <MoveTimerBar fraction={timer} seconds={TIMER_SECONDS} boosts />
                    </RowTimer>
                )}

                <BoardHolder data-tour="board">
                    {board}
                    {overlay}
                </BoardHolder>

                <PhoneOptions>
                    <PhoneTiles role="group" aria-label={t("barBoard")}>
                        {modeTiles}
                    </PhoneTiles>
                    {modGroup("left")}
                </PhoneOptions>
            </GameRoot>
        );

    // Телефон на сайті й порталі: шапка (назад, назва, гра з другом, повний екран, налаштування),
    // рядок-кнопка з полем / складністю / модифікатором (аркуш знизу), рахунок і статус, поле,
    // панель бустерів і "Заново" внизу під пальцем.
    if (sitePhone) {
        const title = online ? t("homeOnline") : run ? t(run.kind === "campaign" ? "homeCampaign" : "homeDaily") : t("homeQuick");
        const tile = MODE_TILES.find((item) => item.id === mode) ?? MODE_TILES[0];
        const modName = t(`modifier_${activeModifier ?? "none"}` as Parameters<typeof t>[0]);
        const setupText = [BOARD_SHORT[mode], online ? null : t(`difficulty_${difficulty}` as Parameters<typeof t>[0]), modName]
            .filter(Boolean)
            .join(" · ");
        const dockBooster = (kind: BoosterKind, enabled: boolean, onUse: () => void) => (
            <DockItem key={kind}>
                {boosterButton(kind, enabled, onUse)}
                <span aria-hidden="true">{DOCK_NAME[kind]}</span>
            </DockItem>
        );
        const showBoosters = quick && !online;
        // Короткі підписи під кнопками панелі (повна назва - в aria-label і тултіпі кнопки).
        const DOCK_NAME: Record<BoosterKind, string> = { undo: t("dockUndo"), hint: t("dockHint"), pause: t("dockPause"), freeze: t("dockFreeze") };
        return (
            <GameRoot $sitePhone $timer={timerRunning} $switch={Boolean(themeSwitch)}>
                <SitePhoneHead data-tour="bar">
                    {homeButton}
                    <SitePhoneTitle>{title}</SitePhoneTitle>
                    {friendButton}
                    <FullscreenButton round />
                    <SettingsButton round />
                </SitePhoneHead>

                {quick ? (
                    <SetupChip
                        type="button"
                        aria-haspopup="dialog"
                        aria-label={`${t("gameSetup")}: ${setupText}`}
                        title={setupLocked ? lockTip : undefined}
                        disabled={setupLocked}
                        onClick={() => setSetupOpen(true)}
                    >
                        <img src={assetUrl(tile.img)} alt="" />
                        <span>{setupText}</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                    </SetupChip>
                ) : (
                    goalBanner
                )}

                <SitePhoneStatus>
                    <ScorePill>
                        <span>{online ? online.leftName : t("ai")}</span>
                        <b>{score.ai}</b>
                        <span>:</span>
                        <b>{score.human}</b>
                        <span>{humanName ?? t("player")}</span>
                    </ScorePill>
                    {turnLine}
                </SitePhoneStatus>

                {timerRunning && (
                    <RowTimer>
                        <MoveTimerBar fraction={timer} seconds={TIMER_SECONDS} boosts />
                    </RowTimer>
                )}

                <BoardHolder data-tour="board">
                    {board}
                    {overlay}
                </BoardHolder>

                {themeSwitch && (
                    <ThemeSwitch type="button" onClick={switchTheme}>
                        {themeSwitch.label}
                    </ThemeSwitch>
                )}

                <SitePhoneDock data-tour="boosters">
                    {showBoosters && dockBooster("undo", boosters.canUndo, boosters.onUndo)}
                    {showBoosters && dockBooster("hint", boosters.canHint, boosters.onHint)}
                    {showBoosters && hasTimer && dockBooster("pause", boosters.canHint && !timerBoost.firstFree && !timerBoost.paused && !timerBoost.frozenNow, pauseMoveTimer)}
                    {showBoosters && hasTimer && dockBooster("freeze", boosters.canHint && !timerBoost.firstFree && !timerBoost.frozenNow, freezeMoveTimer)}
                    <DockItem>
                        {restartButton}
                        <span aria-hidden="true">{online || over ? restartLabel : t("dockRestart")}</span>
                    </DockItem>
                </SitePhoneDock>

                {setupOpen && (
                    <SheetBackdrop onClick={(event) => event.target === event.currentTarget && setSetupOpen(false)}>
                        <SheetPanel role="dialog" aria-modal="true" aria-labelledby="game-setup-title">
                            <SheetHead>
                                <h2 id="game-setup-title">{t("gameSetup")}</h2>
                                <SheetClose ref={sheetClose} type="button" aria-label={t("close")} onClick={() => setSetupOpen(false)}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                                        <path d="M6 6l12 12M18 6 6 18" />
                                    </svg>
                                </SheetClose>
                            </SheetHead>

                            <section>
                                <h3>{t("barBoard")}</h3>
                                <SheetGrid>
                                    {MODE_TILES.map((item) => (
                                        <SheetChoice
                                            key={item.id}
                                            type="button"
                                            $on={mode === item.id}
                                            aria-pressed={mode === item.id}
                                            disabled={setupLocked && mode !== item.id}
                                            onClick={() => pickMode(item.id)}
                                        >
                                            <img src={assetUrl(item.img)} alt="" />
                                            {online && item.id === "difficult" ? "9×9" : t(item.label)}
                                        </SheetChoice>
                                    ))}
                                </SheetGrid>
                            </section>

                            {!online && (
                                <section>
                                    <h3>{t("barBot")}</h3>
                                    <SheetGrid>
                                        {DIFFICULTIES.map((level) => (
                                            <SheetChoice
                                                key={level}
                                                type="button"
                                                $on={difficulty === level}
                                                aria-pressed={difficulty === level}
                                                onClick={() => pickDifficulty(level)}
                                            >
                                                {t(`difficulty_${level}` as Parameters<typeof t>[0])}
                                            </SheetChoice>
                                        ))}
                                    </SheetGrid>
                                    <SheetNote>{t(`diffNote_${difficulty}` as Parameters<typeof t>[0])}</SheetNote>
                                </section>
                            )}

                            <section>
                                <h3>{t("modifierLabel")}</h3>
                                <SheetMods>
                                    {[null, ...MODIFIERS_BY_MODE[mode]].map((value) => (
                                        <SheetChip
                                            key={value ?? "none"}
                                            type="button"
                                            $on={activeModifier === value}
                                            aria-pressed={activeModifier === value}
                                            disabled={setupLocked && activeModifier !== value}
                                            onClick={() => pickModifier(value)}
                                        >
                                            <ModIcon id={value} size={20} />
                                            <span>{t(`modifier_${value ?? "none"}` as Parameters<typeof t>[0])}</span>
                                            {value !== null && value === weekly && <em title={t("homeWeekly")} />}
                                        </SheetChip>
                                    ))}
                                </SheetMods>
                                <SheetModNote aria-live="polite">
                                    {activeModifier !== null && activeModifier === weekly && <em>{t("homeWeekly")}</em>}
                                    <b>{modName}</b> · {activeModifier ? t(`modifierDesc_${activeModifier}` as Parameters<typeof t>[0]) : t("modifierNoneDesc")}
                                </SheetModNote>
                            </section>

                            <SheetDone type="button" onClick={() => setSetupOpen(false)}>
                                {t("gameSetupPlay")}
                            </SheetDone>
                        </SheetPanel>
                    </SheetBackdrop>
                )}

                {friendOpen && <FriendGameModal onClose={() => setFriendOpen(false)} onRoomReady={onRoomReady} defaultMode={FRIEND_MODE[mode]} />}
            </GameRoot>
        );
    }

    return (
        <GameRoot $timer={timer !== null && timer !== undefined && !over} $embed={wide} $switch={Boolean(themeSwitch)}>
            <Bar data-tour="bar" $embed={wide} $site={!embed}>
                {wide ? (
                    <>
                        {embedSide(
                            <>
                        <BarActions $embed={wide}>{actionButtons}</BarActions>
                        {wide && (
                            <WideOnly>
                                <ModSlot>
                                    {quick ? (
                                        <>
                                            {diffSelect}
                                            {modGroup("left")}
                                        </>
                                    ) : (
                                        goalBanner
                                    )}
                                </ModSlot>
                            </WideOnly>
                        )}
                        {quick && narrowOnly(
                        <BarGroup>
                            <BarLabel id="bar-board" $hidden>
                                {t("barBoard")}
                            </BarLabel>
                            <BarGroupRow role="group" aria-labelledby="bar-board" style={{ position: "relative", gap: 10 }}>
                                {modeTiles}
                            </BarGroupRow>
                            {embed && <BarStatus>{turnLine}</BarStatus>}
                        </BarGroup>
                        )}
                            </>
                        )}
                        <PushRight $embed>
                            {wide && (
                                <>
                                    <NarrowOnly>{embed ? <BarGroup>{scorePill}</BarGroup> : quick ? diffSelect : goalBanner}</NarrowOnly>
                                    <WideOnly>
                                        <ScoreMid>{scorePill}</ScoreMid>
                                        <HintSlot>
                                            <StatusSlot ref={hintBox}>{turnLine}</StatusSlot>
                                        </HintSlot>
                                    </WideOnly>
                                </>
                            )}
                            {embedSide(
                                <>
                            {quick && narrowOnly(modGroup("auto"))}
                            {/* Розгорнути на весь екран (у новині на 5×5 і гіга-полі кнопка час від часу пульсує);
                                на сайті - ще налаштування. */}
                            {wide && (
                                <BarFull>
                                    {goHome ? (
                                        <>
                                            {friendButton}
                                            {restartButton}
                                        </>
                                    ) : <FullscreenButton round nudge={embed && mode !== "traditional"} />}
                                </BarFull>
                            )}
                                </>
                            )}
                        </PushRight>
                    </>
                ) : (
                    <>
                        {goalBanner}
                        {actionButtons}
                    </>
                )}
            </Bar>

            {timerRunning && (
                <RowTimer>
                    <MoveTimerBar fraction={timer} seconds={TIMER_SECONDS} boosts />
                </RowTimer>
            )}

            {!embed && (
            <NarrowScoreTop $inBar>
                <ScorePill>
                    {isHalloweenEmbed() && <ScoreCobweb />}
                    <span>{online ? online.leftName : t("ai")}</span>
                    <b>{score.ai}</b>
                    <span>—</span>
                    <b>{score.human}</b>
                    <span>{humanName ?? t("player")}</span>
                </ScorePill>
                {turnLine}
            </NarrowScoreTop>
            )}

            <BoardHolder data-tour="board">
                {board}
                {overlay}
                {wide && quick && (
                    <TileColumn ref={tileColumn} $site={!embed} role="group" aria-label={t("barBoard")}>
                        {modeTiles}
                    </TileColumn>
                )}
                {quick && !online &&
                    <Boosters data-tour="boosters" $site={!embed}>
                        {mainButtons}
                        {hasTimer && timerButtons}
                    </Boosters>
                }
            </BoardHolder>

            {themeSwitch && (
                <ThemeSwitch type="button" onClick={switchTheme}>
                    {themeSwitch.label}
                </ThemeSwitch>
            )}

            {friendOpen && <FriendGameModal onClose={() => setFriendOpen(false)} onRoomReady={onRoomReady} defaultMode={FRIEND_MODE[mode]} />}
        </GameRoot>
    );
};
