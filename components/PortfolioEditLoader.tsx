"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PortfolioForm } from "@/components/PortfolioForm";
import {
  defaultPortfolioItems,
  PortfolioItem,
  portfolioStorageKey,
} from "@/lib/portfolio";

export function PortfolioEditLoader({ itemId, masterId: currentMasterId = "" }: { itemId: string; masterId?: string }) {
  const [item, setItem] = useState<PortfolioItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadItem = window.setTimeout(() => {
      const localItems = JSON.parse(
        localStorage.getItem(portfolioStorageKey) ?? "[]",
      ) as PortfolioItem[];
      const localItem = localItems.find(
        (candidate) => candidate.id === itemId && candidate.masterId === currentMasterId,
      );
      const defaultItem = defaultPortfolioItems.find(
        (candidate) => candidate.id === itemId && candidate.masterId === currentMasterId,
      );

      if (localItem || defaultItem) setItem(localItem ?? defaultItem ?? null);

      fetch(`/api/portfolio?masterId=${currentMasterId}`)
        .then((response) => response.json())
        .then((result: { items?: PortfolioItem[] }) => {
          const remoteItem = result.items?.find(
            (candidate) => candidate.id === itemId,
          );
          if (remoteItem) setItem(remoteItem);
        })
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(loadItem);
  }, [currentMasterId, itemId]);

  if (loading && !item) {
    return <div className="portfolio-editor-loading">Завантажуємо проєкт...</div>;
  }

  if (!item) {
    return (
      <div className="portfolio-editor-loading">
        <strong>Проєкт не знайдено</strong>
        <Link href="/dashboard/portfolio">Повернутися до портфоліо</Link>
      </div>
    );
  }

  return <PortfolioForm initialItem={item} masterId={currentMasterId} />;
}
