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
