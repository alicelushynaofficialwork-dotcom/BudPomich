"use client";

import Image from "next/image";
import { Camera, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { MasterReview, ReviewAggregate } from "@/lib/reviews";
import { reviewInitials } from "@/lib/reviews";

type ReviewFilter = "all" | "photos" | "5" | "4";
type ReviewSort = "new" | "high" | "low";
const emptyAggregate: ReviewAggregate = { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, criteria: {} };
const criteriaLabels: Record<keyof ReviewAggregate["criteria"], string> = { quality: "Якість роботи", deadlines: "Дотримання строків", communication: "Комунікація", estimate: "Відповідність кошторису", cleanliness: "Чистота після роботи" };

function Stars({ value }: { value: number }) {
  return <span className="public-review-stars" aria-label={`${value} з 5 зірок`}>{[1,2,3,4,5].map((star) => <Star key={star} size={17} fill={star <= Math.round(value) ? "currentColor" : "none"} aria-hidden="true" />)}<b>{value.toFixed(1)}</b></span>;
}

export function PublicReviews({ masterId, onOpenProject, onAggregateChange }: { masterId: string; onOpenProject: (projectId: string) => void; onAggregateChange?: (aggregate: ReviewAggregate) => void }) {
  const [reviews, setReviews] = useState<MasterReview[]>([]);
  const [aggregate, setAggregate] = useState<ReviewAggregate>(emptyAggregate);
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [service, setService] = useState("all");
  const [sort, setSort] = useState<ReviewSort>("new");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/reviews?masterId=${encodeURIComponent(masterId)}`, { signal: controller.signal }).then(async (response) => response.ok ? response.json() : { reviews: [], aggregate: emptyAggregate }).then((result: { reviews?: MasterReview[]; aggregate?: ReviewAggregate }) => { const nextAggregate = result.aggregate ?? emptyAggregate; setReviews(result.reviews ?? []); setAggregate(nextAggregate); onAggregateChange?.(nextAggregate); }).catch(() => undefined).finally(() => setLoading(false));
    return () => controller.abort();
  }, [masterId, onAggregateChange]);

  const services = useMemo(() => Array.from(new Set(reviews.map((review) => review.serviceTitle).filter((value): value is string => Boolean(value)))), [reviews]);
  const visible = useMemo(() => reviews.filter((review) => filter === "all" || (filter === "photos" ? review.imageUrls.length > 0 : review.rating === Number(filter))).filter((review) => service === "all" || review.serviceTitle === service).sort((a, b) => sort === "high" ? b.rating - a.rating : sort === "low" ? a.rating - b.rating : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [filter, reviews, service, sort]);
  const criteria = Object.entries(aggregate.criteria).filter((entry): entry is [keyof ReviewAggregate["criteria"], number] => typeof entry[1] === "number");

  if (loading) return <p className="public-empty-state">Завантажуємо відгуки…</p>;
  if (!aggregate.count) return <div className="public-empty-state"><Star size={22} aria-hidden="true" /><p>Майстер ще не отримав відгуків через BudPomich.</p></div>;

  return <>
    <section className="public-review-overview" aria-label="Загальний рейтинг майстра">
      <div className="public-review-score"><strong>{aggregate.average.toFixed(1)}</strong><Stars value={aggregate.average} /><span>{aggregate.count} відгуків</span></div>
      <div className="public-review-distribution">{[5,4,3,2,1].map((rating) => <div key={rating}><span>{rating} <Star size={13} fill="currentColor" aria-hidden="true" /></span><i><b style={{ width: `${aggregate.count ? aggregate.distribution[rating as 1|2|3|4|5] / aggregate.count * 100 : 0}%` }} /></i><small>{aggregate.distribution[rating as 1|2|3|4|5]}</small></div>)}</div>
      {criteria.length ? <dl className="public-review-criteria">{criteria.map(([key, value]) => <div key={key}><dt>{criteriaLabels[key]}</dt><dd>{value.toFixed(1)}</dd></div>)}</dl> : null}
    </section>
    <div className="public-review-controls"><div className="public-review-filters" aria-label="Фільтри відгуків">{([ ["all","Усі"], ["photos","З фото"], ["5","5 зірок"], ["4","4 зірки"] ] as [ReviewFilter,string][]).map(([value,label]) => <button type="button" className={filter === value ? "active" : ""} aria-pressed={filter === value} onClick={() => setFilter(value)} key={value}>{label}</button>)}{services.length ? <select aria-label="Фільтр за послугою" value={service} onChange={(event) => setService(event.target.value)}><option value="all">Усі послуги</option>{services.map((item) => <option key={item}>{item}</option>)}</select> : null}</div><select aria-label="Сортування відгуків" value={sort} onChange={(event) => setSort(event.target.value as ReviewSort)}><option value="new">Спочатку нові</option><option value="high">Найвища оцінка</option><option value="low">Найнижча оцінка</option></select></div>
    <div className="public-review-list">{visible.map((review) => <article className="public-review-card" key={review.id}><header><span className="public-review-avatar">{review.clientAvatarUrl ? <Image src={review.clientAvatarUrl} alt="" fill sizes="48px" /> : reviewInitials(review.clientName)}</span><div><h3>{review.clientName}</h3><Stars value={review.rating} /></div><time dateTime={review.createdAt}>{new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium" }).format(new Date(review.createdAt))}</time></header>{review.verifiedBooking ? <span className="public-review-verified">Замовлення виконано через BudPomich</span> : null}{review.serviceTitle ? <p className="public-review-service">{review.serviceTitle}</p> : null}<p>{review.text}</p>{review.imageUrls.length ? <div className="public-review-photos">{review.imageUrls.map((url, index) => <Image src={url} alt={`Фото результату роботи ${index + 1}`} width={160} height={120} key={url} />)}</div> : null}<div className="public-review-actions">{review.projectId ? <button type="button" onClick={() => onOpenProject(review.projectId!)}>Переглянути виконану роботу</button> : null}</div>{review.masterReply ? <blockquote><strong>Відповідь майстра</strong><p>{review.masterReply}</p>{review.masterRepliedAt ? <time dateTime={review.masterRepliedAt}>{new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium" }).format(new Date(review.masterRepliedAt))}</time> : null}</blockquote> : null}</article>)}{!visible.length ? <p className="public-empty-state"><Camera size={20} /> За цим фільтром відгуків немає.</p> : null}</div>
  </>;
}
