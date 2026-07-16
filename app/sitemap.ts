import type { MetadataRoute } from "next";
import { siteConfig } from "@/app/lib/seo/site-config";
import { blogPosts } from "@/app/lib/blog/posts";

// Next.js App Router генерує /sitemap.xml із цього файлу автоматично -
// офіційна заміна ручного static sitemap.xml (MetadataRoute.Sitemap API).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = [
    { path: "/", changeFrequency: "daily" as const, priority: 1, lastModified: now },
    { path: "/play-vs-ai", changeFrequency: "weekly" as const, priority: 0.9, lastModified: now },
    { path: "/play-vs-friend", changeFrequency: "weekly" as const, priority: 0.9, lastModified: now },
    { path: "/multiplayer", changeFrequency: "weekly" as const, priority: 0.9, lastModified: now },
    { path: "/daily-challenge", changeFrequency: "daily" as const, priority: 0.8, lastModified: now },
    { path: "/leaderboard", changeFrequency: "daily" as const, priority: 0.7, lastModified: now },
    { path: "/how-to-play", changeFrequency: "monthly" as const, priority: 0.7, lastModified: now },
    { path: "/tic-tac-toe-rules", changeFrequency: "monthly" as const, priority: 0.7, lastModified: now },
    { path: "/about", changeFrequency: "monthly" as const, priority: 0.5, lastModified: now },
    { path: "/blog", changeFrequency: "weekly" as const, priority: 0.8, lastModified: now },
    { path: "/contact", changeFrequency: "yearly" as const, priority: 0.3, lastModified: now },
    { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.2, lastModified: now },
    { path: "/terms", changeFrequency: "yearly" as const, priority: 0.2, lastModified: now },
  ];

  const blogRoutes = blogPosts.map((post) => ({
    path: `/blog/${post.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
    lastModified: new Date(post.updatedAt || post.publishedAt),
  }));

  return [...staticRoutes, ...blogRoutes].map((route) => ({
    url: `${siteConfig.url}${route.path}`,
    lastModified: route.lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
