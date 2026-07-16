import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildMetadata } from "@/app/lib/seo/metadata";
import { blogPosts, getBlogPost } from "@/app/lib/blog/posts";
import { JsonLd, articleJsonLd } from "@/app/lib/seo/json-ld";
import { Breadcrumbs } from "@/app/components/seo/Breadcrumbs";
import { ShareButtons } from "@/app/components/social/ShareButtons";
import { AdSlot } from "@/app/components/ads/AdsManager";
import styles from "../../marketing.module.css";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  return buildMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    keywords: post.keywords,
    type: "article",
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  return (
    <article className={styles.prose}>
      <JsonLd
        data={articleJsonLd({
          title: post.title,
          description: post.description,
          path: `/blog/${post.slug}`,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
        })}
      />
      <Breadcrumbs items={[{ name: "Blog", path: "/blog" }, { name: post.title, path: `/blog/${post.slug}` }]} />

      <p className={styles.cardMeta}>
        {new Date(post.publishedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}{" "}
        · {post.readingTime}
      </p>
      <h1 className={styles.heroTitle} style={{ textAlign: "left" }}>
        {post.title}
      </h1>

      {post.sections.map((section, index) => (
        <div key={section.heading || index}>
          {section.heading && <h2>{section.heading}</h2>}
          {section.paragraphs.map((paragraph, pIndex) => (
            <p key={pIndex}>{paragraph}</p>
          ))}
        </div>
      ))}

      <ShareButtons title={post.title} path={`/blog/${post.slug}`} />

      <div className={styles.section}>
        <AdSlot position="between-content" />
      </div>

      <div className={styles.section}>
        <Link href="/blog" className={styles.ctaButtonSecondary}>
          ← Back to Blog
        </Link>
      </div>
    </article>
  );
}
