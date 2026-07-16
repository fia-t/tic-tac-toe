import type { Metadata } from "next";
import { siteConfig } from "./site-config";

type BuildMetadataOptions = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string;
  noindex?: boolean;
  type?: "website" | "article";
};

// Один генератор метаданих для всіх сторінок - гарантує, що title/description/
// canonical/OpenGraph/Twitter завжди узгоджені й нікуди не забуті на новій сторінці.
export function buildMetadata({
  title,
  description,
  path,
  keywords = [],
  image = "/opengraph-image",
  noindex = false,
  type = "website",
}: BuildMetadataOptions): Metadata {
  const url = `${siteConfig.url}${path}`;
  const fullTitle = path === "/" ? title : `${title} | ${siteConfig.name}`;

  return {
    title: fullTitle,
    description,
    keywords: [...new Set([...keywords, ...siteConfig.keywords])],
    alternates: {
      canonical: url,
    },
    robots: noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: siteConfig.name,
      images: [{ url: image, width: 1200, height: 630, alt: fullTitle }],
      locale: "en_US",
      type,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
      site: siteConfig.twitterHandle,
    },
  };
}
