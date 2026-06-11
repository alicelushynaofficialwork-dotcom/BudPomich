import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { portfolio } from "@/lib/data";

type PortfolioItem = (typeof portfolio)[number];

export function PortfolioCard({
  item,
  compact = false,
}: {
  item: PortfolioItem;
  compact?: boolean;
}) {
  return (
    <article className={`portfolio-card ${compact ? "portfolio-compact" : ""}`}>
      <div className={`portfolio-photo crop-${item.crop}`}>
        <span>{item.category}</span>
      </div>
      <div className="portfolio-content">
        <div className="portfolio-heading">
          <div>
            <p className="overline">
              <MapPin size={14} /> {item.city}
            </p>
            <h3>{item.title}</h3>
          </div>
          <Link className="icon-link" href="/profile/andrii-koval" aria-label="Відкрити роботу">
            <ArrowUpRight size={19} />
          </Link>
        </div>
        {!compact && (
          <div className="work-table">
            {item.rows.map(([name, price, amount, total]) => (
              <div className="work-row" key={name}>
                <strong>{name}</strong>
                <span>{price}</span>
                <span>{amount}</span>
                <b>{total}</b>
              </div>
            ))}
          </div>
        )}
        <div className="portfolio-total">
          <span>Всього за роботу</span>
          <strong>{item.total}</strong>
        </div>
      </div>
    </article>
  );
}
