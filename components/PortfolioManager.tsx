"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  MapPin,
  Pencil,
  Plus,
  Share2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  defaultPortfolioItems,
  formatUah,
  getPortfolioPeriod,
  getProjectPublicLocation,
  getProjectSlug,
  getPublicProjectDocuments,
  PortfolioItem,
  portfolioWorkCategories,
  portfolioStorageKey,
} from "@/lib/portfolio";

const masterId = "andrey-ponomarenko";
const monthNames = [
  "січень",
  "лютий",
  "березень",
  "квітень",
  "травень",
  "червень",
  "липень",
  "серпень",
  "вересень",
  "жовтень",
  "листопад",
  "грудень",
];

export function PortfolioManager() {
  const [savedItems, setSavedItems] = useState<PortfolioItem[]>([]);
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("Усі роботи");

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

  const years = useMemo(
    () => Array.from(new Set(items.map((item) => getPortfolioPeriod(item).year))).sort((a, b) => b - a),
    [items],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const period = getPortfolioPeriod(item);
      const matchesYear = yearFilter === "all" || String(period.year) === yearFilter;
      const matchesMonth = monthFilter === "all" || String(period.month) === monthFilter;
      const matchesCategory =
        categoryFilter === "Усі роботи" || (item.workCategory || item.workLines[0]?.workType || "Інше") === categoryFilter;

      return matchesYear && matchesMonth && matchesCategory;
    });
  }, [categoryFilter, items, monthFilter, yearFilter]);

  const portfolioStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const thisYearCount = items.filter((item) => getPortfolioPeriod(item).year === currentYear).length;
    const totalVolume = items.reduce(
      (sum, item) => sum + item.workLines.reduce((lineSum, line) => lineSum + line.volume, 0),
      0,
    );
    const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);

    return { thisYearCount, totalVolume, totalAmount };
  }, [items]);

  async function shareItem(item: PortfolioItem) {
    const url = `${window.location.origin}/profile/${masterId}#work-detail-${getProjectSlug(item)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
    } catch {
      await navigator.clipboard.writeText(url).catch(() => undefined);
    }
  }

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
        <div>
          <CalendarDays size={21} />
          <span>
            <strong>{portfolioStats.thisYearCount}</strong>
            робіт цього року
          </span>
        </div>
        <div>
          <BriefcaseBusiness size={21} />
          <span>
            <strong>{portfolioStats.totalVolume.toLocaleString("uk-UA")}</strong>
            загальний обсяг
          </span>
        </div>
        <div>
          <FileText size={21} />
          <span>
            <strong>{formatUah(portfolioStats.totalAmount)}</strong>
            сума робіт
          </span>
        </div>
        <Link href={`/profile/${masterId}?from=profile#portfolio`}>
          Переглянути публічний профіль <ArrowRight size={16} />
        </Link>
      </section>

      <section className="portfolio-manager-filters">
        <label>
          Рік
          <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
            <option value="all">Усі роки</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label>
          Місяць
          <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>
            <option value="all">Усі місяці</option>
            {monthNames.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
        </label>
        <label>
          Тип робіт
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            {portfolioWorkCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <span>{filteredItems.length} робіт показано</span>
      </section>

      <section className="portfolio-project-grid">
        {filteredItems.map((item) => {
          const period = getPortfolioPeriod(item);
          const documents = getPublicProjectDocuments(item);
          const imageCount = item.photoUrls?.length || (item.photoUrl ? 1 : 0);
          const category = item.workCategory || item.workLines[0]?.workType || "Робота";

          return (
          <article className="portfolio-project-card" key={item.id}>
            <div className="portfolio-project-image">
              <Image
                src={item.photoUrls?.[0] || item.photoUrl || "/images/portfolio-triptych.png"}
                alt={item.title}
                fill
                unoptimized={(item.photoUrls?.[0] || item.photoUrl || "").startsWith("data:")}
              />
              <span>{item.objectType}</span>
            </div>
            <div className="portfolio-project-toolbar">
              <button
                className="portfolio-project-edit"
                type="button"
                onClick={() => void shareItem(item)}
              >
                <Share2 size={15} /> Поділитися
              </button>
              <Link
                className="portfolio-project-edit"
                href={`/profile/${masterId}#work-detail-${getProjectSlug(item)}`}
              >
                <ArrowRight size={15} /> У профілі
              </Link>
              <Link
                className="portfolio-project-edit"
                href={`/dashboard/portfolio/${item.id}/edit`}
                aria-label={`Редагувати ${item.title}`}
              >
                <Pencil size={15} /> Редагувати
              </Link>
            </div>
            <div className="portfolio-project-copy">
              <p><MapPin size={14} /> {getProjectPublicLocation(item)}</p>
              <h2>{item.title}</h2>
              <div className="portfolio-card-meta">
                <span>{category}</span>
                <span>{period.month.toString().padStart(2, "0")}.{period.year}</span>
                {item.durationDays ? <span>{item.durationDays} днів</span> : null}
                <span>{imageCount} фото</span>
                {documents.length ? <span>{documents.length} документів</span> : null}
              </div>
              <span>{item.description}</span>
              {item.clientVisibleComment ? (
                <em>{item.clientVisibleComment}</em>
              ) : null}
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
          );
        })}

        <Link className="portfolio-add-card" href="/dashboard/portfolio/new">
          <span><Plus size={25} /></span>
          <strong>Додати нову роботу</strong>
          <small>Завантажте фото та додайте кошторис виконаних робіт.</small>
        </Link>
      </section>
    </>
  );
}
