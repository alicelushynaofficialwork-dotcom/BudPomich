"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  AvailabilitySlots,
  AvailabilityStatus,
  formatDateKey,
  getAvailabilityStorageKey,
  getDefaultAvailabilitySlots,
  getMonthGrid,
  legacyAvailabilityStorageKey,
  monthLabels,
} from "@/lib/availability";

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

export function AvailabilityCalendar({
  masterId = "andrii-koval",
}: {
  masterId?: string;
}) {
  const [slots, setSlots] = useState<AvailabilitySlots>(() =>
    getDefaultAvailabilitySlots(masterId),
  );
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(5);
  const [paintStatus, setPaintStatus] =
    useState<AvailabilityStatus>("free");

  useEffect(() => {
    const loadSlots = window.setTimeout(() => {
      const storageKey = getAvailabilityStorageKey(masterId);
      const stored =
        localStorage.getItem(storageKey) ??
        (masterId === "andrii-koval"
          ? localStorage.getItem(legacyAvailabilityStorageKey)
          : null);

      if (stored) {
        setSlots(JSON.parse(stored) as AvailabilitySlots);
        localStorage.setItem(storageKey, stored);
      }
    }, 0);

    return () => window.clearTimeout(loadSlots);
  }, [masterId]);

  const days = useMemo(() => getMonthGrid(year, month), [year, month]);

  function changeMonth(direction: -1 | 1) {
    const next = new Date(Date.UTC(year, month + direction, 1));
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth());
  }

  function updateDay(day: number) {
    const key = formatDateKey(year, month, day);
    const next = { ...slots };

    if (next[key] === paintStatus) {
      delete next[key];
    } else {
      next[key] = paintStatus;
    }

    setSlots(next);
    localStorage.setItem(
      getAvailabilityStorageKey(masterId),
      JSON.stringify(next),
    );
  }

  return (
    <article className="dashboard-panel availability-panel">
      <div className="availability-calendar-head">
        <div>
          <p className="dashboard-eyebrow">Статус зайнятості</p>
          <h2>Календар доступності</h2>
        </div>
        <div className="availability-legend">
          <span><i className="free" /> Вільно</span>
          <span><i className="busy" /> Зайнято</span>
        </div>
      </div>

      <div className="availability-toolbar">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          aria-label="Попередній місяць"
        >
          <ChevronLeft size={17} />
        </button>
        <strong>{monthLabels[month]} {year}</strong>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          aria-label="Наступний місяць"
        >
          <ChevronRight size={17} />
        </button>
      </div>

      <div className="availability-paint">
        <span>Режим позначення:</span>
        <button
          className={paintStatus === "free" ? "active free" : ""}
          type="button"
          onClick={() => setPaintStatus("free")}
        >
          Вільно
        </button>
        <button
          className={paintStatus === "busy" ? "active busy" : ""}
          type="button"
          onClick={() => setPaintStatus("busy")}
        >
          Зайнято
        </button>
      </div>

      <div className="availability-weekdays">
        {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
      </div>
      <div className="availability-grid">
        {days.map((day, index) =>
          day ? (
            <button
              className={slots[formatDateKey(year, month, day)] ?? "unset"}
              type="button"
              key={day}
              onClick={() => updateDay(day)}
              aria-label={`${day} ${monthLabels[month]}: ${
                slots[formatDateKey(year, month, day)] === "free"
                  ? "вільно"
                  : slots[formatDateKey(year, month, day)] === "busy"
                    ? "зайнято"
                    : "не позначено"
              }`}
            >
              {day}
            </button>
          ) : (
            <span key={`empty-${index}`} />
          ),
        )}
      </div>
      <p className="availability-hint">
        Оберіть режим і натискайте на дні, щоб змінити доступність.
      </p>
    </article>
  );
}
