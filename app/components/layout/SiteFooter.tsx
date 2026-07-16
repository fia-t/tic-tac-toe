import Link from "next/link";
import { getDictionary } from "@/app/lib/i18n/get-dictionary";
import styles from "@/app/(marketing)/marketing.module.css";

export async function SiteFooter() {
  const dict = await getDictionary("en");
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <p className={styles.footerTagline}>{dict.footer.tagline}</p>
        <ul className={styles.footerLinks}>
          <li><Link href="/about">{dict.nav.about}</Link></li>
          <li><Link href="/blog">{dict.nav.blog}</Link></li>
          <li><Link href="/contact">{dict.footer.contact}</Link></li>
          <li><Link href="/privacy">{dict.footer.privacy}</Link></li>
          <li><Link href="/terms">{dict.footer.terms}</Link></li>
        </ul>
      </div>
      <div className={styles.footerBottom} style={{ textAlign: "center" }}>
        © {year} Tic Tac Toe Online. {dict.footer.rights}
      </div>
    </footer>
  );
}
