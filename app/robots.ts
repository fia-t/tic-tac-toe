import type { MetadataRoute } from "next";
import { siteConfig } from "@/app/lib/seo/site-config";

// Next.js App Router генерує /robots.txt із цього файлу (MetadataRoute.Robots) -
// офіційна заміна статичного public/robots.txt.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
