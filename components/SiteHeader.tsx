import Image from "next/image";
import Link from "next/link";

type SiteHeaderProps = {
  active?: "masters" | "feed" | "dashboard";
  showMasterCard?: boolean;
  showBecomeMaster?: boolean;
};

export function SiteHeader({
  active,
  showMasterCard = false,
  showBecomeMaster = false,
}: SiteHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link className="app-logo" href="/masters" aria-label="BudPomich">
          <Image
            src="/logo/budpomich-logo.svg"
            alt="BudPomich"
            width={158}
            height={84}
            priority
          />
        </Link>

        <nav className="app-nav" aria-label="Основна навігація">
          <Link className={active === "masters" ? "active" : ""} href="/masters">
            Майстри
          </Link>
          <Link className={active === "feed" ? "active" : ""} href="/feed">
            Роботи
          </Link>
          <Link className={active === "dashboard" ? "active" : ""} href="/dashboard">
            Кабінет
          </Link>
        </nav>

        {showBecomeMaster && (
          <Link className="header-cta" href="/auth/register">
            Стати майстром
          </Link>
        )}

        {showMasterCard && (
          <Link className="header-master-card" href="/profile/andrii-koval">
            <span className="avatar avatar-small">АК</span>
            <span>
              <strong>Андрій Коваль</strong>
              <small>Електрик · Київ</small>
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
