"use client";
import styled, { createGlobalStyle } from "styled-components";

// Шапка гри - у потоці сторінки (TopBar), тож верхній відступ Container під кнопку в куті
// не потрібен; бічні поля - як у прототипі.
export const ShellVars = createGlobalStyle`
    :root {
        --shell-top: 0px;
        --shell-x: max(16px, env(safe-area-inset-left, 0px));
    }
`;

// Одна колонка гри до 760px (як у прототипі): шапка, під нею - головна, сторінка розділу,
// поле або екран онлайн-кімнати.
export const AppColumn = styled.div`
    &&& {
        margin-block: 0;
    }
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 760px;
    min-height: 100%;
    margin: 0 auto;
    color: #4a2c0c;
    font: 500 15px/1.45 var(--font-body);
`;

// Сторінки меню: шапка й нижнє меню стоять на місці, прокручується лише область сторінки між ними.
// Колонка - на всю висоту вікна гри; поля по боках - під тіні карток, які інакше обрізала б прокрутка.
export const MenuColumn = styled(AppColumn)`
    height: 100%;
    min-height: 0;
`;

export const MenuScroll = styled.div`
    flex: 1 1 auto;
    min-height: 0;
    margin-inline: calc(-1 * var(--shell-x));
    padding: 10px var(--shell-x) 0;
    /* Картки м'яко зникають під шапкою, а не обрізаються рівною лінією. */
    -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 12px);
    mask-image: linear-gradient(to bottom, transparent 0, #000 12px);
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: rgba(128, 83, 47, 0.45) transparent;

    /* Головна й кампанія: привітання й вкладки нерухомі, прокручується їхня власна область
       (HomeScroll) - тут без відступу зверху (привітання ближче до шапки) і без маски. */
    &:has(> [data-fixed-head]) {
        padding-top: 0;
        -webkit-mask-image: none;
        mask-image: none;
        overflow: hidden;
    }
`;

// Прокрутка сторінки меню на початок: і сама MenuScroll, і внутрішня область (HomeScroll).
export const scrollMenuTop = (scroll: HTMLElement | null, behavior: ScrollBehavior = "auto") => {
    if (!scroll) return;
    scroll.scrollTo({ top: 0, behavior });
    scroll.querySelectorAll<HTMLElement>("[data-menu-scroll]").forEach((inner) => inner.scrollTo({ top: 0, behavior }));
};

// Спільні стилі сторінок меню (головна, кампанія, магазин, нагороди, профіль) - як у прототипі:
// кремові картки з м'якою нижньою кромкою на небі гри.

// Широкий екран: привітання головної й заголовки сторінок - у шапці, у рядку з кнопками повного
// екрана й налаштувань, сторінка починається одразу з вкладок чи карток. Заголовок - від лівого краю
// колонки сторінки, але не раніше кнопок зліва і не далі ресурсів праворуч; довге ім'я обрізається
// трикрапкою (див. barColumnCss). Вужче - на сторінці.
export const GREETING_IN_BAR = "(min-width: 900px)";

// Заголовок у шапці (шапка - на всю ширину вікна, колонка - по центру). Зліва - дві кнопки
// (до ~135px від краю, вужче за 940px - ~110px), справа - ресурси (~340px, з запасом на довші числа).
export const barColumnCss = `
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    left: max(calc(50% - 380px), 152px);
    right: max(calc(50% - 380px), 380px);

    h1 {
        max-width: 100%;
    }

    /* Між колонкою й кнопками тісно - заголовок трохи менший. */
    @media (max-width: 1099px) {
        h1 {
            font-size: 26px;
        }
    }

    /* Тут поля шапки вужчі (24px), тож ресурси ближче до краю. */
    @media (max-width: 939px) {
        left: 128px;
        right: 340px;
    }
`;

export const Page = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 100%;
    min-width: 0;
    /* Місце під нижнє меню. */
    padding-bottom: 96px;
    color: #4a2c0c;
`;

export const Card = styled.section<{ $tone?: "daily" }>`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    padding: 16px;
    border-radius: 24px;
    background: ${({ $tone }) => ($tone === "daily" ? "linear-gradient(160deg, #ffe3a3, #f7d7a6 60%)" : "#fff6e6")};
    box-shadow:
        inset 0 -5px 0 #ebcb98,
        0 12px 24px rgba(70, 40, 10, 0.16);

    h2 {
        margin: 0;
        font-size: 24px;
        line-height: 1.05;
        text-wrap: balance;
    }

    h3 {
        margin: 0;
        font-size: 19px;
        line-height: 1.05;
        text-wrap: balance;
    }
`;

export const Eyebrow = styled.div`
    font-size: 12px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #7a5530;
`;

export const Muted = styled.div`
    margin: 0;
    color: #7a5530;
    font-size: 13px;
    line-height: 1.45;
`;

export const Row = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
`;

export const Spread = styled(Row)`
    justify-content: space-between;
`;

export const Progress = styled.div`
    height: 10px;
    border-radius: 999px;
    background: #f1c88c;
    overflow: hidden;

    & > i {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #1fb3d9, #0f6f8c);
    }
`;

// Інформаційна плашка (рівень, ліга, серія) - не кнопка: пласкиий напівпрозорий бейдж без рельєфу,
// щоб не плутати з натискними кнопками поруч.
export const InfoPill = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    padding: 0 12px;
    border-radius: 14px;
    /* Втоплена плашка (як лічильники в шапці) - щоб не плутати з кнопками. */
    background: rgba(214, 178, 124, 0.32);
    box-shadow:
        inset 0 3px 4px rgba(92, 51, 23, 0.22),
        inset 0 -1px 0 rgba(255, 255, 255, 0.55);
    color: #7a5530;
    font-size: 14px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

// Дві картки (або кнопки) поруч; на вузькому екрані - одна під одною.
export const TwoCol = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;

    /* Кнопки карток поруч - притиснуті до низу, на одному рівні. */
    & > section > button:last-child {
        margin-top: auto;
    }

    @media (max-width: 420px) {
        grid-template-columns: 1fr;
    }
`;
