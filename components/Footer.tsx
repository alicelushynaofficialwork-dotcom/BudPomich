import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Image
            className="footer-logo"
            src="/logo/budpomich-logo.svg"
            alt="БудПоміч"
            width={790}
            height={420}
          />
          <p>Професійна спільнота майстрів та будівельних бригад України.</p>
        </div>
        <div className="footer-links">
          <Link href="/feed">Стрічка робіт</Link>
          <Link href="/profile/andrii-koval">Профіль майстра</Link>
          <Link href="/auth/register">Реєстрація</Link>
        </div>
        <p className="copyright">© 2026 БудПоміч. MVP 1.0</p>
      </div>
    </footer>
  );
}
