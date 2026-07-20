"use client";

import { Star } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { MasterReview } from "@/lib/reviews";

const criteria = [
  ["qualityRating", "Якість роботи"], ["deadlinesRating", "Дотримання строків"], ["communicationRating", "Комунікація"], ["estimateRating", "Відповідність кошторису"], ["cleanlinessRating", "Чистота після роботи"],
] as const;

export function ReviewForm({ bookingId, onCreated }: { bookingId: string; onCreated: (review: MasterReview) => void }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rating) { setStatus({ type: "error", text: "Оберіть загальну оцінку." }); return; }
    if (text.trim().length < 20) { setStatus({ type: "error", text: "Напишіть щонайменше 20 символів." }); return; }
    setSubmitting(true); setStatus(null);
    try {
      const response = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, rating, text: text.trim(), ...scores }) });
      const result = await response.json() as { review?: MasterReview; error?: string };
      if (!response.ok || !result.review) throw new Error(result.error || "Не вдалося надіслати відгук.");
      setStatus({ type: "success", text: "Дякуємо! Відгук опубліковано." });
      onCreated(result.review);
    } catch (error) { setStatus({ type: "error", text: error instanceof Error ? error.message : "Не вдалося надіслати відгук." }); }
    finally { setSubmitting(false); }
  }

  return <form className="client-review-form" onSubmit={submit}><fieldset><legend>Загальна оцінка</legend><div className="client-star-input">{[1,2,3,4,5].map((value) => <label key={value}><input type="radio" name={`rating-${bookingId}`} value={value} checked={rating === value} onChange={() => setRating(value)} /><span aria-hidden="true"><Star fill={value <= rating ? "currentColor" : "none"} /></span><span className="sr-only">{value} з 5 зірок</span></label>)}</div><p>{rating ? `${rating} з 5` : "Оцінку не обрано"}</p></fieldset><details><summary>Оцінити окремі критерії (необов’язково)</summary><div className="client-review-criteria">{criteria.map(([key,label]) => <label key={key}><span>{label}</span><select value={scores[key] ?? ""} onChange={(event) => setScores((current) => ({ ...current, [key]: Number(event.target.value) }))}><option value="">Не оцінювати</option>{[5,4,3,2,1].map((value) => <option value={value} key={value}>{value} з 5</option>)}</select></label>)}</div></details><label><span>Ваш відгук</span><textarea minLength={20} maxLength={4000} rows={5} value={text} onChange={(event) => setText(event.target.value)} placeholder="Розкажіть про якість роботи, строки та комунікацію" /></label><small>{text.trim().length} / мінімум 20 символів</small>{status ? <p className={`client-review-status ${status.type}`} role="status">{status.text}</p> : null}<button type="submit" disabled={submitting}>{submitting ? "Надсилаємо…" : "Опублікувати відгук"}</button></form>;
}
