import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/app/lib/seo/metadata";
import { blogPosts } from "@/app/lib/blog/posts";
import { Breadcrumbs } from "@/app/components/seo/Breadcrumbs";
import { AdSlot } from "@/app/components/ads/AdsManager";
import styles from "../marketing.module.css";

export const metadata: Metadata = buildMetadata({
  title: "Blog - Tic Tac Toe Strategy, History & Browser Games",
  description:
    "Read strategy guides, AI explainers, and the history of Tic Tac Toe, plus articles on the best browser and HTML5 games.",
  path: "/blog",
  keywords: ["tic tac toe blog", "tic tac toe strategy guide", "browser games blog"],
});

export default function BlogIndexPage() {
  const posts = [...blogPosts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return (
    <>
      <Breadcrumbs items={[{ name: "Blog", path: "/blog" }]} />
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Tic Tac Toe Blog</h1>
        <p className={styles.heroSubtitle}>
          Strategy guides, AI deep-dives, and the surprisingly long history of the world&apos;s
          simplest game.
        </p>
      </div>

      <div className={styles.cardGrid}>
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.card}>
            <p className={styles.cardMeta}>
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              · {post.readingTime}
            </p>
            <h2 className={styles.cardTitle}>{post.title}</h2>
            <p className={styles.cardDescription}>{post.description}</p>
          </Link>
        ))}
      </div>

      <div className={styles.section}>
        <AdSlot position="between-content" />
      </div>
    </>
  );
}
