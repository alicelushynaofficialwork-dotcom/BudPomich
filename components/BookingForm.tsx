"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MessageSquare, Send } from "lucide-react";

type BookingRequest = {
  masterId: string;
  masterName: string;
  date: string;
  workType: string;
  description: string;
  status: "new";
  createdAt: string;
};

type DirectMessage = {
  masterId: string;
  masterName: string;
  subject: string;
  message: string;
  createdAt: string;
};

type BookingFormProps = {
  masterId: string;
  masterName: string;
  busyDates?: string[];
};

const monthNames = [
  "Січень",
  "Лютий",
  "Березень",
  "Квітень",
  "Травень",
  "Червень",
  "Липень",
  "Серпень",
  "Вересень",
  "Жовтень",
  "Листопад",
  "Грудень",
];

const defaultBusyDates = [
  "2026-06-01",
  "2026-06-02",
  "2026-06-06",
  "2026-06-07",
  "2026-06-08",
  "2026-06-13",
  "2026-06-14",
  "2026-06-15",
  "2026-06-16",
  "2026-06-17",
  "2026-06-18",
  "2026-06-19",
  "2026-06-26",
  "2026-06-27",
];

const workTypes = [
  "Укладка плитки",
  "Штукатурка",
  "Покраска стен",
  "Электрика",
  "Сантехника",
  "Другое",
];

function toIsoDate(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildCalendarDays(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const mondayOffset = (firstDay.getDay() + 6) % 7;

  return [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
}

export function BookingForm({
  masterId,
  masterName,
  busyDates = defaultBusyDates,
}: BookingFormProps) {
  const [visibleMonth, setVisibleMonth] = useState({ year: 2026, monthIndex: 5 });
  const [selectedDate, setSelectedDate] = useState("");
  const [workType, setWorkType] = useState("");
  const [description, setDescription] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState("");
  const [messageSuccess, setMessageSuccess] = useState("");

  const busyDateSet = useMemo(() => new Set(busyDates), [busyDates]);
  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth.year, visibleMonth.monthIndex),
    [visibleMonth],
  );

  function changeMonth(direction: -1 | 1) {
    setVisibleMonth((current) => {
      const next = new Date(current.year, current.monthIndex + direction, 1);
      return { year: next.getFullYear(), monthIndex: next.getMonth() };
    });
    setSelectedDate("");
    setBookingError("");
    setBookingSuccess("");
  }

  function chooseDate(day: number) {
    const isoDate = toIsoDate(visibleMonth.year, visibleMonth.monthIndex, day);

    if (busyDateSet.has(isoDate)) {
      return;
    }

    setSelectedDate(isoDate);
    setBookingError("");
    setBookingSuccess("");
  }

  function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDate || !workType || !description.trim()) {
      setBookingSuccess("");
      setBookingError("Оберіть вільну дату, тип роботи та коротко опишіть задачу.");
      return;
    }

    const request: BookingRequest = {
      masterId,
      masterName,
      date: selectedDate,
      workType,
      description: description.trim(),
      status: "new",
      createdAt: new Date().toISOString(),
    };

    console.log("Booking request", request);
    setBookingError("");
    setBookingSuccess("Заявка надіслана майстру");
  }

  function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!subject.trim() || !message.trim()) {
      setMessageSuccess("");
      setMessageError("Заповніть тему та повідомлення.");
      return;
    }

    const directMessage: DirectMessage = {
      masterId,
      masterName,
      subject: subject.trim(),
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };

    console.log("Direct message", directMessage);
    setMessageError("");
    setMessageSuccess("Повідомлення надіслано");
  }

  return (
    <section className="online-booking" id="booking">
      <div className="booking-intro">
        <p className="eyebrow">Онлайн-запис</p>
        <h2>Оберіть вільне вікно</h2>
        <p>
          Зелені дні доступні для заявки. Червоні вже зайняті й не обираються.
        </p>
        <div className="booking-legend" aria-label="Позначення календаря">
          <span>
            <i className="legend-available" /> Вільно
          </span>
          <span>
            <i className="legend-busy" /> Зайнято
          </span>
        </div>
      </div>

      <div className="booking-calendar-card">
        <div className="booking-calendar-head">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Попередній місяць">
            <ChevronLeft size={17} />
          </button>
          <strong>
            {monthNames[visibleMonth.monthIndex]} {visibleMonth.year}
          </strong>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Наступний місяць">
            <ChevronRight size={17} />
          </button>
        </div>
        <div className="booking-weekdays" aria-hidden="true">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="booking-month-grid" aria-label="Календар доступності">
          {calendarDays.map((day, index) => {
            if (!day) {
              return <span className="booking-date-empty" key={`empty-${index}`} />;
            }

            const isoDate = toIsoDate(visibleMonth.year, visibleMonth.monthIndex, day);
            const isBusy = busyDateSet.has(isoDate);
            const isSelected = selectedDate === isoDate;

            return (
              <button
                aria-pressed={isSelected}
                className={[
                  "booking-month-day",
                  isBusy ? "is-busy" : "is-free",
                  isSelected ? "is-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={isBusy}
                key={isoDate}
                onClick={() => chooseDate(day)}
                type="button"
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <form className="booking-side-form" onSubmit={submitBooking} noValidate>
        <h3>
          {selectedDate ? `Обрана дата: ${selectedDate}` : "Спочатку оберіть зелений день"}
        </h3>
        <label>
          Тип роботи
          <select
            name="workType"
            onChange={(event) => {
              setWorkType(event.target.value);
              setBookingError("");
            }}
            required
            value={workType}
          >
            <option value="">Наприклад, монтаж розеток</option>
            {workTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Короткий опис
          <textarea
            name="description"
            onChange={(event) => {
              setDescription(event.target.value);
              setBookingError("");
            }}
            placeholder="Опишіть завдання та обʼєкт"
            required
            rows={5}
            value={description}
          />
        </label>
        {bookingError && (
          <p className="booking-error" role="alert">
            {bookingError}
          </p>
        )}
        <button className="request-button booking-submit" type="submit">
          <Send size={16} />
          Надіслати заявку
        </button>
        {bookingSuccess && (
          <p className="booking-success" role="status">
            {bookingSuccess}
          </p>
        )}
      </form>

      <form className="direct-message-form" id="message" onSubmit={submitMessage} noValidate>
        <div className="direct-message-title">
          <span>
            <MessageSquare size={18} />
          </span>
          <div>
            <p className="eyebrow">Прямий звʼязок</p>
            <h3>Написати майстру</h3>
            <small>Повідомлення не привʼязане до дати в календарі.</small>
          </div>
        </div>
        <label>
          Тема
          <input
            name="subject"
            onChange={(event) => {
              setSubject(event.target.value);
              setMessageError("");
            }}
            placeholder="Наприклад, спільний проект"
            required
            value={subject}
          />
        </label>
        <label>
          Повідомлення
          <textarea
            name="message"
            onChange={(event) => {
              setMessage(event.target.value);
              setMessageError("");
            }}
            placeholder={`Напишіть повідомлення для ${masterName}`}
            required
            rows={3}
            value={message}
          />
        </label>
        <button className="request-button direct-message-submit" type="submit">
          <Send size={16} />
          Надіслати повідомлення
        </button>
        {messageError && (
          <p className="booking-error" role="alert">
            {messageError}
          </p>
        )}
        {messageSuccess && (
          <p className="booking-success" role="status">
            {messageSuccess}
          </p>
        )}
      </form>
    </section>
  );
}
