import Link from "next/link";
import { BadgeCheck, ExternalLink, MapPin, Phone, Send } from "lucide-react";
import { FollowButton } from "@/components/FollowButton";
import { PortfolioCard } from "@/components/PortfolioCard";
import { StatusBadge } from "@/components/StatusBadge";
import { masters, portfolio } from "@/lib/data";

export const metadata = {
  title: "Андрій Коваль — електрик | БудПоміч",
};

export default function ProfilePage() {
  const master = masters[1];

  return (
    <section className="profile-page">
      <div className="profile-cover crop-center" />
      <div className="container profile-shell">
        <div className="profile-summary">
          <div className="profile-avatar">{master.initials}</div>
          <div className="profile-intro">
            <div className="profile-title-row">
              <div>
                <p className="overline">Профіль майстра</p>
                <h1>
                  {master.name} <BadgeCheck className="verified" size={25} />
                </h1>
                <p>
                  {master.specialty} · <MapPin size={15} /> {master.city} ·{" "}
                  {master.experience}
                </p>
              </div>
              <div className="profile-buttons">
                <FollowButton />
                <button className="btn btn-ghost" type="button">
                  Залишити заявку
                </button>
              </div>
            </div>
            <StatusBadge status={master.status}>{master.statusText}</StatusBadge>
            <p className="profile-description">
              Виконую електромонтажні роботи у квартирах і приватних будинках:
              нова проводка, щитки, освітлення, розетки та підсвітка. Працюю
              акуратно й пояснюю кошторис до початку робіт.
            </p>
            <div className="profile-metrics">
              <div>
                <strong>{master.followers}</strong>
                <span>підписників</span>
              </div>
              <div>
                <strong>{master.works}</strong>
                <span>роботи</span>
              </div>
              <div>
                <strong>8</strong>
                <span>років досвіду</span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-layout">
          <aside className="profile-aside">
            <div className="info-panel">
              <p className="overline">Послуги</p>
              <div className="chips">
                {["Проводка", "Електрощит", "Розетки", "Освітлення", "Діагностика"].map(
                  (item) => (
                    <span key={item}>{item}</span>
                  ),
                )}
              </div>
            </div>
            <div className="info-panel">
              <p className="overline">Контакти</p>
              <Link href="tel:+380671234567">
                <Phone size={18} /> +38 067 123 45 67
              </Link>
              <Link href="https://t.me/" target="_blank">
                <Send size={18} /> Telegram
              </Link>
              <Link href="https://instagram.com/" target="_blank">
                <ExternalLink size={18} /> Instagram
              </Link>
            </div>
          </aside>
          <div>
            <div className="section-heading profile-portfolio-heading">
              <div>
                <p className="overline">Портфоліо</p>
                <h2>Виконані роботи</h2>
              </div>
            </div>
            <div className="profile-portfolio">
              <PortfolioCard item={portfolio[1]} />
              <PortfolioCard item={portfolio[2]} compact />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
