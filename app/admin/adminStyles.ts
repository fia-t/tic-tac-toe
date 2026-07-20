"use client";
import styled from "styled-components";

// Стилі адмінки - той самий пісочно-бежевий тон, що й у решті гри
// (gameStyles.ts/onlineStyles.ts), але повносторінковий layout, а не
// модальне вікно поверх геймплею.

export const AdminPage = styled.div`
    min-height: 100vh;
    width: 100%;
    padding: 24px 16px 60px;
    background: #f7f1e6;
    color: #5b3f22;
    box-sizing: border-box;
`;

export const AdminHeader = styled.div`
    max-width: 900px;
    margin: 0 auto 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
`;

export const AdminHeading = styled.h1`
    margin: 0;
    font-size: clamp(20px, 4vw, 26px);
`;

export const LoginCard = styled.div`
    max-width: 360px;
    margin: 80px auto 0;
    background: linear-gradient(160deg, #fff6e6 0%, #f7e6c4 100%);
    border-radius: 24px;
    padding: 28px;
    box-shadow: 0 12px 30px rgba(101, 72, 35, 0.25);
    box-sizing: border-box;
`;

export const Section = styled.div`
    max-width: 900px;
    margin: 0 auto 28px;
    background: #fffaf0;
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 6px 16px rgba(101, 72, 35, 0.12);
    box-sizing: border-box;
`;

export const SectionTitle = styled.h2`
    margin: 0 0 14px;
    font-size: 16px;
    font-weight: 700;
`;

export const ThemeGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 16px;
`;

export const ThemeCard = styled.div<{ $active: boolean }>`
    border-radius: 16px;
    padding: 14px;
    background: ${({ $active }) => ($active ? "rgba(139, 101, 60, 0.08)" : "rgba(139, 101, 60, 0.03)")};
    border: 2px solid ${({ $active }) => ($active ? "#c9974f" : "rgba(139, 101, 60, 0.15)")};
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const ThumbRow = styled.div`
    display: flex;
    gap: 8px;
`;

export const Thumb = styled.div<{ $src?: string }>`
    width: 56px;
    height: 56px;
    border-radius: 10px;
    background: ${({ $src }) => ($src ? `url("${$src}") center/cover no-repeat` : "rgba(139, 101, 60, 0.1)")};
    border: 1px solid rgba(139, 101, 60, 0.2);
    flex-shrink: 0;
`;

export const ThemeName = styled.div`
    font-weight: 700;
    font-size: 15px;
`;

export const ThemeActionsRow = styled.div`
    display: flex;
    gap: 10px;
    align-items: center;
    margin-top: 4px;
    flex-wrap: wrap;
`;

export const SmallLabel = styled.label`
    font-size: 11px;
    color: #7a5a35;
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

export const FileInput = styled.input`
    font-size: 11px;
    max-width: 100px;
`;

export const CheckboxLabel = styled.label`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    cursor: pointer;
`;

export const DangerButton = styled.button`
    padding: 6px 12px;
    border: none;
    border-radius: 10px;
    background: rgba(179, 64, 44, 0.12);
    color: #b3402c;
    font-weight: 700;
    font-size: 12px;
    cursor: pointer;

    &:hover {
        background: rgba(179, 64, 44, 0.2);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

export const GhostButton = styled.button`
    padding: 8px 14px;
    border: none;
    border-radius: 10px;
    background: rgba(139, 101, 60, 0.12);
    color: #6b4a25;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;

    &:hover {
        background: rgba(139, 101, 60, 0.22);
    }
`;

export const AddThemeRow = styled.div`
    display: flex;
    gap: 10px;
    align-items: stretch;

    @media (max-width: 480px) {
        flex-direction: column;
    }
`;

// --- Каркас адмінки з лівим меню (Дашборд/Теми/Імена/SEO) ---

export const AdminShell = styled.div`
    min-height: 100vh;
    width: 100%;
    display: flex;
    background: #f7f1e6;
    color: #5b3f22;

    @media (max-width: 720px) {
        flex-direction: column;
    }
`;

export const Sidebar = styled.nav`
    flex-shrink: 0;
    width: 220px;
    box-sizing: border-box;
    padding: 20px 14px;
    background: linear-gradient(160deg, #fff6e6 0%, #f7e6c4 100%);
    box-shadow: 2px 0 10px rgba(101, 72, 35, 0.12);
    display: flex;
    flex-direction: column;
    gap: 18px;

    @media (max-width: 720px) {
        width: 100%;
        flex-direction: row;
        align-items: center;
        gap: 10px;
        overflow-x: auto;
        box-shadow: 0 2px 10px rgba(101, 72, 35, 0.12);
    }
`;

export const SidebarBrand = styled.div`
    font-weight: 800;
    font-size: 15px;
    padding: 0 8px;
    white-space: nowrap;

    @media (max-width: 720px) {
        display: none;
    }
`;

export const SidebarNav = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;

    @media (max-width: 720px) {
        flex-direction: row;
    }
`;

export const SidebarItem = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border: none;
    border-radius: 12px;
    background: ${({ $active }) => ($active ? "rgba(139, 101, 60, 0.18)" : "transparent")};
    color: ${({ $active }) => ($active ? "#5b3f22" : "#7a5a35")};
    font-weight: ${({ $active }) => ($active ? 700 : 600)};
    font-size: 14px;
    cursor: pointer;
    white-space: nowrap;
    text-align: left;

    &:hover {
        background: rgba(139, 101, 60, 0.12);
    }
`;

export const SidebarFooter = styled.div`
    margin-top: auto;

    @media (max-width: 720px) {
        margin-top: 0;
        margin-left: auto;
    }
`;

export const MainContent = styled.main`
    flex: 1;
    min-width: 0;
    padding: 24px 20px 60px;
    box-sizing: border-box;
`;

export const MainContentInner = styled.div`
    max-width: 1000px;
    margin: 0 auto;
`;

// --- Дашборд: фільтр періоду, лічильник, таблиці ---

export const FilterBar = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 20px;
`;

export const FilterButton = styled.button<{ $active: boolean }>`
    padding: 8px 16px;
    border: 2px solid ${({ $active }) => ($active ? "#c9974f" : "transparent")};
    border-radius: 12px;
    background: ${({ $active }) => ($active ? "rgba(201, 151, 79, 0.2)" : "rgba(139, 101, 60, 0.08)")};
    color: #5b3f22;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;

    &:hover {
        background: rgba(201, 151, 79, 0.25);
    }
`;

export const DateRangeRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

export const DateInput = styled.input`
    padding: 8px 10px;
    border-radius: 10px;
    border: 2px solid rgba(139, 101, 60, 0.25);
    background: #fffaf0;
    color: #5b3f22;
    font-size: 13px;
    outline: none;

    &:focus {
        border-color: #c9974f;
    }
`;

export const StatCardRow = styled.div`
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 24px;
`;

export const StatCard = styled.div`
    background: #fffaf0;
    border-radius: 18px;
    padding: 18px 22px;
    box-shadow: 0 6px 16px rgba(101, 72, 35, 0.12);
    min-width: 180px;
`;

export const StatValue = styled.div`
    font-size: 32px;
    font-weight: 800;
    color: #8B4513;
`;

export const StatLabel = styled.div`
    font-size: 13px;
    color: #7a5a35;
    margin-top: 2px;
`;

export const EmptyState = styled.p`
    padding: 24px;
    text-align: center;
    color: #7a5a35;
    font-size: 14px;
`;

export const TableWrap = styled.div`
    overflow-x: auto;
`;

export const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
`;

export const Th = styled.th`
    text-align: left;
    padding: 10px 12px;
    color: #7a5a35;
    font-weight: 700;
    border-bottom: 2px solid rgba(139, 101, 60, 0.2);
    white-space: nowrap;
`;

export const Td = styled.td`
    padding: 9px 12px;
    border-bottom: 1px solid rgba(139, 101, 60, 0.12);
    white-space: nowrap;
`;

// --- Імена: список + форма додавання/редагування ---

export const NameList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const NameRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(139, 101, 60, 0.06);
    flex-wrap: wrap;
`;

export const NameLabel = styled.div`
    flex: 1;
    min-width: 140px;
    font-weight: 600;
`;

export const InlineActions = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;
