import Link from "next/link";
import { ArrowUpRight, BadgeCheck, MapPin } from "lucide-react";
import type { Master } from "@/lib/data";
import { StatusBadge } from "./StatusBadge";

export function MasterCard({ master }: { master: Master }) {
  return (
    <article className="master-card">
      {master.promoted && <span className="promoted">ТОП майстер</span>}
      <div className="master-top">
        <div className="avatar">{master.initials}</div>
        <div>
          <h3>
            {master.name} <BadgeCheck className="verified" size={18} />
          </h3>
          <p>{master.specialty}</p>
        </div>
      </div>
      <p className="master-location">
        <MapPin size={15} /> {master.city} · {master.experience}
      </p>
      <StatusBadge status={master.status}>{master.statusText}</StatusBadge>
      <div className="master-metrics">
        <div>
          <strong>{master.works}</strong>
          <span>робіт</span>
        </div>
        <div>
          <strong>{master.followers}</strong>
          <span>підписників</span>
        </div>
      </div>
      <Link className="card-link" href={`/profile/${master.id}`}>
        Переглянути профіль <ArrowUpRight size={17} />
      </Link>
    </article>
  );
}
