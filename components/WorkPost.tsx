import Link from "next/link";
import { Heart, MapPin, MessageCircle } from "lucide-react";
import type { Master } from "@/lib/data";
import { StatusBadge } from "./StatusBadge";

export function WorkPost({
  master,
  crop,
  title,
  description,
  price,
}: {
  master: Master;
  crop: "left" | "center" | "right";
  title: string;
  description: string;
  price: string;
}) {
  return (
    <article className="post-card">
      <div className="post-author">
        <div className="avatar avatar-small">{master.initials}</div>
        <div>
          <Link href={`/profile/${master.id}`}>{master.name}</Link>
          <p>
            {master.specialty} · {master.city}
          </p>
        </div>
        {master.promoted ? (
          <span className="promoted post-badge">Реклама</span>
        ) : (
          <StatusBadge status={master.status}>{master.statusText}</StatusBadge>
        )}
      </div>
      <div className={`post-photo crop-${crop}`}>
        <span>
          <MapPin size={15} /> {master.city}
        </span>
      </div>
      <div className="post-content">
        <div>
          <p className="overline">Нова робота</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <strong className="post-price">{price}</strong>
      </div>
      <div className="post-actions">
        <button type="button">
          <Heart size={18} /> 42
        </button>
        <button type="button">
          <MessageCircle size={18} /> 8
        </button>
        <Link href={`/profile/${master.id}`}>Відкрити портфоліо</Link>
      </div>
    </article>
  );
}
