import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";

export function Header() {
  return (
    <header className="site-header">
      <div className="container nav">
        <Link href="/" aria-label="БудПоміч, головна">
          <Image
            className="brand-logo"
            src="/logo/budpomich-logo.svg"
            alt="БудПоміч"
            width={790}
            height={420}
            priority
          />
        </Link>
        <nav className="nav-links" aria-label="Головна навігація">
          <Link href="/feed">Стрічка</Link>
          <Link href="/#portfolio">Портфоліо</Link>
          <Link href="/profile/andrii-koval">Профіль</Link>
          <Link href="/#promotion">Реклама</Link>
        </nav>
        <div className="nav-actions">
          <Link className="btn btn-ghost" href="/auth/login">
            Увійти
          </Link>
          <Link className="btn btn-primary" href="/auth/register">
            Створити профіль
          </Link>
        </div>
        <Link className="mobile-menu" href="/feed" aria-label="Відкрити меню">
          <Menu size={22} />
        </Link>
      </div>
    </header>
  );
}
