"use client";

import Link from "next/link";
import { ArrowRight, Plus, Save, Trash2 } from "lucide-react";
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

export function ProfileEditForm({ master }: { master: MasterProfile }) {
  const [profile, setProfile] = useState<EditableMasterProfile>({
    id: master.id,
    name: master.name,
    profession: master.profession,
    city: master.city,
    description: master.description,
    fullDescription: master.fullDescription,
    priceFrom: master.priceFrom,
    experience: master.experience,
    services: master.services,
  });
  const [status, setStatus] = useState<Status>({ type: "idle", message: "" });

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
        if (result.profile) setProfile(result.profile);
      })
      .catch(() => undefined);

    return () => window.clearTimeout(loadProfile);
  }, [master.id]);

  function updateField(
    field: keyof Omit<EditableMasterProfile, "id" | "services">,
    value: string,
  ) {
    setProfile((current) => ({
      ...current,
      [field]: field === "priceFrom" ? Math.max(0, Number(value)) : value,
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

  function removeService(index: number) {
    setProfile((current) => ({
      ...current,
      services:
        current.services.length === 1
          ? current.services
          : current.services.filter((_, serviceIndex) => serviceIndex !== index),
    }));
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

      const localProfiles = JSON.parse(
        localStorage.getItem(masterProfileStorageKey) ?? "{}",
      ) as Record<string, EditableMasterProfile>;
      localStorage.setItem(
        masterProfileStorageKey,
        JSON.stringify({ ...localProfiles, [master.id]: result.profile }),
      );
      setProfile(result.profile);
      setStatus({
        type: "success",
        message:
          result.persistence === "supabase"
            ? "Профіль оновлено."
            : "Профіль збережено локально. Підключіть Supabase для постійного зберігання.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Не вдалося зберегти профіль.",
      });
    }
  }

  return (
    <form className="profile-edit-form" onSubmit={handleSubmit}>
      <section className="profile-edit-card">
        <div className="profile-edit-card-heading">
          <div>
            <p>Основна інформація</p>
            <h2>Дані, які бачать клієнти</h2>
          </div>
          <span>{master.initials}</span>
        </div>

        <div className="profile-edit-grid">
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
            Місто
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
          <label className="profile-edit-wide">
            Короткий опис
            <textarea
              rows={3}
              value={profile.description}
              onChange={(event) => updateField("description", event.target.value)}
              required
            />
            <small>Використовується у каталозі майстрів.</small>
          </label>
          <label className="profile-edit-wide">
            Про майстра
            <textarea
              rows={6}
              value={profile.fullDescription}
              onChange={(event) =>
                updateField("fullDescription", event.target.value)
              }
              required
            />
          </label>
        </div>
      </section>

      <section className="profile-edit-card">
        <div className="profile-edit-card-heading">
          <div>
            <p>Послуги</p>
            <h2>Що ви виконуєте</h2>
          </div>
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

      <div className="profile-edit-actions">
        <Link href="/dashboard">Скасувати</Link>
        <button type="submit" disabled={status.type === "saving"}>
          <Save size={18} />
          {status.type === "saving" ? "Зберігаємо..." : "Зберегти зміни"}
        </button>
      </div>

      {status.type !== "idle" && (
        <div className={`profile-edit-status status-${status.type}`} role="status">
          <span>{status.message}</span>
          {status.type === "success" && (
            <Link href={`/profile/${master.id}?from=profile`}>
              Переглянути профіль <ArrowRight size={16} />
            </Link>
          )}
        </div>
      )}
    </form>
  );
}
