"use client";
import { useEffect, useRef } from "react";
import Script from "next/script";

export type AdPosition = "top-banner" | "bottom-banner" | "sidebar" | "between-content" | "reward";

type AdProvider = "adsense" | "nitropay" | "setupad" | "mediavine" | "none";

const PROVIDER = (process.env.NEXT_PUBLIC_AD_PROVIDER || "none") as AdProvider;

const POSITION_LABEL: Record<AdPosition, string> = {
  "top-banner": "Top banner ad",
  "bottom-banner": "Bottom banner ad",
  sidebar: "Sidebar ad",
  "between-content": "In-content ad",
  reward: "Reward ad",
};

// AdSense використовує один глобальний <Script> на весь сайт (див. AdSenseLoader
// нижче), тому кожен окремий слот лише вставляє <ins> і викликає adsbygoogle.push.
function AdSenseSlot({ position }: { position: AdPosition }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const slotByPosition: Partial<Record<AdPosition, string | undefined>> = {
    "top-banner": process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP,
    "bottom-banner": process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM,
    sidebar: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR,
    "between-content": process.env.NEXT_PUBLIC_ADSENSE_SLOT_INCONTENT,
  };
  const slot = slotByPosition[position];
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!client || !slot) return;
    try {
      // @ts-expect-error - adsbygoogle - зовнішній глобал, який додає AdSenseLoader
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense-скрипт ще не завантажився або заблокований блокувальником реклами - не критично.
    }
  }, [client, slot]);

  if (!client || !slot) return <AdPlaceholder position={position} reason="AdSense: не задано NEXT_PUBLIC_ADSENSE_CLIENT або slot" />;

  return (
    <ins
      ref={insRef}
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

// Один раз на сторінку підключає adsbygoogle.js - без цього <ins class="adsbygoogle">
// у слотах вище нічого не відрендерить.
export function AdSenseLoader() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (PROVIDER !== "adsense" || !client) return null;
  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}

function NitroPaySlot({ position }: { position: AdPosition }) {
  const siteId = process.env.NEXT_PUBLIC_NITROPAY_SITE_ID;
  if (!siteId) return <AdPlaceholder position={position} reason="NitroPay: не задано NEXT_PUBLIC_NITROPAY_SITE_ID" />;
  // NitroPay розміщує рекламу через власний глобальний скрипт (nitroAds.createAd),
  // який підвантажується NitroPayLoader - тут лише контейнер з унікальним id.
  return <div id={`nitropay-${position}`} data-nitropay-position={position} />;
}

export function NitroPayLoader() {
  const siteId = process.env.NEXT_PUBLIC_NITROPAY_SITE_ID;
  if (PROVIDER !== "nitropay" || !siteId) return null;
  return <Script async src="https://s.nitropay.com/ads-2058.js" strategy="afterInteractive" />;
}

function SetupadSlot({ position }: { position: AdPosition }) {
  const publisherId = process.env.NEXT_PUBLIC_SETUPAD_PUBLISHER_ID;
  if (!publisherId) return <AdPlaceholder position={position} reason="Setupad: не задано NEXT_PUBLIC_SETUPAD_PUBLISHER_ID" />;
  return <div className="setupad-ad" data-setupad-position={position} data-publisher-id={publisherId} />;
}

function MediavineSlot({ position }: { position: AdPosition }) {
  // Mediavine вимагає окремого схвалення трафіку (мінімум сесій/міс) і
  // під'єднання через їхній акаунт-менеджер - тут лише зарезервоване місце
  // на майбутнє, коли сайт досягне порогу і матиме реальний Mediavine-акаунт.
  return <AdPlaceholder position={position} reason="Mediavine: інтеграція заплановна на майбутнє" />;
}

// Видиме в dev/no-provider режимі місце під рекламу - зберігає розмітку
// сторінки стабільною, щоб додавання реальної реклами пізніше не зсувало контент (CLS).
function AdPlaceholder({ position, reason }: { position: AdPosition; reason: string }) {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <div
      role="complementary"
      aria-label={POSITION_LABEL[position]}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: position === "sidebar" ? 250 : 90,
        border: "1px dashed rgba(139, 69, 19, 0.4)",
        borderRadius: 8,
        color: "rgba(139, 69, 19, 0.7)",
        fontSize: 12,
        padding: 8,
        textAlign: "center",
      }}
      title={reason}
    >
      {POSITION_LABEL[position]} ({PROVIDER})
    </div>
  );
}

/**
 * Єдина точка входу для розміщення реклами. Перемикання провайдера - це
 * лише зміна NEXT_PUBLIC_AD_PROVIDER (adsense | nitropay | setupad | mediavine | none),
 * розмітка сторінок не змінюється.
 */
export function AdSlot({ position }: { position: AdPosition }) {
  switch (PROVIDER) {
    case "adsense":
      return <AdSenseSlot position={position} />;
    case "nitropay":
      return <NitroPaySlot position={position} />;
    case "setupad":
      return <SetupadSlot position={position} />;
    case "mediavine":
      return <MediavineSlot position={position} />;
    default:
      return <AdPlaceholder position={position} reason="Рекламу вимкнено (NEXT_PUBLIC_AD_PROVIDER=none)" />;
  }
}

// Підключає скрипти провайдерів один раз на сторінку - додайте у RootLayout.
export function AdsProviderScripts() {
  return (
    <>
      <AdSenseLoader />
      <NitroPayLoader />
    </>
  );
}
