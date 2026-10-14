"use client";
import styled, { createGlobalStyle, css, keyframes } from "styled-components";
import { gameButtonCss } from "@game/components/GameButton";
import { assetUrl } from "@game/lib/assets";

// Вигляд поля (як у прототипі й артах порталу): об'ємна плита з тінню й світлим краєм,
// клітинки - окремі заглиблені плитки поверх фону теми, без ліній-розділювачів.
// Один стиль для всіх режимів (3×3, 5×5, Ultimate, онлайн).
export const boardSlab = css`
    /* Поле - як велика PNG-кнопка режимів: пісочна рамка з товстою нижньою "губою" й тінню,
       а фон скіна - лише у внутрішній, заглибленій зоні (content-box = без рамки --frame). */
    position: relative;
    padding: var(--frame);
    background:
        var(--board-image) center / cover no-repeat content-box,
        linear-gradient(165deg, #fde7c2 0%, #f6d39d 55%, #eec38a 100%) border-box;
    border-radius: 34px;
    box-shadow:
        inset 0 3px 0 rgba(255, 255, 255, 0.75),
        inset 0 -5px 0 rgba(176, 115, 45, 0.35),
        0 9px 0 #d6a15c,
        0 18px 30px rgba(90, 50, 10, 0.32);
    margin-bottom: 9px;

    /* Внутрішній бортик ігрової зони. */
    &::before {
        content: "";
        position: absolute;
        inset: calc(var(--frame) - 3px);
        border-radius: 22px;
        box-shadow:
            inset 0 4px 10px rgba(90, 50, 10, 0.35),
            inset 0 0 0 2px rgba(150, 95, 35, 0.35);
        pointer-events: none;
        z-index: 2;
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
    /* Шрифт інтерфейсу - системний без засічок (білд для порталу не тягне веб-шрифти). */
    body {
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
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
    /* Зверху - ряд кнопок у кутах (виклик дня, монети / звук), тому відступ 60px. */
    padding: 60px 12px 12px;
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
       висоти займає все, крім поля (табло, рівні, модифікатори, кнопки на мобільному). */
    --board-chrome: 320px;
    --board: max(240px, min(92vw, 480px, calc(100vh - var(--board-chrome))));
    --board: max(240px, min(92vw, 480px, calc(100dvh - var(--board-chrome))));

    @media (max-width: 640px) {
        padding: 58px 8px 10px;
        --board-chrome: 375px;
    }
    background-image: url('${assetUrl("images/background-image.jpg")}');
    background-size: cover;
    background-position: center;
    color: white;
`;

// Розташовує ігрове поле та панель кнопок: збоку одне від одного на широких
// екранах, одне під одним - на екрані смартфона.
export const GameLayout = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 20px;
    width: 100%;

    @media (max-width: 640px) {
        flex-direction: column;
        gap: 12px;
    }
`;

// Стилі для ігрового контейнера.
// Розмір поля - у vw з обмеженням зверху, тому воно вписується в екран
// будь-якого смартфона (Android/iPhone), лишаючись 480px на планшетах/десктопі.
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

export const ButtonContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;

    @media (max-width: 640px) {
        flex-direction: row;
        flex-wrap: nowrap;
        gap: 8px;
    }
`;

// Кнопка - лише прозора рамка-обгортка: сам вигляд (пісочна плитка,
// заокруглення, тінь, рельєф) уже намальований у PNG-іконці всередині.
export const Button = styled.button`
    ${gameButtonCss("xl", { square: true })}
    flex-shrink: 0;
`;

// Іконки кнопок - самі PNG вже мають вигляд готової пісочної 3D-плитки,
// тож рендеримо їх на весь розмір кнопки без додаткового фону/рамки.
export const ControlIcon = styled.img`
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
`;

// Обгортка для кнопки з тултіпом - позиціонує підказку відносно самої кнопки.
export const ButtonWithTooltip = styled.div`
    position: relative;
    display: inline-flex;
`;

// Підказка виводиться праворуч від кнопки в тому ж пісочно-бежевому стилі,
// з маленьким "хвостиком", що вказує на кнопку.
export const Tooltip = styled.span`
    position: absolute;
    left: calc(100% + 12px);
    top: 50%;
    transform: translateY(-50%) translateX(-4px);
    background: linear-gradient(155deg, #f5e0b6 0%, #e6c890 100%);
    color: #6b4a25;
    font-size: 13px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 10px;
    white-space: nowrap;
    box-shadow:
        3px 3px 6px rgba(101, 72, 35, 0.3),
        -1px -1px 2px rgba(255, 250, 235, 0.5);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease, transform 0.15s ease;
    z-index: 10;

    &::before {
        content: "";
        position: absolute;
        right: 100%;
        top: 50%;
        transform: translateY(-50%);
        border: 6px solid transparent;
        border-right-color: #eecf9c;
    }

    ${ButtonWithTooltip}:hover & {
        opacity: 1;
        transform: translateY(-50%) translateX(0);
    }
`;

// Пауза перед попапом результату - щоб гравець встиг побачити підсвічену
// переможну лінію (GamePiece winning) до того, як дошку накриє затемнення.
const RESULT_REVEAL_DELAY_MS = 900;

const popupReveal = keyframes`
    from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;

const overlayReveal = keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
`;

export const Popup = styled.div<{ $result: string }>`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 90vw;
    box-sizing: border-box;
    background: ${({ $result }) => ($result === "win" ? "#4CAF50" : $result === "lose" ? "#F44336" : "#FF9800")};
    color: white;
    padding: clamp(14px, 4vw, 20px);
    border-radius: 10px;
    box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.2);
    text-align: center;
    font-size: clamp(18px, 5vw, 24px);
    z-index: 1000;
    cursor: pointer;
    animation: ${popupReveal} 220ms ease-out ${RESULT_REVEAL_DELAY_MS}ms both;

    @media (prefers-reduced-motion: reduce) {
        animation-duration: 1ms;
    }
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

// Колонка "табло + поле" - гарантує, що ScoreBoard центрується САМЕ над
// ігровим полем, а не над усім рядом (поле + панель кнопок збоку на десктопі).
// Затемнення під попапом результату - з тією ж паузою, що й сам Popup.
export const ResultOverlay = styled(Overlay)`
    animation: ${overlayReveal} 220ms ease-out ${RESULT_REVEAL_DELAY_MS}ms both;
`;

export const BoardColumn = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
`;

// Табло рахунку над ігровим полем - показує "ШІ: N - Ім'я: M" (vs AI)
// або "Ім'я1: N - Ім'я2: M" (гра з другом), в тому ж пісочному стилі кнопок/тултіпів.
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

// Ряд кнопок у лівому верхньому куті (виклик дня, монети) - дзеркально до SoundToggle
// справа. Висоту під нього резервує верхній відступ Container.
export const HudLeft = styled.div`
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 1500;
    display: flex;
    align-items: center;
    gap: 8px;
`;

// Квадратна кнопка верхнього ряду (напр. "Меню" на полі) - у стилі SoundToggle.
export const HudButton = styled.button`
    ${gameButtonCss("sm", { square: true })}
`;
