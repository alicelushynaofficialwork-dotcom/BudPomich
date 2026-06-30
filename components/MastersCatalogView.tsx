"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import type { MasterProfile } from "@/lib/masters";
import {
  type EditableMasterProfile,
  masterProfileStorageKey,
  mergeMasterProfile,
} from "@/lib/master-profile-edit";
import { formatPriceFromServices } from "@/lib/master-pricing";
import {
  type AvailabilitySlots,
  formatDateKey,
  getAvailabilityStorageKey,
  getDefaultAvailabilitySlots,
  getMonthGrid,
} from "@/lib/availability";

type MastersCatalogViewProps = {
  masters: MasterProfile[];
};

type LocationDetails = {
  serviceArea?: string;
  travel?: string;
  comment?: string;
};

const locationDetailsStorageKey = "budpomich.profile-location-details";
const defaultServiceArea = "Київ та передмістя до 30 км";
const defaultTravelText = "По місту та за місто за домовленістю";
const defaultDirectoryTravelText = "За домовленістю";
const defaultCalendarMonth = { year: 2026, month: 5 };
const previewCalendarWeekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
const catalogMonthNames = [
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

function readAvailabilitySlots(masterId: string) {
  try {
    const stored = localStorage.getItem(getAvailabilityStorageKey(masterId));
    return stored ? (JSON.parse(stored) as AvailabilitySlots) : getDefaultAvailabilitySlots(masterId);
  } catch {
    return getDefaultAvailabilitySlots(masterId);
  }
}

export function MastersCatalogView({ masters }: MastersCatalogViewProps) {
  const [profileEdits, setProfileEdits] = useState<Record<string, EditableMasterProfile>>({});
  const [expandedServiceCards, setExpandedServiceCards] = useState<Record<string, boolean>>({});
  const [locationDetails, setLocationDetails] = useState<Record<string, LocationDetails>>({});
  const [availabilitySlots, setAvailabilitySlots] = useState<Record<string, AvailabilitySlots>>({});
  const [openCalendarCard, setOpenCalendarCard] = useState<string | null>(null);
  const [calendarMonths, setCalendarMonths] = useState<Record<string, typeof defaultCalendarMonth>>({});
  const visibleMasters = useMemo(
    () => masters.map((master) => mergeMasterProfile(master, profileEdits[master.id])),
    [masters, profileEdits],
  );

  useEffect(() => {
    const localProfiles = JSON.parse(
      localStorage.getItem(masterProfileStorageKey) ?? "{}",
    ) as Record<string, EditableMasterProfile>;

    setProfileEdits(localProfiles);
    setLocationDetails(
      JSON.parse(localStorage.getItem(locationDetailsStorageKey) ?? "{}") as Record<string, LocationDetails>,
    );
    setAvailabilitySlots(
      Object.fromEntries(masters.map((master) => [master.id, readAvailabilitySlots(master.id)])),
    );

    masters.forEach((master) => {
      fetch(`/api/profile?masterId=${encodeURIComponent(master.id)}`)
        .then((response) => response.json())
        .then((result: { profile?: EditableMasterProfile | null }) => {
          if (!result.profile) return;
          setProfileEdits((current) => {
            const existing = current[master.id];
            return {
              ...current,
              [master.id]: {
                ...existing,
                ...result.profile!,
                avatarUrl: result.profile!.avatarUrl || existing?.avatarUrl || "",
                coverImageUrl: result.profile!.coverImageUrl || existing?.coverImageUrl || "",
              },
            };
          });
        })
        .catch(() => undefined);
    });
  }, [masters]);

  function getCalendarMonth(masterId: string) {
    return calendarMonths[masterId] ?? defaultCalendarMonth;
  }

  function changeCalendarMonth(masterId: string, direction: -1 | 1) {
    setCalendarMonths((current) => {
      const visibleMonth = current[masterId] ?? defaultCalendarMonth;
      const nextDate = new Date(Date.UTC(visibleMonth.year, visibleMonth.month + direction, 1));

      return {
        ...current,
        [masterId]: {
          year: nextDate.getUTCFullYear(),
          month: nextDate.getUTCMonth(),
        },
      };
    });
  }

  return (
    <main className="masters-page">
      <SiteHeader active="masters" showBecomeMaster />

      <section className="masters-hero">
        <div>
          <p className="eyebrow">Надійні фахівці поруч</p>
          <h1>Знайдіть майстра для вашого завдання</h1>
          <p>
            Порівнюйте досвід, ціни та відгуки. Обирайте спеціаліста, якому
            готові довірити свою оселю.
          </p>
        </div>

        <div className="hero-stat">
          <strong>{visibleMasters.length}</strong>
          <span>перевірених профілів у каталозі</span>
        </div>
      </section>

      <section className="masters-catalog">
        <div className="catalog-heading">
          <div>
            <p className="eyebrow">Каталог майстрів</p>
            <h2>Оберіть свого фахівця</h2>
          </div>

          <p>Знайдено {visibleMasters.length} майстрів</p>
        </div>

        <div className="masters-grid">
          {visibleMasters.map((master) => {
            const isServicesExpanded = expandedServiceCards[master.id] ?? false;
            const visibleServices = isServicesExpanded ? master.services : master.services.slice(0, 4);
            const hiddenServicesCount = Math.max(master.services.length - 4, 0);
            const masterLocationDetails = locationDetails[master.id];
            const fallbackServiceArea =
              master.id === "andrey-ponomarenko" ? defaultServiceArea : `${master.city} та околиці`;
            const fallbackTravel = master.id === "andrey-ponomarenko" ? defaultTravelText : defaultDirectoryTravelText;
            const serviceArea = masterLocationDetails?.serviceArea?.trim() || fallbackServiceArea;
            const travel = masterLocationDetails?.travel?.trim() || fallbackTravel;
            const comment = masterLocationDetails?.comment?.trim();
            const priceFromServices = formatPriceFromServices(master.services, master.priceFrom);
            const masterAvailability = availabilitySlots[master.id] ?? getDefaultAvailabilitySlots(master.id);
            const calendarMonth = getCalendarMonth(master.id);
            const calendarDays = getMonthGrid(calendarMonth.year, calendarMonth.month);
            const freeDaysCount = calendarDays.filter((day) => {
              if (!day) return false;
              const dateKey = formatDateKey(calendarMonth.year, calendarMonth.month, day);
              return (masterAvailability[dateKey] ?? "free") === "free";
            }).length;
            const isCalendarOpen = openCalendarCard === master.id;

            return (
            <article className="directory-card" key={master.id}>
              <div className="directory-card-top">
                <div className={`directory-avatar avatar-${master.accent}`}>
                  {master.avatarUrl ? (
                    <img
                      src={master.avatarUrl}
                      alt={`Фото ${master.name}`}
                      style={{
                        objectPosition: `${master.avatarPositionX ?? 50}% ${master.avatarPositionY ?? 35}%`,
                        transformOrigin: `${master.avatarPositionX ?? 50}% ${master.avatarPositionY ?? 35}%`,
                        transform: `scale(${master.avatarZoom ?? 1})`,
                      }}
                    />
                  ) : (
                    <span>{master.initials}</span>
                  )}
                </div>

                <div>
                  <p className="master-profession">{master.profession}</p>
                  <h3>{master.name}</h3>
                  <p className="master-rating">
                    ★ {master.rating.toFixed(1)} · {master.reviews} відгуків
                  </p>
                  <p className="master-city">
                    ⌖ {master.city} · {master.experience}
                  </p>
                </div>
              </div>

              <p className="directory-description">{master.description}</p>

              <div className="directory-location-details">
                <span>
                  <strong>Зона роботи</strong>
                  {serviceArea}
                </span>
                <span>
                  <strong>Виїзд</strong>
                  {travel}
                </span>
                {comment && (
                  <span>
                    <strong>Коментар</strong>
                    {comment}
                  </span>
                )}
              </div>

              <div className="directory-services">
                <div className="directory-services-head">
                  <strong>Послуги</strong>
                  <span>
                    <small>{master.services.length} позиції</small>
                    {hiddenServicesCount > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedServiceCards((current) => ({
                            ...current,
                            [master.id]: !isServicesExpanded,
                          }))
                        }
                      >
                        {isServicesExpanded ? "Сховати" : `Ще ${hiddenServicesCount}`}
                      </button>
                    )}
                  </span>
                </div>
                <div className="directory-services-list">
                  {visibleServices.map((service) => (
                    <span key={`${master.id}-${service.name}-${service.price}`}>
                      <span>{service.name}</span>
                      <strong>{service.price}</strong>
                    </span>
                  ))}
                </div>
              </div>

              <div className="directory-card-bottom">
                <p>
                  Ціна від
                  <strong>{priceFromServices.replace(/^від\s+/i, "")}</strong>
                </p>
                <div className="directory-card-actions">
                  <Link href={`/profile/${master.id}`}>Переглянути профіль →</Link>
                  <div className="directory-booking-preview">
                    <div className="directory-booking-row">
                      <button
                        className="directory-calendar-toggle"
                        type="button"
                        aria-expanded={isCalendarOpen}
                        aria-label={`Календар майстра ${master.name}`}
                        onClick={() => setOpenCalendarCard((current) => (current === master.id ? null : master.id))}
                      >
                        <CalendarDays size={17} />
                      </button>
                      <Link href={`/profile/${master.id}#booking`}>Домовитись на вільну дату майстра</Link>
                    </div>
                    <div className={`directory-calendar-popover ${isCalendarOpen ? "is-open" : ""}`}>
                      <button
                        className="directory-calendar-close"
                        type="button"
                        aria-label="Закрити календар"
                        onClick={() => setOpenCalendarCard(null)}
                      >
                        <X size={14} />
                      </button>
                      <div className="directory-calendar-head">
                        <span>Календар майстра</span>
                        <div className="directory-calendar-toolbar">
                          <button type="button" onClick={() => changeCalendarMonth(master.id, -1)} aria-label="Попередній місяць">
                            <ChevronLeft size={15} />
                          </button>
                          <strong>
                            {catalogMonthNames[calendarMonth.month]} {calendarMonth.year}
                          </strong>
                          <button type="button" onClick={() => changeCalendarMonth(master.id, 1)} aria-label="Наступний місяць">
                            <ChevronRight size={15} />
                          </button>
                        </div>
                        <small>{freeDaysCount} вільних днів</small>
                      </div>
                      <div className="directory-calendar-weekdays" aria-hidden="true">
                        {previewCalendarWeekdays.map((day) => (
                          <span key={day}>{day}</span>
                        ))}
                      </div>
                      <div className="directory-calendar-grid" aria-label={`Календар майстра ${master.name}`}>
                        {calendarDays.map((day, index) => {
                          if (!day) {
                            return <span className="directory-calendar-empty" key={`empty-${index}`} />;
                          }

                          const dateKey = formatDateKey(calendarMonth.year, calendarMonth.month, day);
                          const status = masterAvailability[dateKey] ?? "free";

                          return (
                            <span
                              className={`directory-calendar-day is-${status}`}
                              key={dateKey}
                              aria-label={`${day}: ${status === "busy" ? "зайнято" : "вільно"}`}
                            >
                              {day}
                            </span>
                          );
                        })}
                      </div>
                      <div className="directory-calendar-legend">
                        <span>
                          <i className="is-free" /> Вільно
                        </span>
                        <span>
                          <i className="is-busy" /> Зайнято
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link href={`/profile/${master.id}#message`}>Написати майстру без вибору дати</Link>
                </div>
              </div>
            </article>
            );
          })}
        </div>
      </section>

      <footer className="masters-footer">
        <strong>БудПоміч</strong>
        <span>Майстри, яким можна довіряти.</span>
      </footer>
    </main>
  );
}
