import Image from "next/image";
import Link from "next/link";

type HeaderNavItem = {
  href: string;
  label: string;
  active?: boolean;
};

type SiteHeaderProps = {
  active?: "masters" | "feed" | "dashboard";
  navItems?: HeaderNavItem[];
  showLogin?: boolean;
  showMasterCard?: boolean;
  showBecomeMaster?: boolean;
  showBecomeClient?: boolean;
};

export function SiteHeader({
  active,
  navItems,
  showLogin = false,
  showMasterCard = false,
  showBecomeMaster = false,
  showBecomeClient = false,
}: SiteHeaderProps) {
  const links =
    navItems ??
    [
      { href: "/masters", label: "Майстри", active: active === "masters" },
      { href: "/feed", label: "Роботи", active: active === "feed" },
      { href: "/dashboard", label: "Кабінет", active: active === "dashboard" },
    ];

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link className="app-logo" href="/" aria-label="БудПомiч">
          <Image
            src="/logo/budpomich-logo-v4.svg"
            alt="БудПомiч"
            width={220}
            height={117}
            priority
            style={{ width: 220, height: "auto" }}
          />
        </Link>

        <nav className="app-nav" aria-label="Основна навігація">
          {links.map((item) => (
            <Link className={item.active ? "active" : ""} href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="app-header-actions">
          {showLogin && (
            <Link className="header-login" href="/auth/login">
              Увійти
            </Link>
          )}

          {showBecomeMaster && (
            <Link className="header-cta" href="/auth/register">
              Стати майстром
            </Link>
          )}

          {showBecomeClient && (
            <Link className="header-cta header-client-cta" href="/client/dashboard">
              Стати клієнтом
            </Link>
          )}

          {showMasterCard && (
            <Link className="header-master-card" href="/profile/andrey-ponomarenko">
              <span className="avatar avatar-small">АП</span>
              <span>
                <strong>Профіль майстра</strong>
                <small>Андрей Пономаренко · Київ</small>
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
