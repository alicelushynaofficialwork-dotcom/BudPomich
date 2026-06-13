"use client";

import { ChevronLeft, ChevronRight, MessageSquare, Send } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AvailabilitySlots,
  bookingStorageKey,
  formatBookingDate,
  formatDateKey,
  getAvailabilityStorageKey,
  getDefaultAvailabilitySlots,
  getMonthGrid,
  legacyAvailabilityStorageKey,
  masterMessageStorageKey,
  monthLabels,
  type BookingRequest,
  type MasterMessage,
} from "@/lib/availability";

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

export function ClientBookingCalendar({
  masterId,
  masterName,
}: {
  masterId: string;
  masterName: string;
}) {
  const [slots, setSlots] = useState<AvailabilitySlots>(() =>
    getDefaultAvailabilitySlots(masterId),
  );
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(5);
  const [selectedDate, setSelectedDate] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
  const [messageStatus, setMessageStatus] = useState("");

  useEffect(() => {
    const loadSlots = window.setTimeout(() => {
      const stored =
        localStorage.getItem(getAvailabilityStorageKey(masterId)) ??
        (masterId === "andrii-koval"
          ? localStorage.getItem(legacyAvailabilityStorageKey)
          : null);

      if (stored) setSlots(JSON.parse(stored) as AvailabilitySlots);
    }, 0);

    return () => window.clearTimeout(loadSlots);
  }, [masterId]);

  const days = useMemo(() => getMonthGrid(year, month), [year, month]);

  function changeMonth(direction: -1 | 1) {
    const next = new Date(Date.UTC(year, month + direction, 1));
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth());
    setSelectedDate("");
    setBookingStatus("");
  }

  function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDate || slots[selectedDate] !== "free") return;

    const formData = new FormData(event.currentTarget);
    const stored = JSON.parse(
      localStorage.getItem(bookingStorageKey) ?? "[]",
    ) as BookingRequest[];
    const request: BookingRequest = {
      id: crypto.randomUUID(),
      masterId,
      date: selectedDate,
      workType: String(formData.get("workType") ?? ""),
      description: String(formData.get("description") ?? ""),
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(bookingStorageKey, JSON.stringify([request, ...stored]));
    setBookingStatus(
      `Заявку на ${formatBookingDate(selectedDate)} надіслано майстру.`,
    );
    event.currentTarget.reset();
  }

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const stored = JSON.parse(
      localStorage.getItem(masterMessageStorageKey) ?? "[]",
    ) as MasterMessage[];
    const message: MasterMessage = {
      id: crypto.randomUUID(),
      senderMasterId: "andrii-koval",
      recipientMasterId: masterId,
      subject: String(formData.get("subject") ?? ""),
      message: String(formData.get("message") ?? ""),
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      masterMessageStorageKey,
      JSON.stringify([message, ...stored]),
    );
    setMessageStatus(`Повідомлення для ${masterName} надіслано.`);
    event.currentTarget.reset();
  }

  return (
    <section className="client-booking-section" id="booking-calendar">
      <div className="client-booking-copy">
        <p className="public-profile-eyebrow">Онлайн-запис</p>
        <h2>Оберіть вільне вікно</h2>
        <span>
          Зелені дні доступні для заявки. Червоні вже зайняті й не обираються.
        </span>
        <div className="client-booking-legend">
          <span><i className="free" /> Вільно</span>
          <span><i className="busy" /> Зайнято</span>
        </div>
      </div>

      <div className="client-calendar-card">
        <div className="client-calendar-toolbar">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Попередній місяць">
            <ChevronLeft size={17} />
          </button>
          <strong>{monthLabels[month]} {year}</strong>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Наступний місяць">
            <ChevronRight size={17} />
          </button>
        </div>
        <div className="client-calendar-weekdays">
          {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>
        <div className="client-calendar-grid">
          {days.map((day, index) => {
            if (!day) return <span key={`empty-${index}`} />;
            const key = formatDateKey(year, month, day);
            const dayStatus = slots[key] ?? "unset";
            return (
              <button
                className={`${dayStatus} ${selectedDate === key ? "selected" : ""}`}
                type="button"
                key={day}
                disabled={dayStatus !== "free"}
                onClick={() => {
                  setSelectedDate(key);
                  setBookingStatus("");
                }}
                aria-label={`${day} ${monthLabels[month]}: ${
                  dayStatus === "free" ? "вільно" : dayStatus === "busy" ? "зайнято" : "недоступно"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <form className="client-booking-form" onSubmit={submitBooking}>
        <h3>
          {selectedDate
            ? `Заявка на ${formatBookingDate(selectedDate)}`
            : "Спочатку оберіть зелений день"}
        </h3>
        <label>
          Тип роботи
          <input
            name="workType"
            placeholder="Наприклад, монтаж розеток"
            required
            disabled={!selectedDate}
          />
        </label>
        <label>
          Короткий опис
          <textarea
            name="description"
            rows={4}
            placeholder="Опишіть завдання та об&apos;єкт"
            required
            disabled={!selectedDate}
          />
        </label>
        <button type="submit" disabled={!selectedDate}>
          <Send size={17} /> Надіслати заявку
        </button>
        {bookingStatus && <p role="status">{bookingStatus}</p>}
      </form>

      <form
        className="client-message-form"
        id="message-master"
        onSubmit={submitMessage}
      >
        <div className="client-message-copy">
          <span><MessageSquare size={18} /></span>
          <div>
            <p className="public-profile-eyebrow">Прямий зв&apos;язок</p>
            <h3>Написати майстру</h3>
            <small>Повідомлення не прив&apos;язане до дати в календарі.</small>
          </div>
        </div>
        <label>
          Тема
          <input
            name="subject"
            placeholder="Наприклад, спільний проєкт"
            required
          />
        </label>
        <label>
          Повідомлення
          <textarea
            name="message"
            rows={3}
            placeholder={`Напишіть повідомлення для ${masterName}`}
            required
          />
        </label>
        <button type="submit">
          <Send size={17} /> Надіслати повідомлення
        </button>
        {messageStatus && <p role="status">{messageStatus}</p>}
      </form>
    </section>
  );
}
