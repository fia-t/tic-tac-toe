"use client";
import styled, { createGlobalStyle, css, keyframes } from "styled-components";
import { assetUrl } from "@game/lib/assets";

// Вигляд поля (як у прототипі й артах порталу): об'ємна плита з тінню й світлим краєм,
// клітинки - окремі заглиблені плитки поверх фону теми, без ліній-розділювачів.
// Один стиль для всіх режимів (3×3, 5×5, Ultimate, онлайн).
export const boardSlab = css`
    /* Поле - як еталонна кнопка: тонкий кремовий обідок у її кольорах (світлий верх, тепліший низ,
       м'яка нижня кромка), без "ящика" - піщаної рамки, канавки й важкої тіні. Обідок - звичайний
       CSS-border з радіусом, тож текстура скіна заокруглюється разом із ним і прилягає впритул. */
    position: relative;
    border: 8px solid transparent;
    border-radius: 28px;
    padding: 6px;
    /* --board-overlay - прикраса поверх текстури скіна (листя в хелловінській грі з новини). */
    background:
        var(--board-overlay, none) center / cover no-repeat padding-box,
        var(--board-image) center / cover no-repeat padding-box,
        linear-gradient(180deg, #fff3dd 0%, #f6e2b8 45%, #e8c992 100%) border-box;
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.7),
        0 3px 0 #dcbc86;
    margin-bottom: 3px;
`;

const hintPulse = keyframes`
    from { filter: brightness(1); }
    to { filter: brightness(1.12); }
`;

// Клітинка, яку радить бустер "Підказка" - золота обвідка, що м'яко пульсує.
export const hintedCell = css`
    box-shadow:
        inset 0 0 0 4px #f5b82e,
        0 0 18px rgba(245, 184, 46, 0.8);
    animation: ${hintPulse} 0.9s ease-in-out infinite alternate;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

export const boardTile = css`
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.18);
    box-shadow:
        inset 0 3px 6px rgba(90, 50, 10, 0.28),
        inset 0 -1px 0 rgba(255, 255, 255, 0.35);
    transition: background 0.15s ease;

    @media (hover: hover) {
        &:hover {
            background: rgba(255, 255, 255, 0.3);
        }
    }
`;

// Базовий скид, щоб відсоткові/vw-розміри рахувались від реального
// розміру екрана телефона, а не від дефолтних відступів браузера.
export const GlobalStyle = createGlobalStyle`
    * {
        box-sizing: border-box;
    }
    html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        /* Явний (не лише min-) height по всьому ланцюжку html/body - інакше
           height:100% нижче по дереву (Container) не резолвиться, що критично
           для вбудовування у cross-origin iframe порталу довільного розміру. */
        height: 100%;
        min-height: 100%;
        /* Невидимий Tooltip (opacity: 0) все одно розтягує scrollWidth за
           межі екрана на вузьких телефонах, через що vw/fixed-центрування
           попапів (напр. "Гра з другом") зʼїжджає вбік. */
        overflow-x: hidden;
    }
    /* Корінь React у standalone-білді (index.html порталу) - теж на всю висоту,
       інакше Container з фоном закінчувався за вмістом і внизу iframe лишалась біла смуга. */
    #root {
        height: 100%;
    }
    /* Шрифти (підключені в fonts.ts): основний текст - рукописний Neucha для обох мов;
       заголовки - Lilita One, але в нього немає кирилиці, тож українською (data-lang="uk")
       --font-heading перемикається на Unbounded - ним набирається весь заголовок разом із цифрами. */
    :root {
        --font-body: "Neucha", "Segoe UI", system-ui, sans-serif;
        --font-heading-latin: "Lilita One", "Neucha", system-ui, sans-serif;
        --font-uk: "Unbounded", "Segoe UI", system-ui, sans-serif;
        --font-heading: var(--font-heading-latin);
    }
    html[data-lang="uk"] {
        --font-heading: var(--font-uk);
    }
    body {
        font-family: var(--font-body);
    }
    /* Заголовки: без "домальованого" жирного - у Lilita One лише одна вага, Unbounded підключено у 700. */
    h1,
    h2,
    h3,
    h4 {
        font-family: var(--font-heading);
        font-synthesis: none;
    }
`;

export const Container = styled.div`
    display: flex;
    justify-content: center;
    align-items: flex-start;
    /* height:100% замість 100vh - у вбудованому iframe і мобільних in-app
       вебв'ю 100vh рахується від "справжнього" viewport, а не від фактичного
       розміру iframe/адресного рядка, що спричиняло overflow/обрізання. */
    height: 100%;
    min-height: 100%;
    width: 100%;
    box-sizing: border-box;
    /* Зверху - кнопка налаштувань у куті (екран онлайн-кімнати), тому відступ 60px. Меню гри
       (TicTacToe) має власну шапку в потоці сторінки й обнуляє його через --shell-top. */
    /* --nav-space - місце під нижнім меню на екрані гри (BottomNav), інакше 0. */
    padding: var(--shell-top, 60px) var(--shell-x, 12px) calc(12px + var(--nav-space, 0px));
    /* Якщо вміст вищий за iframe порталу - прокрутка, а не обрізання. margin-block:auto
       дитини центрує по вертикалі, коли місця вдосталь, і притискає догори, коли ні
       (на відміну від align-items:center, що обрізав би верх без прокрутки). */
    overflow-y: auto;
    /* overflow-y:auto робить і x "auto" - невидимі тултіпи кнопок давали б горизонтальну прокрутку. */
    overflow-x: hidden;
    scrollbar-width: thin;
    & > * {
        margin-block: auto;
    }
    /* Розмір поля - і від ширини, і від ВИСОТИ вікна/iframe: --board-chrome - скільки
       висоти займає все, крім поля (смуга з табло й виборами, кнопки на мобільному). */
    --board-chrome: calc(250px + var(--nav-space, 0px));
    --board: max(240px, min(92vw, 540px, calc(100vh - var(--board-chrome))));
    --board: max(240px, min(92vw, 540px, calc(100dvh - var(--board-chrome))));

    @media (max-width: 640px) {
        padding: var(--shell-top, 58px) var(--shell-x, 8px) calc(10px + var(--nav-space, 0px));
        --board-chrome: calc(310px + var(--nav-space, 0px));
    }
    /* Небо, що переходить у пісок (тема пляжу, але не відволікає від поля): кілька дуже блідих
       хмаринок угорі й ледь помітні крапки. Без фото й без background-attachment: fixed. */
    background-color: #dcedf9;
    background-image:
        radial-gradient(ellipse 170px 46px at 14% 70px, rgba(255, 255, 255, 0.6), transparent 70%),
        radial-gradient(ellipse 230px 58px at 80% 46px, rgba(255, 255, 255, 0.55), transparent 70%),
        radial-gradient(ellipse 140px 38px at 52% 150px, rgba(255, 255, 255, 0.45), transparent 70%),
        radial-gradient(circle, rgba(73, 48, 31, 0.06) 1px, transparent 1.6px),
        linear-gradient(180deg, #dcedf9 0%, #cfe3f3 50%, #f3e2c4 100%);
    background-size: auto, auto, auto, 22px 22px, auto;
    background-repeat: no-repeat, no-repeat, no-repeat, repeat, no-repeat;
    color: white;
`;

// Стилі для ігрового контейнера.
// Розмір поля - у vw з обмеженням зверху, тому воно вписується в екран
// будь-якого смартфона (Android/iPhone), лишаючись 540px на планшетах/десктопі.
export const BoardContainer = styled.div<{ $backgroundUrl?: string }>`
    width: var(--board, min(92vw, 480px));
    aspect-ratio: 1 / 1;
    --board-image: url('${({ $backgroundUrl }) => $backgroundUrl || assetUrl("images/sand.png")}');
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 8px;
    --frame: 16px;
    box-sizing: border-box;
    ${boardSlab}
`;

export const Cell = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    ${boardTile}
    cursor: pointer;
    touch-action: manipulation;
`;

export const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
    cursor: pointer;
`;

// Табло рахунку онлайн-партії ("Ім'я1: N - Ім'я2: M") у пісочному стилі кнопок.
export const ScoreBoard = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 12px;
    padding: 8px 18px;
    border-radius: 14px;
    background: transparent;
    border: 2px solid rgba(139, 101, 60, 0.35);
    box-shadow:
        inset 2px 2px 4px rgba(101, 72, 35, 0.35),
        inset -1px -1px 2px rgba(255, 255, 255, 0.35);
    color: #5b3f22;
    font-size: 14px;
    font-weight: 700;
    max-width: 92vw;
    box-sizing: border-box;
    flex-wrap: wrap;
`;

export const ScoreName = styled.span`
    white-space: nowrap;
`;

export const ScoreValue = styled.span`
    color: #8B4513;
`;

export const ScoreDivider = styled.span`
    opacity: 0.5;
`;

// --- Стилі для Ultimate Tic-Tac-Toe (режим "Складний") ---

export const UltimateBoardContainer = styled.div<{ $backgroundUrl?: string }>`
    width: var(--board, min(92vw, 480px));
    aspect-ratio: 1 / 1;
    --board-image: url('${({ $backgroundUrl }) => $backgroundUrl || assetUrl("images/sand.png")}');
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 8px;
    --frame: 14px;
    box-sizing: border-box;
    ${boardSlab}
`;

export const MiniBoardWrapper = styled.div<{ $isActive: boolean }>`
    position: relative;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    box-sizing: border-box;
    gap: 3px;
    padding: 5px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.12);
    box-shadow: ${({ $isActive }) =>
        $isActive ? "inset 0 0 0 3px #f5b82e, 0 0 14px rgba(245, 184, 46, 0.85)" : "inset 0 0 0 2px rgba(110, 70, 30, 0.35)"};
`;

export const MiniCell = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    ${boardTile}
    border-radius: 7px;
    cursor: pointer;
    touch-action: manipulation;
`;

// Затемнення завершеного (виграного або нічийного) міні-поля.
// Окремий шар МІЖ сіткою клітинок і зображенням переможця - тому
// саме зображення переможця на нього не зважає і лишається чітким.
export const MiniBoardDimOverlay = styled.div`
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: rgba(0, 0, 0, 0.45);
    pointer-events: none;
    z-index: 1;
`;

// Зображення переможця (або "нічия") - завжди поверх затемнення,
// тому не тьмяніє разом з рештою заблокованого поля.
export const MiniBoardResultOverlay = styled.div`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 2;
`;

export const MiniBoardDrawLabel = styled.span`
    font-size: clamp(24px, 9vw, 48px);
    font-weight: bold;
    color: #f5f5f5;
`;

// --- Індикатор завантаження теми ---

// Займає той самий розмір/форму, що й ігрове поле (BoardContainer/UltimateBoardContainer),
// щоб коли тема довантажиться і замінить цей блок на реальну дошку, розмітка
// сторінки не "стрибала".
export const ThemeLoadingBox = styled.div`
    width: var(--board, min(92vw, 480px));
    aspect-ratio: 1 / 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 18px;
    background: rgba(139, 101, 60, 0.12);
`;

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

export const Spinner = styled.div`
    width: 56px;
    height: 56px;
    border: 6px solid rgba(139, 69, 19, 0.2);
    border-top-color: #8B4513;
    border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
`;

