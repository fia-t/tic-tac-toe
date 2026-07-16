import { SiteHeader } from "@/app/components/layout/SiteHeader";
import { SiteFooter } from "@/app/components/layout/SiteFooter";
import { AdSlot } from "@/app/components/ads/AdsManager";
import styles from "./marketing.module.css";

// Route group (marketing) - обгортає лише нові SEO/контент-сторінки хедером,
// футером і рекламними слотами. Ігрові роути (/, /play, /play/[roomId], /admin)
// лишаються поза цією групою і виглядають так само, як і раніше.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <SiteHeader />
      <AdSlot position="top-banner" />
      <main id="main-content" className={styles.main}>
        {children}
      </main>
      <AdSlot position="bottom-banner" />
      <SiteFooter />
    </>
  );
}
