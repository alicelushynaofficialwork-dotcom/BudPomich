"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

type DashboardRequestView = "new" | "messages" | "files" | "multi" | "incomplete" | "in_progress";

export function DashboardRequestNotification() {
  const [isVisible, setIsVisible] = useState(() =>
    typeof window === "undefined" ? false : window.location.hash === "#request-messages",
  );

  useEffect(() => {
    function handleRequestView(event: Event) {
      const view = (event as CustomEvent<{ view?: DashboardRequestView }>).detail?.view;
      setIsVisible(view === "messages");
    }

    window.addEventListener("budpomich:dashboard-request-view", handleRequestView);
    return () => window.removeEventListener("budpomich:dashboard-request-view", handleRequestView);
  }, []);

  if (!isVisible) return null;

  return (
    <article className="dashboard-panel requests-panel dashboard-context-notification">
      <div className="panel-title-row">
        <div>
          <p className="overline">Останні заявки</p>
          <h2>Нові звернення</h2>
        </div>
        <Link href="/dashboard#requests">Переглянути всі</Link>
      </div>
      <div className="request-row">
        <div className="avatar avatar-small">ОМ</div>
        <div>
          <strong>Олексій Мельник</strong>
          <p>Потрібна заміна проводки у двокімнатній квартирі.</p>
        </div>
        <div className="request-status">
          <strong>Нова заявка</strong>
          <span>Сьогодні, 10:24</span>
        </div>
        <Link className="request-open" href="/dashboard#requests" aria-label="Відкрити заявку">
          <ArrowRight size={18} />
        </Link>
      </div>
    </article>
  );
}
