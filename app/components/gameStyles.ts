"use client";
import styled from "styled-components";

export const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  background-image: url('/images/background-image.jpg');
  background-size: cover;
  background-position: center;
  color: white;
`;

// Додаємо стиль для заголовка
export const Title = styled.h1`
    margin-bottom: 20px;
    color: #8B4513;  // Використовуємо колір ліній у клітинках
    font-size: 28px;
    font-weight: bold;
    text-align: center;
`;


// Стилі для ігрового контейнера
export const BoardContainer = styled.div`
    width: 700px;
    height: 500px;
    background: url('/images/sand.png') no-repeat center/cover;
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, 160px);
    grid-template-rows: repeat(3, 160px);
    gap: 0;
    padding: 10px;
    box-sizing: border-box;
    justify-content: start;
    align-content: center;
`;

export const Cell = styled.div<{ $borderStyle?: string }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 160px;
    height: 160px;
    background-color: transparent;
    ${({ $borderStyle }) => $borderStyle};
    font-size: 60px;
    font-weight: bold;
    cursor: pointer;
`;

export const ButtonContainer = styled.div`
    position: absolute;
    top: 50px;
    right: 50px;
    display: flex;
    flex-direction: column;
    gap: 10px; /* Відстань між кнопками */
`;

export const Button = styled.button`
    width: 70px;
    height: 70px;
    background-color: #67584b;
    border: none;
    border-radius: 15px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);

    &:hover {
        background-color: rgb(152, 119, 88);
        opacity: 0.9;
    }
`;

export const RestartIcon = styled.img`
    width: 24px;
    height: 24px;
`;
export const TraditionalIcon = styled.img`
    width: 24px;
    height: 24px;
`;
export const DifficultIcon = styled.img`
    width: 24px;
    height: 24px;
`;

export const Popup = styled.div<{ $result: string }>`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${({ $result }) => ($result === "win" ? "#4CAF50" : $result === "lose" ? "#F44336" : "#FF9800")};
    color: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.2);
    text-align: center;
    font-size: 24px;
    z-index: 1000;
    cursor: pointer;
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

export const borderStyles = [
    "border-right: 4px solid #8B4513; border-bottom: 4px solid #8B4513;",
    "border-right: 4px solid #8B4513; border-bottom: 4px solid #8B4513;",
    "border-bottom: 4px solid #8B4513;",
    "border-right: 4px solid #8B4513; border-bottom: 4px solid #8B4513;",
    "border-right: 4px solid #8B4513; border-bottom: 4px solid #8B4513;",
    "border-bottom: 4px solid #8B4513;",
    "border-right: 4px solid #8B4513;",
    "border-right: 4px solid #8B4513;",
    ""
];

// --- Стилі для Ultimate Tic-Tac-Toe (режим "Складний") ---

export const UltimateBoardContainer = styled.div`
    width: 700px;
    height: 500px;
    background: url('/images/sand.png') no-repeat center/cover;
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, 148px);
    grid-template-rows: repeat(3, 148px);
    gap: 8px;
    padding: 10px;
    box-sizing: border-box;
    justify-content: start;
    align-content: center;
`;

export const MiniBoardWrapper = styled.div<{ $isActive: boolean; $isLocked: boolean }>`
    position: relative;
    width: 148px;
    height: 148px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    box-sizing: border-box;
    background-color: rgba(255, 255, 255, 0.08);
    border: 3px solid ${({ $isActive }) => ($isActive ? "#FFD700" : "#8B4513")};
    box-shadow: ${({ $isActive }) => ($isActive ? "0 0 8px 2px rgba(255, 215, 0, 0.8)" : "none")};
    opacity: ${({ $isLocked }) => ($isLocked ? 0.55 : 1)};
`;

export const MiniCell = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(139, 69, 19, 0.5);
    cursor: pointer;
`;

export const MiniBoardResultOverlay = styled.div`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.35);
    pointer-events: none;
`;

export const MiniBoardDrawLabel = styled.span`
    font-size: 48px;
    font-weight: bold;
    color: #f5f5f5;
`;
