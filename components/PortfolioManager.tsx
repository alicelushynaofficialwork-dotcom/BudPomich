"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  MapPin,
  Pencil,
  Plus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  defaultPortfolioItems,
  formatUah,
  PortfolioItem,
  portfolioStorageKey,
} from "@/lib/portfolio";

const masterId = "andrii-koval";

export function PortfolioManager() {
  const [savedItems, setSavedItems] = useState<PortfolioItem[]>([]);

  useEffect(() => {
    const readItems = window.setTimeout(() => {
      const localItems = JSON.parse(
        localStorage.getItem(portfolioStorageKey) ?? "[]",
      ) as PortfolioItem[];
      setSavedItems(localItems.filter((item) => item.masterId === masterId));
    }, 0);

    fetch(`/api/portfolio?masterId=${masterId}`)
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

    return () => window.clearTimeout(readItems);
  }, []);

  const items = useMemo(() => {
    const defaults = defaultPortfolioItems.filter(
      (item) => item.masterId === masterId,
    );
    const map = new Map(
      [...defaults, ...savedItems].map((item) => [item.id, item]),
    );
    return Array.from(map.values());
  }, [savedItems]);

  return (
    <>
      <section className="portfolio-list-summary">
        <div>
          <BriefcaseBusiness size={21} />
          <span>
            <strong>{items.length}</strong>
            проєктів у портфоліо
          </span>
        </div>
        <Link href="/profile/andrii-koval?from=portfolio">
          Переглянути публічний профіль <ArrowRight size={16} />
        </Link>
      </section>

      <section className="portfolio-project-grid">
        {items.map((item) => (
          <article className="portfolio-project-card" key={item.id}>
            <div className="portfolio-project-image">
              <Image
                src={item.photoUrl || "/images/portfolio-triptych.png"}
                alt={item.title}
                fill
                unoptimized={item.photoUrl.startsWith("data:")}
              />
              <span>{item.objectType}</span>
              <Link
                className="portfolio-project-edit"
                href={`/dashboard/portfolio/${item.id}/edit`}
                aria-label={`Редагувати ${item.title}`}
              >
                <Pencil size={15} /> Редагувати
              </Link>
            </div>
            <div className="portfolio-project-copy">
              <p><MapPin size={14} /> {item.city}</p>
              <h2>{item.title}</h2>
              <span>{item.description}</span>
              <div className="portfolio-card-lines">
                {item.workLines.map((line) => (
                  <div key={line.id}>
                    <span>
                      <b>{line.workType}</b>
                      <small>
                        {line.volume} {line.unit} × {formatUah(line.unitPrice)}
                      </small>
                    </span>
                    <strong>{formatUah(line.total)}</strong>
                  </div>
                ))}
              </div>
              <div className="portfolio-card-total">
                <small>{item.workLines.length} позицій</small>
                <strong>{formatUah(item.totalAmount)}</strong>
              </div>
            </div>
          </article>
        ))}

        <Link className="portfolio-add-card" href="/dashboard/portfolio/new">
          <span><Plus size={25} /></span>
          <strong>Додати нову роботу</strong>
          <small>Завантажте фото та додайте кошторис виконаних робіт.</small>
        </Link>
      </section>
    </>
  );
}
