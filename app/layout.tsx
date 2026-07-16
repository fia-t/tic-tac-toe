import type { Metadata, Viewport } from "next";
import { GlobalStyle } from "@/app/components/gameStyles";
import StyledComponentsRegistry from "@/app/lib/registry";
import { siteConfig } from "@/app/lib/seo/site-config";
import { JsonLd, organizationJsonLd, webApplicationJsonLd } from "@/app/lib/seo/json-ld";
import { GoogleAnalytics } from "@/app/components/analytics/GoogleAnalytics";
import { GoogleTagManager, GoogleTagManagerNoscript } from "@/app/components/analytics/GoogleTagManager";
import { ServiceWorkerRegistration } from "@/app/components/pwa/ServiceWorkerRegistration";
import { InstallPrompt } from "@/app/components/pwa/InstallPrompt";
import { AdsProviderScripts } from "@/app/components/ads/AdsManager";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} - Play Free, No Download`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.author }],
  generator: "Next.js",
  referrer: "strict-origin-when-cross-origin",
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    type: "website",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} - Play Free, No Download`,
    description: siteConfig.description,
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: siteConfig.name }],
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitterHandle,
    title: `${siteConfig.name} - Play Free, No Download`,
    description: siteConfig.description,
  },
};

// Без цього мобільні браузери (Android Chrome, iOS Safari) рендерять сторінку
// в "десктопній" ширині ~980px і масштабують її, тому адаптивна верстка не діє.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: siteConfig.themeColor,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={webApplicationJsonLd()} />
      </head>
      <body>
        <GoogleTagManagerNoscript />
        <StyledComponentsRegistry>
          <GlobalStyle />
          {children}
        </StyledComponentsRegistry>
        <ServiceWorkerRegistration />
        <InstallPrompt />
        <GoogleAnalytics />
        <GoogleTagManager />
        <AdsProviderScripts />
      </body>
    </html>
  )
}
