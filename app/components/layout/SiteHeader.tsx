import Link from "next/link";
import { getDictionary } from "@/app/lib/i18n/get-dictionary";
import styles from "@/app/(marketing)/marketing.module.css";

export async function SiteHeader() {
  const dict = await getDictionary("en");

  const links = [
    { href: "/", label: dict.nav.home },
    { href: "/play-vs-ai", label: dict.nav.playVsAi },
    { href: "/play-vs-friend", label: dict.nav.playVsFriend },
    { href: "/multiplayer", label: dict.nav.multiplayer },
    { href: "/daily-challenge", label: dict.nav.dailyChallenge },
    { href: "/leaderboard", label: dict.nav.leaderboard },
    { href: "/how-to-play", label: dict.nav.howToPlay },
    { href: "/tic-tac-toe-rules", label: dict.nav.rules },
    { href: "/blog", label: dict.nav.blog },
    { href: "/about", label: dict.nav.about },
    { href: "/contact", label: dict.nav.contact },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.logo} aria-label="Tic Tac Toe Online - Home">
          <span aria-hidden="true">✕⭕</span> Tic Tac Toe Online
        </Link>

        <nav className={styles.nav} aria-label="Main navigation">
          <ul className={styles.navList}>
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={styles.navLink}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <details className={styles.mobileMenu}>
          <summary aria-label={dict.nav.menu}>{dict.nav.menu} ▾</summary>
          <nav aria-label="Mobile navigation">
            <ul className={styles.navList}>
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={styles.navLink}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </details>
      </div>
    </header>
  );
}
