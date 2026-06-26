"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import type { MasterProfile } from "@/lib/masters";
import {
  type EditableMasterProfile,
  masterProfileStorageKey,
  mergeMasterProfile,
} from "@/lib/master-profile-edit";

type MastersCatalogViewProps = {
  masters: MasterProfile[];
};

export function MastersCatalogView({ masters }: MastersCatalogViewProps) {
  const [profileEdits, setProfileEdits] = useState<Record<string, EditableMasterProfile>>({});
  const visibleMasters = useMemo(
    () => masters.map((master) => mergeMasterProfile(master, profileEdits[master.id])),
    [masters, profileEdits],
  );

  useEffect(() => {
    const localProfiles = JSON.parse(
      localStorage.getItem(masterProfileStorageKey) ?? "{}",
    ) as Record<string, EditableMasterProfile>;

    setProfileEdits(localProfiles);

    masters.forEach((master) => {
      fetch(`/api/profile?masterId=${encodeURIComponent(master.id)}`)
        .then((response) => response.json())
        .then((result: { profile?: EditableMasterProfile | null }) => {
          if (!result.profile) return;
          setProfileEdits((current) => {
            const existing = current[master.id];
            return {
              ...current,
              [master.id]: {
                ...existing,
                ...result.profile!,
                avatarUrl: result.profile!.avatarUrl || existing?.avatarUrl || "",
                coverImageUrl: result.profile!.coverImageUrl || existing?.coverImageUrl || "",
              },
            };
          });
        })
        .catch(() => undefined);
    });
  }, [masters]);

  return (
    <main className="masters-page">
      <SiteHeader active="masters" showBecomeMaster />

      <section className="masters-hero">
        <div>
          <p className="eyebrow">Надійні фахівці поруч</p>
          <h1>Знайдіть майстра для вашого завдання</h1>
          <p>
            Порівнюйте досвід, ціни та відгуки. Обирайте спеціаліста, якому
            готові довірити свою оселю.
          </p>
        </div>

        <div className="hero-stat">
          <strong>{visibleMasters.length}</strong>
          <span>перевірених профілів у каталозі</span>
        </div>
      </section>

      <section className="masters-catalog">
        <div className="catalog-heading">
          <div>
            <p className="eyebrow">Каталог майстрів</p>
            <h2>Оберіть свого фахівця</h2>
          </div>

          <p>Знайдено {visibleMasters.length} майстрів</p>
        </div>

        <div className="masters-grid">
          {visibleMasters.map((master) => (
            <article className="directory-card" key={master.id}>
              <div className="directory-card-top">
                <div className={`directory-avatar avatar-${master.accent}`}>
                  {master.avatarUrl ? (
                    <img
                      src={master.avatarUrl}
                      alt={`Фото ${master.name}`}
                      style={{
                        objectPosition: `${master.avatarPositionX ?? 50}% ${master.avatarPositionY ?? 35}%`,
                        transformOrigin: `${master.avatarPositionX ?? 50}% ${master.avatarPositionY ?? 35}%`,
                        transform: `scale(${master.avatarZoom ?? 1})`,
                      }}
                    />
                  ) : (
                    <span>{master.initials}</span>
                  )}
                </div>

                <div>
                  <p className="master-profession">{master.profession}</p>
                  <h3>{master.name}</h3>
                  <p className="master-rating">
                    ★ {master.rating.toFixed(1)} · {master.reviews} відгуків
                  </p>
                  <p className="master-city">
                    ⌖ {master.city} · {master.experience}
                  </p>
                </div>
              </div>

              <p className="directory-description">{master.description}</p>

              <div className="directory-card-bottom">
                <p>
                  Ціна від
                  <strong>{master.priceFrom.toLocaleString("uk-UA")} грн</strong>
                </p>
                <Link href={`/profile/${master.id}`}>Переглянути профіль →</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="masters-footer">
        <strong>БудПоміч</strong>
        <span>Майстри, яким можна довіряти.</span>
      </footer>
    </main>
  );
}
