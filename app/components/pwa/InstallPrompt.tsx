"use client";
import { GameButton } from "@game/components/GameButton";
import { IconClose } from "@game/components/GameIcons";
import { useT } from "@game/lib/i18n";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Chrome/Edge/Android блокують стандартний мінірофіту-банер install, якщо сторінка
// раніше викликала preventDefault() на beforeinstallprompt - цей компонент ловить
// подію, ховає нативний банер і показує власну неінтрузивну кнопку замість нього.
// Стоїть над нижнім меню (не під ним) і поверх нього за шаром (меню - z-index 1400).
export function InstallPrompt() {
  const t = useT();
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
      aria-label={t("installAsk")}
      style={{
        position: "fixed",
        bottom: "calc(100px + env(safe-area-inset-bottom, 0px))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1450,
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "max-content",
        maxWidth: "calc(100vw - 24px)",
        boxSizing: "border-box",
        background: "#2b1a08",
        color: "#f5e0b6",
        padding: "8px 8px 8px 16px",
        borderRadius: 999,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        fontSize: 15,
        fontWeight: 700,
        lineHeight: 1.2,
      }}
    >
      <span style={{ minWidth: 0 }}>{t("installAsk")}</span>
      <GameButton size="xs" tone="primary" onClick={handleInstall}>
        {t("installBtn")}
      </GameButton>
      <GameButton size="xs" square onClick={() => setDismissed(true)} aria-label={t("installHide")} icon={<IconClose size={14} />} />
    </div>
  );
}
