"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import type { MasterProfile } from "@/lib/masters";
import {
  type EditableMasterProfile,
  masterProfileStorageKey,
  mergeMasterProfile,
} from "@/lib/master-profile-edit";
import { formatPriceFromServices } from "@/lib/master-pricing";

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
const pageSize = 6;
const serviceFilters = ["Гіпсокартон", "Плитка", "Електрик", "Сантехніка", "Малярні роботи", "Комплексний ремонт"];
const ratingFilters = [
  { label: "Будь-який", value: 0 },
  { label: "4.5 і вище", value: 4.5 },
  { label: "4.0 і вище", value: 4 },
];
const priceFilters = [
  { label: "Будь-яка", value: "all" },
  { label: "до 500 грн", value: "500" },
  { label: "до 1 000 грн", value: "1000" },
  { label: "до 5 000 грн", value: "5000" },
];
type SortMode = "rating" | "price-asc" | "price-desc" | "experience";

function getExperienceYears(master: MasterProfile) {
  return Number.parseInt(master.experience, 10) || 0;
}

function hasPhoneContact(master: MasterProfile) {
  return master.contacts?.some((contact) => contact.href.startsWith("tel:") || contact.label.toLowerCase().includes("тел")) ?? false;
}

export function MastersCatalogView({ masters }: MastersCatalogViewProps) {
  const [profileEdits, setProfileEdits] = useState<Record<string, EditableMasterProfile>>({});
  const [locationDetails, setLocationDetails] = useState<Record<string, LocationDetails>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceFilters, setSelectedServiceFilters] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState(0);
  const [priceFilter, setPriceFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("rating");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const visibleMasters = useMemo(
    () => masters.map((master) => mergeMasterProfile(master, profileEdits[master.id])),
    [masters, profileEdits],
  );
  const cityOptions = useMemo(
    () => Array.from(new Set(visibleMasters.map((master) => master.city).filter(Boolean))).sort(),
    [visibleMasters],
  );
  const districtOptions = useMemo(
    () => Array.from(new Set(visibleMasters.map((master) => master.district).filter((district): district is string => Boolean(district)))).sort(),
    [visibleMasters],
  );

  useEffect(() => {
    const localProfiles = JSON.parse(
      localStorage.getItem(masterProfileStorageKey) ?? "{}",
    ) as Record<string, EditableMasterProfile>;

    setProfileEdits(localProfiles);
    setLocationDetails(
      JSON.parse(localStorage.getItem(locationDetailsStorageKey) ?? "{}") as Record<string, LocationDetails>,
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

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [searchQuery, selectedServiceFilters, cityFilter, districtFilter, ratingFilter, priceFilter, experienceFilter, onlyAvailable, verifiedOnly, sortMode]);

  const filteredMasters = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const maxPrice = priceFilter === "all" ? Number.POSITIVE_INFINITY : Number(priceFilter);

    return visibleMasters
      .filter((master) => {
        const haystack = [
          master.name,
          master.profession,
          master.city,
          master.district ?? "",
          master.description,
          ...master.services.map((service) => `${service.name} ${service.price}`),
        ].join(" ").toLowerCase();
        const isAvailable = master.isProfileActive !== false && master.acceptsBudPomichRequests !== false;

        if (normalizedSearch && !haystack.includes(normalizedSearch)) return false;
        if (
          selectedServiceFilters.length > 0 &&
          !selectedServiceFilters.some((service) => haystack.includes(service.toLowerCase()))
        ) {
          return false;
        }
        if (cityFilter !== "all" && master.city !== cityFilter) return false;
        if (districtFilter !== "all" && master.district !== districtFilter) return false;
        if (ratingFilter && master.rating < ratingFilter) return false;
        if (master.priceFrom > maxPrice) return false;
        if (experienceFilter !== "all") {
          const years = getExperienceYears(master);
          if (experienceFilter === "0-2" && years > 2) return false;
          if (experienceFilter === "2-5" && (years < 2 || years > 5)) return false;
          if (experienceFilter === "5+" && years <= 5) return false;
        }
        if (onlyAvailable && !isAvailable) return false;
        if (verifiedOnly && !hasPhoneContact(master)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortMode === "price-asc") return a.priceFrom - b.priceFrom;
        if (sortMode === "price-desc") return b.priceFrom - a.priceFrom;
        if (sortMode === "experience") return getExperienceYears(b) - getExperienceYears(a);
        return b.rating - a.rating || b.reviews - a.reviews;
      });
  }, [cityFilter, districtFilter, experienceFilter, onlyAvailable, priceFilter, ratingFilter, searchQuery, selectedServiceFilters, sortMode, verifiedOnly, visibleMasters]);

  const shownMasters = filteredMasters.slice(0, visibleCount);
  const activeFilterCount = [
    selectedServiceFilters.length > 0,
    cityFilter !== "all",
    districtFilter !== "all",
    ratingFilter > 0,
    priceFilter !== "all",
    experienceFilter !== "all",
    onlyAvailable,
    verifiedOnly,
    searchQuery.trim().length > 0,
  ].filter(Boolean).length;
  const activeFilterLabels = [
    searchQuery.trim() ? `Пошук: ${searchQuery.trim()}` : "",
    ...selectedServiceFilters,
    cityFilter !== "all" ? cityFilter : "",
    districtFilter !== "all" ? districtFilter : "",
    ratingFilter > 0 ? `Рейтинг від ${ratingFilter}` : "",
    priceFilter !== "all" ? priceFilters.find((price) => price.value === priceFilter)?.label ?? "" : "",
    experienceFilter === "0-2" ? "До 2 років" : "",
    experienceFilter === "2-5" ? "2-5 років" : "",
    experienceFilter === "5+" ? "Понад 5 років" : "",
    onlyAvailable ? "Доступний зараз" : "",
    verifiedOnly ? "Перевірені" : "",
  ].filter(Boolean);
  const loadProgress = filteredMasters.length ? Math.round((shownMasters.length / filteredMasters.length) * 100) : 0;

  function resetFilters() {
    setSearchQuery("");
    setSelectedServiceFilters([]);
    setCityFilter("all");
    setDistrictFilter("all");
    setRatingFilter(0);
    setPriceFilter("all");
    setExperienceFilter("all");
    setOnlyAvailable(false);
    setVerifiedOnly(false);
    setSortMode("rating");
  }

  function toggleServiceFilter(service: string) {
    setSelectedServiceFilters((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service],
    );
  }

  function renderFilterControls(prefix: string) {
    return (
      <>
        <div className="catalog-filter-group">
          <h3>Спеціальність</h3>
          <div className="catalog-filter-chips">
            <button className={selectedServiceFilters.length === 0 ? "active" : ""} type="button" onClick={() => setSelectedServiceFilters([])}>
              Усі
            </button>
            {serviceFilters.map((service) => (
              <button
                className={selectedServiceFilters.includes(service) ? "active" : ""}
                type="button"
                onClick={() => toggleServiceFilter(service)}
                key={`${prefix}-${service}`}
              >
                {service}
              </button>
            ))}
          </div>
        </div>

        <div className="catalog-filter-group">
          <h3>Місто</h3>
          <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}>
            <option value="all">Усі міста</option>
            {cityOptions.map((city) => (
              <option value={city} key={`${prefix}-${city}`}>{city}</option>
            ))}
          </select>
        </div>

        <div className="catalog-filter-group">
          <h3>Район роботи</h3>
          <div className="catalog-filter-chips">
            <button className={districtFilter === "all" ? "active" : ""} type="button" onClick={() => setDistrictFilter("all")}>
              Усі райони
            </button>
            {districtOptions.map((district) => (
              <button className={districtFilter === district ? "active" : ""} type="button" onClick={() => setDistrictFilter(district)} key={`${prefix}-${district}`}>
                {district}
              </button>
            ))}
          </div>
        </div>

        <div className="catalog-filter-group">
          <h3>Ціна</h3>
          <select value={priceFilter} onChange={(event) => setPriceFilter(event.target.value)}>
            {priceFilters.map((price) => (
              <option value={price.value} key={`${prefix}-${price.value}`}>{price.label}</option>
            ))}
          </select>
        </div>

        <div className="catalog-filter-group">
          <h3>Рейтинг</h3>
          <div className="catalog-radio-list">
            {ratingFilters.map((rating) => (
              <label key={`${prefix}-rating-${rating.value}`}>
                <input
                  checked={ratingFilter === rating.value}
                  name={`${prefix}-rating`}
                  type="radio"
                  onChange={() => setRatingFilter(rating.value)}
                />
                <span>{rating.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="catalog-filter-group">
          <h3>Досвід</h3>
          <div className="catalog-radio-list">
            <label>
              <input checked={experienceFilter === "all"} name={`${prefix}-experience`} type="radio" onChange={() => setExperienceFilter("all")} />
              <span>Будь-який</span>
            </label>
            <label>
              <input checked={experienceFilter === "0-2"} name={`${prefix}-experience`} type="radio" onChange={() => setExperienceFilter("0-2")} />
              <span>До 2 років</span>
            </label>
            <label>
              <input checked={experienceFilter === "2-5"} name={`${prefix}-experience`} type="radio" onChange={() => setExperienceFilter("2-5")} />
              <span>2-5 років</span>
            </label>
            <label>
              <input checked={experienceFilter === "5+"} name={`${prefix}-experience`} type="radio" onChange={() => setExperienceFilter("5+")} />
              <span>Понад 5 років</span>
            </label>
          </div>
        </div>

        <div className="catalog-filter-group">
          <h3>Доступність</h3>
          <div className="catalog-radio-list">
            <label>
              <input checked={onlyAvailable} type="checkbox" onChange={(event) => setOnlyAvailable(event.target.checked)} />
              <span>Доступний для заявок</span>
            </label>
            <label>
              <input checked={verifiedOnly} type="checkbox" onChange={(event) => setVerifiedOnly(event.target.checked)} />
              <span>Перевірений майстер</span>
            </label>
          </div>
        </div>

        <button className="catalog-reset-button" type="button" onClick={resetFilters}>
          Скинути фільтри
        </button>
      </>
    );
  }

  return (
    <main className="masters-page masters-catalog-page">
      <SiteHeader active="masters" showBecomeMaster />

      <section className="catalog-shell">
        <Link className="catalog-crumb" href="/">← Головна</Link>

        <div className="catalog-page-head">
          <p className="eyebrow">Каталог</p>
          <h1>Каталог майстрів</h1>
          <p>
            Знайдіть перевіреного майстра для ремонту за спеціальністю, містом,
            ціною, рейтингом та доступністю для заявки.
          </p>
          <span>
            Показано <b>{shownMasters.length}</b> з <b>{filteredMasters.length}</b> майстрів
          </span>
        </div>

        <div className="catalog-toolbar">
          <label className="catalog-search">
            <Search size={18} />
            <input
              value={searchQuery}
              placeholder="Пошук за імʼям, містом або спеціальністю..."
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <button className="catalog-mobile-filter-button" type="button" onClick={() => setIsMobileFiltersOpen(true)}>
            <SlidersHorizontal size={17} />
            Фільтри
            {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
          </button>

          <label className="catalog-sort">
            <span>Сортувати:</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              <option value="rating">За рейтингом</option>
              <option value="experience">За досвідом</option>
              <option value="price-asc">Ціна: спочатку дешевші</option>
              <option value="price-desc">Ціна: спочатку дорожчі</option>
            </select>
          </label>
        </div>

        <div className="catalog-layout">
          <aside className="catalog-filters" aria-label="Фільтри каталогу">
            <div className="catalog-filters-head">
              <strong>Фільтри</strong>
              {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
            </div>
            {renderFilterControls("desktop")}
          </aside>

          <section className="catalog-results" aria-label="Список майстрів">
            <div className="catalog-results-head">
              <div>
                <strong>{filteredMasters.length}</strong>
                <span>результатів</span>
              </div>
              {activeFilterCount > 0 && (
                <button type="button" onClick={resetFilters}>
                  Очистити все
                </button>
              )}
            </div>

            {activeFilterLabels.length > 0 && (
              <div className="catalog-active-filters" aria-label="Активні фільтри">
                {activeFilterLabels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            )}

            {shownMasters.length ? (
              <div className="catalog-master-list">
                {shownMasters.map((master) => {
                  const masterLocationDetails = locationDetails[master.id];
                  const serviceArea =
                    masterLocationDetails?.serviceArea?.trim() ||
                    (master.id === "andrey-ponomarenko" ? defaultServiceArea : `${master.city} та околиці`);
                  const travel =
                    masterLocationDetails?.travel?.trim() ||
                    (master.id === "andrey-ponomarenko" ? defaultTravelText : defaultDirectoryTravelText);
                  const priceFromServices = formatPriceFromServices(master.services, master.priceFrom);
                  const isAvailable = master.isProfileActive !== false && master.acceptsBudPomichRequests !== false;
                  const isVerified = hasPhoneContact(master);

                  return (
                    <article className="catalog-master-card" key={master.id}>
                      <div className={`catalog-master-avatar avatar-${master.accent}`}>
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
                        {isVerified && <i>✓</i>}
                      </div>

                      <div className="catalog-master-body">
                        <div className="catalog-master-title">
                          <div>
                            <p>{master.profession}</p>
                            <h2>{master.name}</h2>
                          </div>
                          <span>★ {master.rating.toFixed(1)} · {master.reviews} відгуків</span>
                        </div>

                        <p className="catalog-master-description">{master.description}</p>

                        <div className="catalog-master-meta">
                          <span>{master.city}{master.district ? ` · ${master.district}` : ""}</span>
                          <span>{master.experience}</span>
                          <span>{serviceArea}</span>
                          <span>{travel}</span>
                        </div>

                        <div className="catalog-master-tags">
                          <span className={isAvailable ? "is-available" : "is-busy"}>
                            {isAvailable ? "Доступний для заявок" : "Не доступний для заявок"}
                          </span>
                          {isVerified && <span>Перевірений</span>}
                          {master.services.slice(0, 2).map((service) => (
                            <span key={`${master.id}-${service.name}`}>{service.name}</span>
                          ))}
                        </div>
                      </div>

                      <div className="catalog-master-actions">
                        <p>
                          Ціна від
                          <strong>{priceFromServices.replace(/^від\s+/i, "")}</strong>
                        </p>
                        <Link className="catalog-primary-action" href={`/profile/${master.id}`}>
                          Профіль
                        </Link>
                        <Link href={`/profile/${master.id}#message`}>Написати</Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="catalog-empty-state">
                <h2>Майстрів не знайдено</h2>
                <p>Спробуйте змінити фільтри або очистити пошук.</p>
                <button type="button" onClick={resetFilters}>Скинути фільтри</button>
              </div>
            )}

            {filteredMasters.length > shownMasters.length && (
              <div className="catalog-load-more">
                <div className="catalog-load-progress" aria-hidden="true">
                  <i style={{ width: `${loadProgress}%` }} />
                </div>
                <span>
                  Показано {shownMasters.length} з {filteredMasters.length}
                </span>
                <button type="button" onClick={() => setVisibleCount((current) => current + pageSize)}>
                  Показати ще
                </button>
              </div>
            )}
          </section>
        </div>
      </section>

      <div className={`catalog-drawer-backdrop ${isMobileFiltersOpen ? "is-open" : ""}`} onClick={() => setIsMobileFiltersOpen(false)} />
      <aside className={`catalog-mobile-drawer ${isMobileFiltersOpen ? "is-open" : ""}`} aria-label="Мобільні фільтри">
        <div className="catalog-mobile-drawer-head">
          <div>
            <span>Фільтри</span>
            <strong>Уточнити пошук</strong>
          </div>
          <button type="button" onClick={() => setIsMobileFiltersOpen(false)} aria-label="Закрити фільтри">
            <X size={18} />
          </button>
        </div>
        <div className="catalog-mobile-drawer-body">
          {renderFilterControls("mobile")}
        </div>
        <div className="catalog-mobile-drawer-foot">
          <button type="button" onClick={() => setIsMobileFiltersOpen(false)}>
            Показати {filteredMasters.length} результатів
          </button>
        </div>
      </aside>

      <footer className="masters-footer">
        <strong>БудПоміч</strong>
        <span>Майстри, яким можна довіряти.</span>
      </footer>
    </main>
  );
}
