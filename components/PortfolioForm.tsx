"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  calculateLineTotal,
  calculatePortfolioTotal,
  formatUah,
  PortfolioItem,
  PortfolioWorkLine,
  portfolioStorageKey,
} from "@/lib/portfolio";

const currentMasterId = "andrey-ponomarenko";

function createLine(id = crypto.randomUUID()): PortfolioWorkLine {
  return {
    id,
    workType: "",
    unit: "шт",
    unitPrice: 0,
    volume: 1,
    total: 0,
  };
}

export function PortfolioForm({
  initialItem,
}: {
  initialItem?: PortfolioItem;
}) {
  const isEditing = Boolean(initialItem);
  const [title, setTitle] = useState(initialItem?.title ?? "");
  const [city, setCity] = useState(initialItem?.city ?? "");
  const [objectType, setObjectType] = useState(
    initialItem?.objectType ?? "Квартира",
  );
  const [description, setDescription] = useState(
    initialItem?.description ?? "",
  );
  const [lines, setLines] = useState<PortfolioWorkLine[]>(
    initialItem?.workLines.length
      ? initialItem.workLines
      : [createLine("initial-line")],
  );
  const [photoUrl, setPhotoUrl] = useState(initialItem?.photoUrl ?? "");
  const [photoUrls, setPhotoUrls] = useState<string[]>(
    initialItem?.photoUrls?.length
      ? initialItem.photoUrls
      : initialItem?.photoUrl
        ? [initialItem.photoUrl]
        : [],
  );
  const [photoName, setPhotoName] = useState("");
  const [status, setStatus] = useState<{
    type: "idle" | "saving" | "success" | "error";
    message: string;
    itemId?: string;
  }>({ type: "idle", message: "" });

  const totalAmount = useMemo(() => calculatePortfolioTotal(lines), [lines]);

  function updateLine(
    id: string,
    field: keyof Pick<
      PortfolioWorkLine,
      "workType" | "unit" | "unitPrice" | "volume"
    >,
    value: string,
  ) {
    setLines((current) =>
      current.map((line) => {
        if (line.id !== id) return line;

        const next = {
          ...line,
          [field]:
            field === "unitPrice" || field === "volume"
              ? Math.max(0, Number(value))
              : value,
        };

        return {
          ...next,
          total: calculateLineTotal(next.unitPrice, next.volume),
        };
      }),
    );
  }

  function removeLine(id: string) {
    setLines((current) =>
      current.length === 1 ? current : current.filter((line) => line.id !== id),
    );
  }

  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) return;

    if (files.some((file) => file.size > 2 * 1024 * 1024)) {
      setStatus({
        type: "error",
        message: "Для локального MVP оберіть фото розміром до 2 МБ.",
      });
      event.target.value = "";
      return;
    }

    Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
            reader.onerror = reject;
            reader.readAsDataURL(file);
          }),
      ),
    )
      .then((urls) => {
        const nextUrls = urls.filter(Boolean);
        setPhotoUrls(nextUrls);
        setPhotoUrl(nextUrls[0] ?? "");
        setPhotoName(files.length === 1 ? files[0].name : `${files.length} фото`);
        setStatus({ type: "idle", message: "" });
      })
      .catch(() => setStatus({ type: "error", message: "Не вдалося прочитати фото." }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ type: "saving", message: "Зберігаємо роботу..." });

    const formData = new FormData(event.currentTarget);
    const payload = {
      id: initialItem?.id,
      createdAt: initialItem?.createdAt,
      masterId: initialItem?.masterId ?? currentMasterId,
      title: formData.get("title"),
      description: formData.get("description"),
      city: formData.get("city"),
      objectType: formData.get("objectType"),
      photoUrl,
      photoUrls,
      workLines: lines.map((line) => ({
        workType: line.workType,
        unit: line.unit,
        unitPrice: line.unitPrice,
        volume: line.volume,
      })),
    };

    try {
      const response = await fetch("/api/portfolio", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        item?: PortfolioItem;
        error?: string;
        persistence?: "supabase" | "browser";
      };

      if (!response.ok || !result.item) {
        throw new Error(result.error ?? "Не вдалося зберегти роботу.");
      }

      const stored = JSON.parse(
        localStorage.getItem(portfolioStorageKey) ?? "[]",
      ) as PortfolioItem[];
      const savedItem = {
        ...result.item,
        photoUrl,
        photoUrls: photoUrls.length ? photoUrls : result.item.photoUrl ? [result.item.photoUrl] : [],
      };

      localStorage.setItem(
        portfolioStorageKey,
        JSON.stringify([
          savedItem,
          ...stored.filter((item) => item.id !== savedItem.id),
        ]),
      );

      setStatus({
        type: "success",
        message:
          result.persistence === "supabase"
            ? "Роботу збережено в Supabase."
            : "Роботу збережено локально. Підключіть Supabase для постійного зберігання.",
        itemId: savedItem.id,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Не вдалося зберегти роботу.",
      });
    }
  }

  return (
    <form className="portfolio-form" onSubmit={handleSubmit}>
      <section className="portfolio-editor-card">
        <div className="portfolio-section-heading">
          <div>
            <p className="portfolio-eyebrow">Основна інформація</p>
            <h2>Опишіть виконаний проєкт</h2>
          </div>
          <span>Крок 1</span>
        </div>

        <div className="portfolio-fields-grid">
          <label className="field-wide">
            Назва роботи
            <input
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Наприклад, електрика у двокімнатній квартирі"
              required
            />
          </label>
          <label>
            Місто
            <input
              name="city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Київ"
              required
            />
          </label>
          <label>
            Тип об&apos;єкта
            <select
              name="objectType"
              value={objectType}
              onChange={(event) => setObjectType(event.target.value)}
              required
            >
              <option>Квартира</option>
              <option>Приватний будинок</option>
              <option>Офіс</option>
              <option>Комерційне приміщення</option>
              <option>Інше</option>
            </select>
          </label>
          <label className="field-wide">
            Опис
            <textarea
              name="description"
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Розкажіть, яке завдання було виконано, які матеріали та рішення використали."
              required
            />
          </label>
        </div>

        <label className="photo-upload">
          <input type="file" accept="image/*" multiple onChange={handlePhoto} />
          {photoUrl ? (
            <span className="photo-preview">
              <Image src={photoUrl} alt="Превью роботи" fill unoptimized />
              <b>{photoName || "Поточне фото"}</b>
            </span>
          ) : (
            <span>
              <ImagePlus size={28} />
              <b>Додати фото роботи</b>
              <small>JPG, PNG або WEBP, до 2 МБ</small>
            </span>
          )}
        </label>
      </section>

      <section className="portfolio-editor-card">
        <div className="portfolio-section-heading">
          <div>
            <p className="portfolio-eyebrow">Кошторис</p>
            <h2>Додайте виконані роботи</h2>
          </div>
          <span>Крок 2</span>
        </div>

        <div className="work-lines">
          <div className="work-line-labels" aria-hidden="true">
            <span>Тип роботи</span>
            <span>Одиниця</span>
            <span>Ціна</span>
            <span>Обсяг</span>
            <span>Сума</span>
            <span />
          </div>
          {lines.map((line, index) => (
            <div className="work-line" key={line.id}>
              <label>
                <span>Тип роботи</span>
                <input
                  value={line.workType}
                  onChange={(event) =>
                    updateLine(line.id, "workType", event.target.value)
                  }
                  placeholder={`Робота №${index + 1}`}
                  required
                />
              </label>
              <label>
                <span>Одиниця</span>
                <select
                  value={line.unit}
                  onChange={(event) =>
                    updateLine(line.id, "unit", event.target.value)
                  }
                >
                  <option value="шт">шт</option>
                  <option value="м²">м²</option>
                  <option value="м.п.">м.п.</option>
                  <option value="год">год</option>
                  <option value="компл.">компл.</option>
                </select>
              </label>
              <label>
                <span>Ціна</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitPrice || ""}
                  onChange={(event) =>
                    updateLine(line.id, "unitPrice", event.target.value)
                  }
                  required
                />
              </label>
              <label>
                <span>Обсяг</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={line.volume || ""}
                  onChange={(event) =>
                    updateLine(line.id, "volume", event.target.value)
                  }
                  required
                />
              </label>
              <strong>{formatUah(line.total, 2)}</strong>
              <button
                type="button"
                onClick={() => removeLine(line.id)}
                disabled={lines.length === 1}
                aria-label={`Видалити рядок ${index + 1}`}
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>

        <button
          className="add-work-line"
          type="button"
          onClick={() => setLines((current) => [...current, createLine()])}
        >
          <Plus size={18} /> Додати рядок роботи
        </button>

        <div className="portfolio-total">
          <span>
            Загальна сума
            <small>{lines.length} позицій у кошторисі</small>
          </span>
          <strong>{formatUah(totalAmount, 2)}</strong>
        </div>
      </section>

      <div className="portfolio-form-actions">
        <Link href="/dashboard/portfolio">
          <ArrowLeft size={17} /> Скасувати
        </Link>
        <button type="submit" disabled={status.type === "saving"}>
          <Save size={18} />
          {status.type === "saving"
            ? "Зберігаємо..."
            : isEditing
              ? "Зберегти зміни"
              : "Зберегти роботу"}
        </button>
      </div>

      {status.type !== "idle" && (
        <div className={`portfolio-status status-${status.type}`} role="status">
          <span>{status.message}</span>
          {status.type === "success" && (
            <Link href="/dashboard/portfolio">
              Повернутися до портфоліо <ArrowRight size={16} />
            </Link>
          )}
        </div>
      )}
    </form>
  );
}
