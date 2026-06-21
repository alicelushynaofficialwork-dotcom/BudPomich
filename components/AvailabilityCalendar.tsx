"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";

type DayStatus = "available" | "busy" | "planned";

const statusLabels: Record<DayStatus, string> = {
  available: "Вільний",
  busy: "Зайнятий",
  planned: "Заплановано",
};

const statusOrder: DayStatus[] = ["available", "busy", "planned"];

const initialStatuses: Record<number, DayStatus> = {
  1: "busy",
  2: "busy",
  4: "planned",
  8: "busy",
  9: "busy",
  12: "planned",
  15: "available",
  16: "available",
  17: "available",
  21: "busy",
  22: "busy",
  26: "planned",
  29: "available",
  30: "available",
  31: "available",
};

function getCalendarDays(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const mondayBasedOffset = (firstDay.getDay() + 6) % 7;

  return [
    ...Array.from({ length: mondayBasedOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
}

export function AvailabilityCalendar() {
  const [statuses, setStatuses] = useState(initialStatuses);
  const days = useMemo(() => getCalendarDays(2026, 6), []);
  const availableCount = Object.values(statuses).filter(
    (status) => status === "available",
  ).length;
  const busyCount = Object.values(statuses).filter((status) => status === "busy").length;

  function toggleDay(day: number) {
    setStatuses((current) => {
      const currentStatus = current[day] ?? "available";
      const nextStatus =
        statusOrder[(statusOrder.indexOf(currentStatus) + 1) % statusOrder.length];

      return {
        ...current,
        [day]: nextStatus,
      };
    });
  }

  return (
    <div className="availability-calendar">
      <div className="calendar-toolbar">
        <div>
          <span>
            <CalendarDays size={17} />
            Липень 2026
          </span>
          <strong>Календар зайнятості</strong>
        </div>
        <div className="calendar-summary">
          <span>{availableCount} вільних днів</span>
          <span>{busyCount} зайнятих</span>
        </div>
      </div>

      <div className="calendar-weekdays" aria-hidden="true">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="calendar-grid" aria-label="Календар зайнятості на липень 2026">
        {days.map((day, index) =>
          day ? (
            <button
              className={`calendar-day calendar-day-${statuses[day] ?? "available"}`}
              type="button"
              key={day}
              onClick={() => toggleDay(day)}
              aria-label={`${day} липня: ${statusLabels[statuses[day] ?? "available"]}`}
            >
              <span>{day}</span>
              <small>{statusLabels[statuses[day] ?? "available"]}</small>
            </button>
          ) : (
            <span className="calendar-empty" key={`empty-${index}`} />
          ),
        )}
      </div>

      <div className="calendar-legend" aria-label="Позначення статусів">
        <span>
          <i className="legend-available" /> Вільний
        </span>
        <span>
          <i className="legend-busy" /> Зайнятий
        </span>
        <span>
          <i className="legend-planned" /> Заплановано
        </span>
      </div>
    </div>
  );
}
