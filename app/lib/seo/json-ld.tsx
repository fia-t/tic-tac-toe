import { siteConfig } from "./site-config";

// script[type=application/ld+json] дітей JSON.stringify не екранує сам собою,
// а `<` у рядкових значеннях міг би передчасно закрити тег - тому екрануємо вручну.
function toJsonLdScript(data: Record<string, unknown>) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: toJsonLdScript(data) }}
    />
  );
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.organization.name,
    url: siteConfig.organization.url,
    logo: siteConfig.organization.logo,
    sameAs: siteConfig.organization.sameAs,
  };
}

export function webApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "120",
    },
  };
}

export function videoGameJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    genre: ["Puzzle", "Strategy", "Board Game"],
    gamePlatform: ["Web Browser"],
    numberOfPlayers: {
      "@type": "QuantitativeValue",
      minValue: 1,
      maxValue: 2,
    },
    applicationCategory: "Game",
    publisher: {
      "@type": "Organization",
      name: siteConfig.organization.name,
    },
  };
}

export type BreadcrumbItem = { name: string; path: string };

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteConfig.url}${item.path}`,
    })),
  };
}

export function articleJsonLd(options: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
}) {
  const { title, description, path, datePublished, dateModified, image } = options;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    url: `${siteConfig.url}${path}`,
    datePublished,
    dateModified: dateModified || datePublished,
    image: image ? `${siteConfig.url}${image}` : `${siteConfig.url}/opengraph-image`,
    author: {
      "@type": "Organization",
      name: siteConfig.author,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.organization.name,
      logo: {
        "@type": "ImageObject",
        url: siteConfig.organization.logo,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteConfig.url}${path}`,
    },
  };
}
