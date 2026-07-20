"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { MasterReview } from "@/lib/reviews";

export function MasterReviewInbox({ masterId }: { masterId: string }) {
  const [reviews, setReviews] = useState<MasterReview[]>([]);
  const [replying, setReplying] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { const controller = new AbortController(); fetch(`/api/reviews?masterId=${encodeURIComponent(masterId)}`, { signal: controller.signal }).then((response) => response.json()).then((result: { reviews?: MasterReview[] }) => setReviews(result.reviews ?? [])).catch(() => undefined); return () => controller.abort(); }, [masterId]);

  async function submit(event: FormEvent, reviewId: string) {
    event.preventDefault(); setError("");
    const response = await fetch("/api/reviews", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewId, reply }) });
    const result = await response.json() as { review?: MasterReview; error?: string };
    if (!response.ok || !result.review) { setError(result.error || "Не вдалося додати відповідь."); return; }
    setReviews((current) => current.map((review) => review.id === reviewId ? result.review! : review)); setReplying(""); setReply("");
  }

  return <section className="dash-review-inbox"><header><span>Довіра клієнтів</span><h2>Відгуки про вашу роботу</h2></header>{reviews.map((review) => <article key={review.id}><div><strong>{review.clientName}</strong><span>{review.rating} з 5 · {review.serviceTitle || "Послуга"}</span></div><p>{review.text}</p>{review.masterReply ? <blockquote><strong>Ваша відповідь</strong><p>{review.masterReply}</p></blockquote> : replying === review.id ? <form onSubmit={(event) => submit(event, review.id)}><label><span>Публічна відповідь</span><textarea minLength={2} maxLength={2000} value={reply} onChange={(event) => setReply(event.target.value)} /></label>{error ? <p role="alert">{error}</p> : null}<button type="submit">Опублікувати відповідь</button><button type="button" onClick={() => setReplying("")}>Скасувати</button></form> : <button type="button" onClick={() => { setReplying(review.id); setReply(""); }}>Відповісти</button>}</article>)}{!reviews.length ? <p>Опублікованих відгуків поки немає.</p> : null}</section>;
}
