"use client";

import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Eye,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  Save,
  Star,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { MasterProfile } from "@/lib/masters";
import {
  EditableMasterProfile,
  masterProfileStorageKey,
} from "@/lib/master-profile-edit";

type Status = {
  type: "idle" | "saving" | "success" | "error";
  message: string;
};

type ProfileEditFormProps = {
  master: MasterProfile;
  onCancel?: () => void;
  onSaved?: (profile: EditableMasterProfile) => void;
};

export function ProfileEditForm({ master, onCancel, onSaved }: ProfileEditFormProps) {
  const [profile, setProfile] = useState<EditableMasterProfile>({
    id: master.id,
    name: master.name,
    profession: master.profession,
    city: master.city,
    description: master.description,
    fullDescription: master.fullDescription,
    avatarUrl: master.avatarUrl ?? "",
    coverImageUrl: master.coverImageUrl ?? "",
    avatarZoom: master.avatarZoom ?? 1,
    avatarPositionX: master.avatarPositionX ?? 50,
    avatarPositionY: master.avatarPositionY ?? 35,
    coverZoom: master.coverZoom ?? 1,
    coverPositionX: master.coverPositionX ?? 50,
    coverPositionY: master.coverPositionY ?? 50,
    priceFrom: master.priceFrom,
    experience: master.experience,
    services: master.services,
  });
  const [status, setStatus] = useState<Status>({ type: "idle", message: "" });
  const completedProfileItems = [
    Boolean(profile.avatarUrl),
    Boolean(profile.name.trim()),
    Boolean(profile.profession.trim()),
    Boolean(profile.city.trim()),
    Boolean(profile.description.trim()),
    profile.services.some((service) => service.name.trim()),
    true,
    true,
  ];
  const completionPercent = Math.round(
    (completedProfileItems.filter(Boolean).length / completedProfileItems.length) * 100,
  );

  useEffect(() => {
    const loadProfile = window.setTimeout(() => {
      const localProfiles = JSON.parse(
        localStorage.getItem(masterProfileStorageKey) ?? "{}",
      ) as Record<string, EditableMasterProfile>;
      if (localProfiles[master.id]) setProfile(localProfiles[master.id]);
    }, 0);

    fetch(`/api/profile?masterId=${encodeURIComponent(master.id)}`)
      .then((response) => response.json())
      .then((result: { profile?: EditableMasterProfile | null }) => {
        if (!result.profile) return;
        setProfile((current) => ({
          ...current,
          ...result.profile!,
          avatarUrl: result.profile!.avatarUrl || current.avatarUrl || "",
          coverImageUrl: result.profile!.coverImageUrl || current.coverImageUrl || "",
          avatarZoom: result.profile!.avatarZoom ?? current.avatarZoom ?? 1,
          avatarPositionX: result.profile!.avatarPositionX ?? current.avatarPositionX ?? 50,
          avatarPositionY: result.profile!.avatarPositionY ?? current.avatarPositionY ?? 35,
          coverZoom: result.profile!.coverZoom ?? current.coverZoom ?? 1,
          coverPositionX: result.profile!.coverPositionX ?? current.coverPositionX ?? 50,
          coverPositionY: result.profile!.coverPositionY ?? current.coverPositionY ?? 50,
        }));
      })
      .catch(() => undefined);

    return () => window.clearTimeout(loadProfile);
  }, [master.id]);

  function updateField(
    field: keyof Omit<EditableMasterProfile, "id" | "services">,
    value: string,
  ) {
    const numericFields: Array<keyof EditableMasterProfile> = [
      "priceFrom",
      "avatarZoom",
      "avatarPositionX",
      "avatarPositionY",
      "coverZoom",
      "coverPositionX",
      "coverPositionY",
    ];

    setProfile((current) => ({
      ...current,
      [field]: numericFields.includes(field) ? Math.max(0, Number(value)) : value,
    }));
  }

  function updateService(index: number, field: "name" | "price", value: string) {
    setProfile((current) => ({
      ...current,
      services: current.services.map((service, serviceIndex) =>
        serviceIndex === index ? { ...service, [field]: value } : service,
      ),
    }));
  }

  function handleImageUpload(field: "avatarUrl" | "coverImageUrl", file?: File) {
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setStatus({
        type: "error",
        message: "Підтримуються тільки jpg, png або webp.",
      });
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      setStatus({
        type: "error",
        message: "Фото завелике. Оберіть файл до 2.5 МБ.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfile((current) => ({
        ...current,
        [field]: String(reader.result ?? ""),
        ...(field === "avatarUrl"
          ? { avatarZoom: current.avatarZoom ?? 1, avatarPositionX: current.avatarPositionX ?? 50, avatarPositionY: current.avatarPositionY ?? 35 }
          : { coverZoom: current.coverZoom ?? 1, coverPositionX: current.coverPositionX ?? 50, coverPositionY: current.coverPositionY ?? 50 }),
      }));
      setStatus({ type: "idle", message: "" });
    };
    reader.onerror = () => {
      setStatus({ type: "error", message: "Не вдалося прочитати файл." });
    };
    reader.readAsDataURL(file);
  }

  function removeService(index: number) {
    setProfile((current) => ({
      ...current,
      services:
        current.services.length === 1
          ? current.services
          : current.services.filter((_, serviceIndex) => serviceIndex !== index),
    }));
  }

  function persistLocalProfile(nextProfile: EditableMasterProfile) {
    const localProfiles = JSON.parse(
      localStorage.getItem(masterProfileStorageKey) ?? "{}",
    ) as Record<string, EditableMasterProfile>;

    localStorage.setItem(
      masterProfileStorageKey,
      JSON.stringify({ ...localProfiles, [master.id]: nextProfile }),
    );
  }

  function imageStyle(kind: "avatar" | "cover") {
    const zoom = kind === "avatar" ? profile.avatarZoom ?? 1 : profile.coverZoom ?? 1;
    const x = kind === "avatar" ? profile.avatarPositionX ?? 50 : profile.coverPositionX ?? 50;
    const y = kind === "avatar" ? profile.avatarPositionY ?? 35 : profile.coverPositionY ?? 50;

    return {
      objectPosition: `${x}% ${y}%`,
      transformOrigin: `${x}% ${y}%`,
      transform: `scale(${zoom})`,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ type: "saving", message: "Зберігаємо зміни..." });

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const result = (await response.json()) as {
        profile?: EditableMasterProfile;
        error?: string;
        persistence?: "supabase" | "browser";
      };

      if (!response.ok || !result.profile) {
        throw new Error(result.error ?? "Не вдалося зберегти профіль.");
      }

      persistLocalProfile(result.profile);
      setProfile(result.profile);
      onSaved?.(result.profile);
      setStatus({
        type: "success",
        message:
          result.persistence === "supabase"
            ? "Профіль оновлено."
            : "Профіль збережено локально. Підключіть Supabase для постійного зберігання.",
      });
    } catch (error) {
      persistLocalProfile(profile);
      setProfile(profile);
      onSaved?.(profile);
      setStatus({
        type: "success",
        message:
          error instanceof Error
            ? `Профіль збережено локально. Supabase тимчасово не прийняв зміни: ${error.message}`
            : "Профіль збережено локально.",
      });
    }
  }

  return (
    <form className="profile-edit-form" onSubmit={handleSubmit}>
      <section
        className={`profile-editor-public-hero ${profile.coverImageUrl ? "has-cover-image" : ""}`}
        style={
          profile.coverImageUrl
            ? ({
                "--editor-cover-image": `url(${profile.coverImageUrl})`,
                "--editor-cover-x": `${profile.coverPositionX ?? 50}%`,
                "--editor-cover-y": `${profile.coverPositionY ?? 50}%`,
                "--editor-cover-scale": `${profile.coverZoom ?? 1}`,
              } as Record<string, string>)
            : undefined
        }
      >
        <div className="profile-editor-hero-person">
          <div className={`profile-editor-hero-avatar avatar-${master.accent}`}>
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" style={imageStyle("avatar")} />
            ) : (
              master.initials
            )}
          </div>
          <div>
            <p className="profile-editor-eyebrow">{profile.profession}</p>
            <h2>{profile.name}</h2>
            <p className="profile-editor-location">
              <MapPin size={15} /> {profile.city}
              {master.district ? `, ${master.district}` : ""} В· {profile.experience}
            </p>
            <p className="profile-editor-description">{profile.description}</p>
            <div className="profile-editor-rating">
              <Star size={16} fill="currentColor" />
              <strong>{master.rating.toFixed(1)}</strong>
              <span>{master.reviews} відгуків</span>
            </div>
          </div>
        </div>

        <div className="profile-editor-action-card">
          <span>Вартість робіт</span>
          <strong>від {profile.priceFrom.toLocaleString("uk-UA")} грн</strong>
          <Link href={`/profile/${master.id}?from=profile`}>
            <Eye size={16} /> Переглянути публічний профіль
          </Link>
          <small>Так клієнти бачать ваш профіль.</small>
        </div>
      </section>

      <section className="profile-editor-progress-card">
        <div>
          <span>Профіль заповнено на {completionPercent}%</span>
          <strong>Заповніть фото, опис, послуги та портфоліо, щоб профіль виглядав сильніше.</strong>
        </div>
        <div className="profile-editor-progress-track">
          <span style={{ width: `${completionPercent}%` }} />
        </div>
      </section>

      <nav className="profile-editor-section-tabs" aria-label="Розділи редагування профілю">
        <a href="#profile-main">Мій профіль</a>
        <a href="#profile-about">Про майстра</a>
        <a href="#profile-location">Локація</a>
        <a href="#profile-services">Послуги</a>
        <a href="#profile-portfolio">Портфоліо</a>
        <a href="#profile-contacts">Контакти</a>
      </nav>
      <section className="profile-edit-card" id="profile-main">
        <div className="profile-edit-card-heading">
          <div>
            <p>Основна інформація</p>
            <h2>Дані, які бачать клієнти</h2>
          </div>
          <a className="profile-section-edit-link" href="#profile-main">
            <Pencil size={15} /> Редагувати
          </a>
        </div>

        <div className="profile-edit-grid">
          <div className="profile-photo-upload">
            Фото майстра
            <span className="profile-photo-preview avatar-preview">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Фото майстра" style={imageStyle("avatar")} />
              ) : (
                <b>{master.initials}</b>
              )}
            </span>
            <input
              accept="image/jpeg,image/png,image/webp"
              type="file"
              onChange={(event) => handleImageUpload("avatarUrl", event.target.files?.[0])}
            />
            {profile.avatarUrl && (
              <div className="profile-crop-controls">
                <label>
                  Збільшення
                  <input
                    max="2.4"
                    min="1"
                    step="0.05"
                    type="range"
                    value={profile.avatarZoom ?? 1}
                    onChange={(event) => updateField("avatarZoom", event.target.value)}
                  />
                </label>
                <label>
                  Зсув по горизонталі
                  <input
                    max="100"
                    min="0"
                    step="1"
                    type="range"
                    value={profile.avatarPositionX ?? 50}
                    onChange={(event) => updateField("avatarPositionX", event.target.value)}
                  />
                </label>
                <label>
                  Зсув по вертикалі
                  <input
                    max="100"
                    min="0"
                    step="1"
                    type="range"
                    value={profile.avatarPositionY ?? 35}
                    onChange={(event) => updateField("avatarPositionY", event.target.value)}
                  />
                </label>
              </div>
            )}
            <small>Обличчя буде по центру, зайве обрізається під рамку.</small>
          </div>
          <div className="profile-photo-upload">
            Обкладинка профілю
            <span className="profile-photo-preview cover-preview">
              {profile.coverImageUrl ? (
                <img src={profile.coverImageUrl} alt="Обкладинка профілю" style={imageStyle("cover")} />
              ) : (
                <b>Обкладинка</b>
              )}
            </span>
            <input
              accept="image/jpeg,image/png,image/webp"
              type="file"
              onChange={(event) => handleImageUpload("coverImageUrl", event.target.files?.[0])}
            />
            {profile.coverImageUrl && (
              <div className="profile-crop-controls">
                <label>
                  Збільшення
                  <input
                    max="2.4"
                    min="1"
                    step="0.05"
                    type="range"
                    value={profile.coverZoom ?? 1}
                    onChange={(event) => updateField("coverZoom", event.target.value)}
                  />
                </label>
                <label>
                  Зсув по горизонталі
                  <input
                    max="100"
                    min="0"
                    step="1"
                    type="range"
                    value={profile.coverPositionX ?? 50}
                    onChange={(event) => updateField("coverPositionX", event.target.value)}
                  />
                </label>
                <label>
                  Зсув по вертикалі
                  <input
                    max="100"
                    min="0"
                    step="1"
                    type="range"
                    value={profile.coverPositionY ?? 50}
                    onChange={(event) => updateField("coverPositionY", event.target.value)}
                  />
                </label>
              </div>
            )}
            <small>Фото обрізається по ширині блоку профілю.</small>
          </div>
          <label>
            Ім&apos;я та прізвище
            <input
              value={profile.name}
              onChange={(event) => updateField("name", event.target.value)}
              required
            />
          </label>
          <label>
            Професія
            <input
              value={profile.profession}
              onChange={(event) => updateField("profession", event.target.value)}
              required
            />
          </label>
          <label>
            РњС–СЃС‚Рѕ
            <input
              value={profile.city}
              onChange={(event) => updateField("city", event.target.value)}
              required
            />
          </label>
          <label>
            Досвід
            <input
              value={profile.experience}
              onChange={(event) => updateField("experience", event.target.value)}
              placeholder="Наприклад, 8 років досвіду"
              required
            />
          </label>
          <label>
            Ціна від, грн
            <input
              type="number"
              min="0"
              step="1"
              value={profile.priceFrom}
              onChange={(event) => updateField("priceFrom", event.target.value)}
              required
            />
          </label>
        </div>
      </section>

      <section className="profile-edit-card" id="profile-about">
        <div className="profile-edit-card-heading">
          <div>
            <p>Про майстра</p>
            <h2>Досвід і підхід до роботи</h2>
          </div>
          <a className="profile-section-edit-link" href="#profile-about">
            <Pencil size={15} /> Редагувати опис
          </a>
        </div>

        <div className="profile-edit-grid">
          <label className="profile-edit-wide">
            Короткий опис
            <textarea
              rows={3}
              value={profile.description}
              onChange={(event) => updateField("description", event.target.value)}
              required
            />
            <small>Використовується у каталозі майстрів і верхньому блоці профілю.</small>
          </label>
          <label className="profile-edit-wide">
            Повний опис
            <textarea
              rows={6}
              value={profile.fullDescription}
              onChange={(event) =>
                updateField("fullDescription", event.target.value)
              }
              required
            />
          </label>
          <label>
            З якими обʼєктами працюєте
            <input placeholder="Квартири, офіси, комерційні приміщення" />
          </label>
          <label>
            Мови спілкування
            <input placeholder="Українська, російська" />
          </label>
        </div>
      </section>

      <section className="profile-edit-card" id="profile-location">
        <div className="profile-edit-card-heading">
          <div>
            <p>Місцезнаходження</p>
            <h2>Локація та зона роботи</h2>
          </div>
          <a className="profile-section-edit-link" href="#profile-location">
            <MapPin size={15} /> Редагувати
          </a>
        </div>

        <div className="profile-edit-grid">
          <label>
            Країна
            <input defaultValue="Україна" />
          </label>
          <label>
            Область
            <input placeholder="Київська область" />
          </label>
          <label>
            Місто
            <input
              value={profile.city}
              onChange={(event) => updateField("city", event.target.value)}
              required
            />
          </label>
          <label>
            Район
            <input defaultValue={master.district ?? ""} placeholder="Наприклад, Оболонь" />
          </label>
          <label>
            Радіус виїзду, км
            <input defaultValue="30" inputMode="numeric" />
          </label>
          <label className="profile-edit-wide">
            Коментар по виїзду
            <textarea rows={3} placeholder="Працюю по Києву та передмістю до 30 км." />
          </label>
        </div>
      </section>

      <section className="profile-edit-card" id="profile-services">
        <div className="profile-edit-card-heading">
          <div>
            <p>Послуги</p>
            <h2>Що ви виконуєте</h2>
          </div>
          <a className="profile-section-edit-link" href="#profile-services">
            <BriefcaseBusiness size={15} /> Редагувати послуги
          </a>
        </div>

        <div className="profile-service-list">
          {profile.services.map((service, index) => (
            <div className="profile-service-row" key={index}>
              <label>
                Назва послуги
                <input
                  value={service.name}
                  onChange={(event) =>
                    updateService(index, "name", event.target.value)
                  }
                  required
                />
              </label>
              <label>
                Ціна
                <input
                  value={service.price}
                  onChange={(event) =>
                    updateService(index, "price", event.target.value)
                  }
                  placeholder="від 500 грн"
                  required
                />
              </label>
              <button
                type="button"
                onClick={() => removeService(index)}
                disabled={profile.services.length === 1}
                aria-label={`Видалити послугу ${index + 1}`}
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>

        <button
          className="profile-add-service"
          type="button"
          onClick={() =>
            setProfile((current) => ({
              ...current,
              services: [...current.services, { name: "", price: "" }],
            }))
          }
        >
          <Plus size={17} /> Додати послугу
        </button>
      </section>

      <section className="profile-edit-card" id="profile-portfolio">
        <div className="profile-edit-card-heading">
          <div>
            <p>Портфоліо</p>
            <h2>Виконані роботи</h2>
          </div>
          <Link className="profile-section-edit-link" href="/dashboard/portfolio">
            <Pencil size={15} /> Керувати портфоліо
          </Link>
        </div>
        <div className="profile-editor-mini-grid">
          {master.works.slice(0, 2).map((work) => (
            <article className="profile-editor-mini-work" key={work.title}>
              <div className={`work-image work-crop-${work.crop}`} />
              <div>
                <span>{work.category ?? "Робота"}</span>
                <strong>{work.title}</strong>
                <small>{work.location}</small>
              </div>
            </article>
          ))}
          <Link className="profile-editor-add-tile" href="/dashboard/portfolio/new">
            <Plus size={20} /> Додати роботу
          </Link>
        </div>
      </section>

      <section className="profile-edit-card" id="profile-calendar">
        <div className="profile-edit-card-heading">
          <div>
            <p>Календар</p>
            <h2>Доступність для заявок</h2>
          </div>
          <a className="profile-section-edit-link" href="/dashboard#overview">
            <CalendarDays size={15} /> Налаштувати календар
          </a>
        </div>
        <div className="profile-editor-info-strip">
          <span>Зайняті дати зараз: {master.busyDates?.length ?? 0}</span>
          <small>Публічний профіль використовує ці дати для блокування періодів у заявці.</small>
        </div>
      </section>

      <section className="profile-edit-card" id="profile-contacts">
        <div className="profile-edit-card-heading">
          <div>
            <p>Контакти</p>
            <h2>Способи звʼязку</h2>
          </div>
          <a className="profile-section-edit-link" href="#profile-contacts">
            <MessageSquare size={15} /> Редагувати контакти
          </a>
        </div>
        <div className="profile-edit-grid">
          <label>
            Телефон
            <input placeholder="+380..." />
          </label>
          <label>
            Email
            <input placeholder="name@example.com" type="email" />
          </label>
          <label>
            Telegram
            <input placeholder="@username" />
          </label>
          <label>
            WhatsApp / Viber
            <input placeholder="+380..." />
          </label>
          <label>
            Бажаний спосіб звʼязку
            <input placeholder="BudPomich, телефон, Telegram" />
          </label>
          <label className="profile-edit-wide profile-editor-checkbox">
            <input type="checkbox" defaultChecked />
            Приймати заявки через BudPomich
          </label>
        </div>
      </section>

      <div className="profile-edit-actions">
        {onCancel ? (
          <button className="profile-edit-cancel-button" type="button" onClick={onCancel}>
            Скасувати
          </button>
        ) : (
          <Link href="/dashboard">Скасувати</Link>
        )}
        <button type="submit" disabled={status.type === "saving"}>
          <Save size={18} />
          {status.type === "saving" ? "Зберігаємо..." : "Зберегти зміни"}
        </button>
      </div>

      {status.type !== "idle" && (
        <div className={`profile-edit-status status-${status.type}`} role="status">
          <span>{status.message}</span>
          {status.type === "success" && (
            onCancel ? (
              <button type="button" onClick={onCancel}>
                Переглянути профіль <ArrowRight size={16} />
              </button>
            ) : (
              <Link href={`/profile/${master.id}?from=profile`}>
                Переглянути профіль <ArrowRight size={16} />
              </Link>
            )
          )}
        </div>
      )}
    </form>
  );
}
