"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Pencil,
  Star,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getMasterById } from "@/lib/masters";
import { ClientBookingCalendar } from "@/components/ClientBookingCalendar";
import { FollowMasterButton } from "@/components/FollowMasterButton";
import {
  EditableMasterProfile,
  masterProfileStorageKey,
  mergeMasterProfile,
} from "@/lib/master-profile-edit";
import {
  defaultPortfolioItems,
  formatUah,
  PortfolioItem,
  portfolioStorageKey,
} from "@/lib/portfolio";

export function PublicMasterProfile({
  masterId,
  ownerSource,
}: {
  masterId: string;
  ownerSource?: "dashboard" | "profile" | "portfolio";
}) {
  const baseMaster = getMasterById(masterId);
  const [savedItems, setSavedItems] = useState<PortfolioItem[]>([]);
  const [profileEdit, setProfileEdit] = useState<EditableMasterProfile | null>(
    null,
  );

  useEffect(() => {
    const readLocalItems = window.setTimeout(() => {
      const localItems = JSON.parse(
        localStorage.getItem(portfolioStorageKey) ?? "[]",
      ) as PortfolioItem[];
      setSavedItems(localItems.filter((item) => item.masterId === masterId));

      const localProfiles = JSON.parse(
        localStorage.getItem(masterProfileStorageKey) ?? "{}",
      ) as Record<string, EditableMasterProfile>;
      if (localProfiles[masterId]) setProfileEdit(localProfiles[masterId]);
    }, 0);

    fetch(`/api/portfolio?masterId=${encodeURIComponent(masterId)}`)
      .then((response) => response.json())
      .then((result: { items?: PortfolioItem[] }) => {
        const remoteItems = result.items;
        if (!remoteItems?.length) return;
        setSavedItems((current) => {
          const map = new Map(
            [...remoteItems, ...current].map((item) => [item.id, item]),
          );
          return Array.from(map.values());
        });
      })
      .catch(() => undefined);

    fetch(`/api/profile?masterId=${encodeURIComponent(masterId)}`)
      .then((response) => response.json())
      .then((result: { profile?: EditableMasterProfile | null }) => {
        if (result.profile) setProfileEdit(result.profile);
      })
      .catch(() => undefined);

    return () => window.clearTimeout(readLocalItems);
  }, [masterId]);

  const master = useMemo(
    () => (baseMaster ? mergeMasterProfile(baseMaster, profileEdit) : null),
    [baseMaster, profileEdit],
  );

  const portfolioItems = useMemo(() => {
    const defaults = defaultPortfolioItems.filter(
      (item) => item.masterId === masterId,
    );
    const map = new Map(
      [...defaults, ...savedItems].map((item) => [item.id, item]),
    );
    return Array.from(map.values());
  }, [masterId, savedItems]);

  if (!master) {
    return (
      <main className="public-profile-page public-profile-empty">
        <h1>Майстра не знайдено</h1>
        <Link href="/masters">Повернутися до каталогу</Link>
      </main>
    );
  }

  return (
    <main className="public-profile-page">
      {ownerSource && (
        <aside className="public-profile-owner-bar">
          <span>
            {masterId === "andrii-koval"
              ? "Ви переглядаєте свій профіль очима клієнта"
              : `Ви переглядаєте календар майстра ${master.name}`}
          </span>
          <div>
            {masterId === "andrii-koval" ? (
              <Link href="/dashboard/profile">
                <Pencil size={15} /> Редагувати профіль
              </Link>
            ) : (
              <a href="#message-master">
                <MessageSquare size={15} /> Написати майстру
              </a>
            )}
            <Link href="/dashboard">
              <LayoutDashboard size={15} /> До кабінету
            </Link>
          </div>
        </aside>
      )}
      <header className="public-profile-header">
        <Link
          className="public-profile-brand"
          href={ownerSource ? "/masters?from=dashboard" : "/masters"}
        >
          <Image
            className="public-profile-logo"
            src="/logo/budpomich-logo-v4.svg"
            alt="БудПоміч — будівельний помічник"
            width={820}
            height={380}
            priority
          />
        </Link>
        <nav>
          <Link href={ownerSource ? "/masters?from=dashboard" : "/masters"}>
            Майстри
          </Link>
          <Link href="/feed">Роботи</Link>
          {(ownerSource || masterId === "andrii-koval") && (
            <Link href="/dashboard">Кабінет</Link>
          )}
        </nav>
      </header>

      <div className="public-profile-breadcrumb">
        <Link
          href={
            ownerSource === "portfolio"
              ? "/dashboard/portfolio"
              : ownerSource === "dashboard"
                ? "/dashboard"
                : ownerSource === "profile"
                  ? "/dashboard/profile"
                  : "/masters"
          }
        >
          <ArrowLeft size={15} />
          {ownerSource === "portfolio"
            ? "Повернутися до портфоліо"
            : ownerSource === "dashboard"
              ? "Повернутися до кабінету"
              : ownerSource === "profile"
                ? "Повернутися до редагування"
                : "Каталог майстрів"}
        </Link>
      </div>

      <section className="public-profile-hero">
        <div className={`public-profile-avatar avatar-${master.accent}`}>
          {master.initials}
        </div>
        <div className="public-profile-intro">
          <p>{master.profession}</p>
          <h1>{master.name}</h1>
          <span><MapPin size={15} /> {master.city} · {master.experience}</span>
          <div><Star size={16} fill="currentColor" /> <strong>{master.rating.toFixed(1)}</strong> {master.reviews} відгуків</div>
        </div>
        <div className="public-profile-action">
          <span>Вартість робіт</span>
          <strong>від {formatUah(master.priceFrom)}</strong>
          <a href="#booking-calendar">Обрати вільну дату</a>
          <a className="public-profile-message-link" href="#message-master">
            Написати майстру
          </a>
          {masterId !== "andrii-koval" && (
            <FollowMasterButton masterId={masterId} masterName={master.name} />
          )}
        </div>
      </section>

      <ClientBookingCalendar masterId={masterId} masterName={master.name} />

      <div className="public-profile-layout">
        <div className="public-profile-main">
          <section className="public-profile-section">
            <p className="public-profile-eyebrow">Про майстра</p>
            <h2>Досвід і підхід до роботи</h2>
            <p>{master.fullDescription}</p>
          </section>

          <section className="public-profile-section">
            <div className="public-profile-title-row">
              <div>
                <p className="public-profile-eyebrow">Портфоліо</p>
                <h2>Виконані роботи</h2>
              </div>
              <span>{portfolioItems.length} робіт</span>
            </div>

            <div className="public-portfolio-list">
              {portfolioItems.map((item) => (
                <article className="public-portfolio-card" key={item.id}>
                  <div className="public-portfolio-image">
                    <Image
                      src={item.photoUrl || "/images/portfolio-triptych.png"}
                      alt={item.title}
                      fill
                      unoptimized={item.photoUrl.startsWith("data:")}
                    />
                    <span>{item.objectType}</span>
                  </div>
                  <div className="public-portfolio-copy">
                    <div>
                      <p><MapPin size={13} /> {item.city}</p>
                      <h3>{item.title}</h3>
                      <span>{item.description}</span>
                    </div>
                    <strong>{formatUah(item.totalAmount)}</strong>
                  </div>
                  <div className="public-work-lines">
                    {item.workLines.map((line) => (
                      <div key={line.id}>
                        <span>{line.workType}</span>
                        <small>{line.volume} {line.unit} × {formatUah(line.unitPrice)}</small>
                        <strong>{formatUah(line.total)}</strong>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="public-services-panel" id="services">
          <p className="public-profile-eyebrow">Послуги</p>
          <h2>Що виконує майстер</h2>
          {master.services.map((service) => (
            <div key={service.name}>
              <span>{service.name}</span>
              <strong>{service.price}</strong>
            </div>
          ))}
          <a href="#booking-calendar">Обрати дату для заявки</a>
        </aside>
      </div>
    </main>
  );
}
