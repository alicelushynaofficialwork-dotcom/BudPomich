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
          setProfileEdits((current) => ({ ...current, [master.id]: result.profile as EditableMasterProfile }));
        })
        .catch(() => undefined);
    });
  }, [masters]);

  return (
    <main className="masters-page">
      <SiteHeader active="masters" showBecomeMaster />

      <section className="masters-hero">
        <div>
          <p className="eyebrow">РќР°РґС–Р№РЅС– С„Р°С…С–РІС†С– РїРѕСЂСѓС‡</p>
          <h1>Р—РЅР°Р№РґС–С‚СЊ РјР°Р№СЃС‚СЂР° РґР»СЏ РІР°С€РѕРіРѕ Р·Р°РІРґР°РЅРЅСЏ</h1>
          <p>
            РџРѕСЂС–РІРЅСЋР№С‚Рµ РґРѕСЃРІС–Рґ, С†С–РЅРё С‚Р° РІС–РґРіСѓРєРё. РћР±РёСЂР°Р№С‚Рµ СЃРїРµС†С–Р°Р»С–СЃС‚Р°, СЏРєРѕРјСѓ
            РіРѕС‚РѕРІС– РґРѕРІС–СЂРёС‚Рё СЃРІРѕСЋ РѕСЃРµР»СЋ.
          </p>
        </div>

        <div className="hero-stat">
          <strong>{visibleMasters.length}</strong>
          <span>РїРµСЂРµРІС–СЂРµРЅРёС… РїСЂРѕС„С–Р»С–РІ Сѓ РєР°С‚Р°Р»РѕР·С–</span>
        </div>
      </section>

      <section className="masters-catalog">
        <div className="catalog-heading">
          <div>
            <p className="eyebrow">РљР°С‚Р°Р»РѕРі РјР°Р№СЃС‚СЂС–РІ</p>
            <h2>РћР±РµСЂС–С‚СЊ СЃРІРѕРіРѕ С„Р°С…С–РІС†СЏ</h2>
          </div>

          <p>Р—РЅР°Р№РґРµРЅРѕ {visibleMasters.length} РјР°Р№СЃС‚СЂС–РІ</p>
        </div>

        <div className="masters-grid">
          {visibleMasters.map((master) => (
            <article className="directory-card" key={master.id}>
              <div className="directory-card-top">
                <div className={`directory-avatar avatar-${master.accent}`}>
                  <span>{master.initials}</span>
                </div>

                <div>
                  <p className="master-profession">{master.profession}</p>
                  <h3>{master.name}</h3>
                  <p className="master-rating">
                    в… {master.rating.toFixed(1)} В· {master.reviews} РІС–РґРіСѓРєС–РІ
                  </p>
                  <p className="master-city">
                    вЊ– {master.city} В· {master.experience}
                  </p>
                </div>
              </div>

              <p className="directory-description">{master.description}</p>

              <div className="directory-card-bottom">
                <p>
                  Р¦С–РЅР° РІС–Рґ
                  <strong>{master.priceFrom.toLocaleString("uk-UA")} РіСЂРЅ</strong>
                </p>
                <Link href={`/profile/${master.id}`}>РџРµСЂРµРіР»СЏРЅСѓС‚Рё РїСЂРѕС„С–Р»СЊ в†’</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="masters-footer">
        <strong>Р‘СѓРґРџРѕРјС–С‡</strong>
        <span>РњР°Р№СЃС‚СЂРё, СЏРєРёРј РјРѕР¶РЅР° РґРѕРІС–СЂСЏС‚Рё.</span>
      </footer>
    </main>
  );
}
