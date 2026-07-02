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
  ProjectDocument,
  ProjectPhoto,
  PortfolioWorkLine,
  portfolioUnits,
  portfolioWorkCategories,
  portfolioStorageKey,
} from "@/lib/portfolio";

const currentMasterId = "andrey-ponomarenko";
const maxProjectPhotoSize = 5 * 1024 * 1024;
const allowedProjectPhotoTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const allowedDocumentTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
const documentTypes = [
  { value: "estimate", label: "Кошторис" },
  { value: "contract", label: "Договір" },
  { value: "act", label: "Акт виконаних робіт" },
  { value: "warranty", label: "Гарантія" },
  { value: "invoice", label: "Рахунок" },
  { value: "material_receipt", label: "Чеки / матеріали" },
  { value: "technical_plan", label: "Технічний план" },
  { value: "permit", label: "Дозвіл" },
  { value: "photo_report", label: "Фотозвіт" },
  { value: "other", label: "Інше" },
];

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
  const [workCategory, setWorkCategory] = useState(initialItem?.workCategory ?? "Гіпсокартон");
  const [district, setDistrict] = useState(initialItem?.district ?? "");
  const [publicLocation, setPublicLocation] = useState(initialItem?.publicLocation ?? "");
  const [privateAddress, setPrivateAddress] = useState(initialItem?.privateAddress ?? "");
  const [showExactAddress, setShowExactAddress] = useState(Boolean(initialItem?.showExactAddress));
  const [startedAt, setStartedAt] = useState(initialItem?.startedAt ?? "");
  const [completedAt, setCompletedAt] = useState(initialItem?.completedAt ?? "");
  const [durationDays, setDurationDays] = useState(String(initialItem?.durationDays ?? ""));
  const [materialsStores, setMaterialsStores] = useState((initialItem?.materialsStores ?? []).join(", "));
  const [clientVisibleComment, setClientVisibleComment] = useState(initialItem?.clientVisibleComment ?? "");
  const [masterComment, setMasterComment] = useState(initialItem?.masterComment ?? "");
  const [projectNotes, setProjectNotes] = useState(initialItem?.projectNotes ?? "");
  const [beforePhotos, setBeforePhotos] = useState<ProjectPhoto[]>(
    initialItem?.beforePhotos ?? (initialItem?.beforePhotoUrls ?? []).map((url, index) => ({
      id: `before-url-${index}`,
      url,
      kind: "before" as const,
      uploadedAt: initialItem?.createdAt,
    })),
  );
  const [progressPhotos, setProgressPhotos] = useState<ProjectPhoto[]>(
    initialItem?.progressPhotos ?? (initialItem?.progressPhotoUrls ?? []).map((url, index) => ({
      id: `progress-url-${index}`,
      url,
      kind: "progress" as const,
      uploadedAt: initialItem?.createdAt,
    })),
  );
  const [afterPhotos, setAfterPhotos] = useState<ProjectPhoto[]>(
    initialItem?.afterPhotos ?? (initialItem?.afterPhotoUrls ?? []).map((url, index) => ({
      id: `after-url-${index}`,
      url,
      kind: "after" as const,
      uploadedAt: initialItem?.createdAt,
    })),
  );
  const [mainPhotoId, setMainPhotoId] = useState(initialItem?.mainPhoto?.id ?? "");
  const [documents, setDocuments] = useState<ProjectDocument[]>(initialItem?.documents ?? []);
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
  const projectPhotos = useMemo(
    () => [...beforePhotos, ...progressPhotos, ...afterPhotos],
    [afterPhotos, beforePhotos, progressPhotos],
  );
  const selectedMainPhoto = useMemo(
    () => projectPhotos.find((photo) => photo.id === mainPhotoId) ?? afterPhotos[0] ?? progressPhotos[0] ?? beforePhotos[0],
    [afterPhotos, beforePhotos, mainPhotoId, progressPhotos, projectPhotos],
  );

  function splitList(value: string) {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleProjectPhotos(kind: "before" | "progress" | "after", files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);
    if (!selectedFiles.length) return;

    const invalidFile = selectedFiles.find(
      (file) => file.size > maxProjectPhotoSize || !allowedProjectPhotoTypes.includes(file.type),
    );

    if (invalidFile) {
      setStatus({
        type: "error",
        message: "Фото має бути JPG, PNG або WEBP і до 5 МБ.",
      });
      return;
    }

    try {
      const uploadedPhotos = await Promise.all(
        selectedFiles.map(async (file) => ({
          id: crypto.randomUUID(),
          url: await readFileAsDataUrl(file),
          fileName: file.name,
          fileType: file.type,
          size: file.size,
          kind,
          uploadedAt: new Date().toISOString(),
        })),
      );

      const update = (current: ProjectPhoto[]) => [...current, ...uploadedPhotos];
      if (kind === "before") setBeforePhotos(update);
      if (kind === "progress") setProgressPhotos(update);
      if (kind === "after") setAfterPhotos(update);
      setStatus({ type: "idle", message: "" });
    } catch {
      setStatus({ type: "error", message: "Не вдалося прочитати фото проєкту." });
    }
  }

  function removeProjectPhoto(id: string) {
    setBeforePhotos((current) => current.filter((photo) => photo.id !== id));
    setProgressPhotos((current) => current.filter((photo) => photo.id !== id));
    setAfterPhotos((current) => current.filter((photo) => photo.id !== id));
    if (mainPhotoId === id) setMainPhotoId("");
  }

  async function attachDocumentFile(documentId: string, file: File | undefined, sourceType: "file" | "image") {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !allowedDocumentTypes.includes(file.type)) {
      setStatus({ type: "error", message: "Документ має бути PDF або зображенням до 5 МБ." });
      return;
    }

    try {
      const fileUrl = await readFileAsDataUrl(file);
      setDocuments((current) =>
        current.map((item) =>
          item.id === documentId
            ? {
                ...item,
                sourceType,
                fileUrl,
                externalUrl: "",
                fileName: file.name,
                fileType: file.type === "application/pdf" ? "pdf" : "image",
                uploadedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
    } catch {
      setStatus({ type: "error", message: "Не вдалося прочитати документ." });
    }
  }

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
      workCategory,
      district,
      publicLocation,
      privateAddress,
      showExactAddress,
      startedAt,
      completedAt,
      durationDays: durationDays ? Number(durationDays) : undefined,
      materialsStores: splitList(materialsStores),
      beforePhotos,
      progressPhotos,
      afterPhotos,
      mainPhoto: selectedMainPhoto ? { ...selectedMainPhoto, kind: "main" } : undefined,
      clientVisibleComment,
      masterComment,
      projectNotes,
      documents,
      projectStatus: "completed",
      photoUrl: selectedMainPhoto?.url || photoUrl,
      photoUrls: projectPhotos.length ? projectPhotos.map((photo) => photo.url) : photoUrls,
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
        photoUrl: selectedMainPhoto?.url || photoUrl,
        photoUrls: projectPhotos.length ? projectPhotos.map((photo) => photo.url) : photoUrls.length ? photoUrls : result.item.photoUrl ? [result.item.photoUrl] : [],
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
          <label>
            Тип будівельних робіт
            <select
              value={workCategory}
              onChange={(event) => setWorkCategory(event.target.value)}
            >
              {portfolioWorkCategories
                .filter((category) => category !== "Усі роботи")
                .map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Район
            <input
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              placeholder="Наприклад, Печерський район"
            />
          </label>
          <label>
            Публічна локація
            <input
              value={publicLocation}
              onChange={(event) => setPublicLocation(event.target.value)}
              placeholder="Київ, центр або ЖК без точної адреси"
            />
          </label>
          <label>
            Приватна адреса
            <input
              value={privateAddress}
              onChange={(event) => setPrivateAddress(event.target.value)}
              placeholder="Точна адреса тільки для майстра"
            />
          </label>
          <label className="portfolio-checkbox-field">
            <input
              type="checkbox"
              checked={showExactAddress}
              onChange={(event) => setShowExactAddress(event.target.checked)}
            />
            Показувати точну адресу публічно
          </label>
          <label>
            Дата початку
            <input
              type="date"
              value={startedAt}
              onChange={(event) => setStartedAt(event.target.value)}
            />
          </label>
          <label>
            Дата завершення
            <input
              type="date"
              value={completedAt}
              onChange={(event) => setCompletedAt(event.target.value)}
            />
          </label>
          <label>
            Тривалість, днів
            <input
              type="number"
              min="1"
              step="1"
              value={durationDays}
              onChange={(event) => setDurationDays(event.target.value)}
              placeholder="Наприклад, 5"
            />
          </label>
          <label className="field-wide">
            Магазини та матеріали
            <input
              value={materialsStores}
              onChange={(event) => setMaterialsStores(event.target.value)}
              placeholder="Епіцентр, Нова Лінія, Rozetka"
            />
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
          <label className="field-wide">
            Публічний коментар майстра
            <textarea
              rows={4}
              value={clientVisibleComment}
              onChange={(event) => setClientVisibleComment(event.target.value)}
              placeholder="Коротко поясніть, що було складним, які матеріали використали або що клієнту важливо знати про цей об'єкт."
            />
          </label>
          <label className="field-wide">
            Внутрішній коментар майстра
            <textarea
              rows={3}
              value={masterComment}
              onChange={(event) => setMasterComment(event.target.value)}
              placeholder="Що важливо памʼятати майстру: складності, домовленості, зміни ціни або строків."
            />
          </label>
          <label className="field-wide">
            Внутрішні нотатки по проєкту
            <textarea
              rows={3}
              value={projectNotes}
              onChange={(event) => setProjectNotes(event.target.value)}
              placeholder="Приватні нотатки для кабінету. У публічному профілі не показуються."
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
        <div className="portfolio-project-photos">
          {[
            { kind: "before" as const, title: "Фото “До”", photos: beforePhotos },
            { kind: "progress" as const, title: "Фото “В процесі”", photos: progressPhotos },
            { kind: "after" as const, title: "Фото “Після”", photos: afterPhotos },
          ].map(({ kind, title, photos }) => (
            <section key={kind}>
              <div>
                <strong>{title}</strong>
                <label>
                  <ImagePlus size={17} />
                  Завантажити фото
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={(event) => {
                      void handleProjectPhotos(kind, event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
              {photos.length ? (
                <div className="portfolio-photo-preview-grid">
                  {photos.map((photo) => (
                    <figure key={photo.id} className={selectedMainPhoto?.id === photo.id ? "main" : ""}>
                      <img src={photo.url} alt={photo.fileName || title} />
                      <figcaption>
                        <span>{photo.fileName || "Фото"}</span>
                        <button type="button" onClick={() => setMainPhotoId(photo.id)}>Основне</button>
                        <button type="button" onClick={() => removeProjectPhoto(photo.id)}>Видалити</button>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p>Фото ще не додані.</p>
              )}
            </section>
          ))}
        </div>
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
                  {portfolioUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
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

      <section className="portfolio-editor-card">
        <div className="portfolio-section-heading">
          <div>
            <p className="portfolio-eyebrow">Документи</p>
            <h2>Документи по обʼєкту</h2>
          </div>
          <span>Крок 3</span>
        </div>
        <div className="portfolio-documents-editor">
          {documents.map((document) => (
            <article key={document.id}>
              <div>
                <strong>{document.title}</strong>
                <span>{documentTypes.find((type) => type.value === document.type)?.label || "Документ"}</span>
                <small>{document.isPublic ? "Публічний" : "Приватний"}{document.visibleAfterCompletion ? " · після завершення" : ""}</small>
              </div>
              <button
                type="button"
                onClick={() => setDocuments((current) => current.filter((item) => item.id !== document.id))}
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))}
          <button
            className="add-work-line"
            type="button"
            onClick={() =>
              setDocuments((current) => [
                ...current,
                {
                  id: crypto.randomUUID(),
                  title: "Новий документ",
                  type: "estimate",
                  description: "",
                  sourceType: "file",
                  fileUrl: "",
                  externalUrl: "",
                  fileType: "pdf",
                  uploadedAt: new Date().toISOString(),
                  isPublic: false,
                  visibleAfterCompletion: false,
                },
              ])
            }
          >
            <Plus size={18} /> Додати документ
          </button>
          {documents.map((document) => (
            <div className="portfolio-fields-grid" key={`${document.id}-edit`}>
              <label>
                Назва документа
                <input
                  value={document.title}
                  onChange={(event) =>
                    setDocuments((current) =>
                      current.map((item) => item.id === document.id ? { ...item, title: event.target.value } : item),
                    )
                  }
                />
              </label>
              <label>
                Тип документа
                <select
                  value={document.type}
                  onChange={(event) =>
                    setDocuments((current) =>
                      current.map((item) => item.id === document.id ? { ...item, type: event.target.value as ProjectDocument["type"] } : item),
                    )
                  }
                >
                  {documentTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </label>
              <label className="field-wide">
                Спосіб додавання
                <select
                  value={document.sourceType ?? "file"}
                  onChange={(event) =>
                    setDocuments((current) =>
                      current.map((item) =>
                        item.id === document.id
                          ? { ...item, sourceType: event.target.value as ProjectDocument["sourceType"] }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="file">Завантажити файл PDF</option>
                  <option value="image">Завантажити фото документа</option>
                  <option value="link">Вставити посилання</option>
                </select>
              </label>
              {document.sourceType === "link" ? (
                <label className="field-wide">
                  URL документа
                  <input
                    value={document.externalUrl ?? ""}
                    onChange={(event) =>
                      setDocuments((current) =>
                        current.map((item) => item.id === document.id ? { ...item, externalUrl: event.target.value, fileType: "link" } : item),
                      )
                    }
                    placeholder="https://..."
                  />
                </label>
              ) : (
                <label className="field-wide portfolio-file-field">
                  {document.sourceType === "image" ? "Фото документа" : "Файл PDF / фото"}
                  <input
                    type="file"
                    accept={document.sourceType === "image" ? "image/jpeg,image/jpg,image/png,image/webp" : "application/pdf,image/jpeg,image/jpg,image/png,image/webp"}
                    onChange={(event) => {
                      void attachDocumentFile(document.id, event.target.files?.[0], document.sourceType === "image" ? "image" : "file");
                      event.target.value = "";
                    }}
                  />
                  <small>{document.fileName || "Файл ще не вибрано"}</small>
                </label>
              )}
              <label className="field-wide">
                URL документа
                <input
                  value={document.sourceType === "link" ? document.externalUrl ?? "" : document.fileName ?? ""}
                  readOnly
                  placeholder={document.sourceType === "link" ? "Посилання буде тут" : "Назва завантаженого файлу"}
                />
              </label>
              <label className="field-wide">
                Опис
                <textarea
                  rows={2}
                  value={document.description ?? ""}
                  onChange={(event) =>
                    setDocuments((current) =>
                      current.map((item) => item.id === document.id ? { ...item, description: event.target.value } : item),
                    )
                  }
                />
              </label>
              <label className="portfolio-checkbox-field">
                <input
                  type="checkbox"
                  checked={document.isPublic === true}
                  onChange={(event) =>
                    setDocuments((current) =>
                      current.map((item) => item.id === document.id ? { ...item, isPublic: event.target.checked } : item),
                    )
                  }
                />
                Публічно показувати клієнтам
              </label>
              <label className="portfolio-checkbox-field">
                <input
                  type="checkbox"
                  checked={document.visibleAfterCompletion === true}
                  onChange={(event) =>
                    setDocuments((current) =>
                      current.map((item) => item.id === document.id ? { ...item, visibleAfterCompletion: event.target.checked } : item),
                    )
                  }
                />
                Показувати тільки після завершення
              </label>
            </div>
          ))}
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
