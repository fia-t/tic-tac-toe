"use client";
import { GameButton } from "@game/components/GameButton";
import { IconClose } from "@game/components/GameIcons";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Chrome/Edge/Android блокують стандартний мінірофіту-банер install, якщо сторінка
// раніше викликала preventDefault() на beforeinstallprompt - цей компонент ловить
// подію, ховає нативний банер і показує власну неінтрузивну кнопку замість нього.
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Гра в iframe новини (/embed) - без пропозиції встановити застосунок.
    if (window.location.pathname.startsWith("/embed")) return;
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div
      role="group"
      aria-label="Install Tic Tac Toe Online"
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "#2b1a08",
        color: "#f5e0b6",
        padding: "10px 16px",
        borderRadius: 999,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        fontSize: 14,
      }}
    >
      <span>Install Tic Tac Toe Online?</span>
      <GameButton size="xs" tone="primary" onClick={handleInstall}>
        Install
      </GameButton>
      <GameButton
        size="xs"
        square
        onClick={() => setDismissed(true)}
        aria-label="Dismiss install prompt"
        icon={<IconClose size={14} />}
      />
    </div>
  );
}
