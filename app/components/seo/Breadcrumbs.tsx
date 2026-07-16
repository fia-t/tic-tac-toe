import Link from "next/link";
import { JsonLd, breadcrumbJsonLd, type BreadcrumbItem } from "@/app/lib/seo/json-ld";
import styles from "@/app/(marketing)/marketing.module.css";

// Видимі хлібні крихти + BreadcrumbList JSON-LD в одному компоненті, щоб вони
// ніколи не розсинхронізувались одне з одним.
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, ...items])} />
      <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
        <Link href="/">Home</Link>
        {items.map((item) => (
          <span key={item.path}>
            {" / "}
            <Link href={item.path}>{item.name}</Link>
          </span>
        ))}
      </nav>
    </>
  );
}
