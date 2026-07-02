import { NextResponse } from "next/server";
import {
  calculateLineTotal,
  calculatePortfolioTotal,
  slugifyPortfolioTitle,
} from "@/lib/portfolio";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type PortfolioPayload = {
  id?: unknown;
  createdAt?: unknown;
  masterId?: unknown;
  title?: unknown;
  description?: unknown;
  city?: unknown;
  objectType?: unknown;
  photoUrl?: unknown;
  photoUrls?: unknown;
  slug?: unknown;
  startedAt?: unknown;
  completedAt?: unknown;
  year?: unknown;
  month?: unknown;
  district?: unknown;
  publicLocation?: unknown;
  privateAddress?: unknown;
  showExactAddress?: unknown;
  workCategory?: unknown;
  objectArea?: unknown;
  durationDays?: unknown;
  materialsStores?: unknown;
  projectStatus?: unknown;
  beforePhotoUrls?: unknown;
  afterPhotoUrls?: unknown;
  progressPhotoUrls?: unknown;
  beforePhotos?: unknown;
  progressPhotos?: unknown;
  afterPhotos?: unknown;
  mainPhoto?: unknown;
  masterComment?: unknown;
  projectNotes?: unknown;
  clientVisibleComment?: unknown;
  documents?: unknown;
  workLines?: unknown;
};

type ValidatedLine = {
  workType: string;
  unit: string;
  unitPrice: number;
  volume: number;
  total: number;
};

const extendedSelect =
  "id, master_id, title, description, city, object_type, photo_url, total_amount, created_at, meta";
const baseSelect =
  "id, master_id, title, description, city, object_type, photo_url, total_amount, created_at";

function requiredText(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Заповніть поле «${field}».`);
  }

  return value.trim();
}

function optionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function optionalStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
}

function optionalDocuments(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const document = item as Record<string, unknown>;
      const title = optionalText(document.title);
      const sourceType = optionalText(document.sourceType);
      const fileUrl = optionalText(document.fileUrl);
      const externalUrl = optionalText(document.externalUrl);

      if (!title || (!fileUrl && !externalUrl)) return null;

      return {
        id: optionalText(document.id) || crypto.randomUUID(),
        title,
        type: optionalText(document.type) || "other",
        description: optionalText(document.description),
        sourceType: ["file", "image", "link"].includes(sourceType) ? sourceType : externalUrl ? "link" : "file",
        fileUrl,
        externalUrl,
        fileName: optionalText(document.fileName),
        fileType: optionalText(document.fileType) || "other",
        uploadedAt: optionalText(document.uploadedAt) || new Date().toISOString(),
        isPublic: document.isPublic === true,
        visibleAfterCompletion: document.visibleAfterCompletion === true,
      };
    })
    .filter(Boolean);
}

function optionalPhotos(value: unknown, kind: "before" | "progress" | "after" | "main") {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const photo = item as Record<string, unknown>;
      const url = optionalText(photo.url);
      if (!url) return null;

      return {
        id: optionalText(photo.id) || crypto.randomUUID(),
        url,
        fileName: optionalText(photo.fileName),
        fileType: optionalText(photo.fileType),
        size: optionalNumber(photo.size),
        kind,
        uploadedAt: optionalText(photo.uploadedAt) || new Date().toISOString(),
        caption: optionalText(photo.caption),
      };
    })
    .filter(Boolean);
}

function optionalMainPhoto(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  return optionalPhotos([value], "main")[0];
}

function buildMeta(payload: PortfolioPayload, title: string, createdAt?: string) {
  const completedAt = optionalText(payload.completedAt);
  const periodDate = new Date(completedAt || createdAt || Date.now());
  const projectStatus = optionalText(payload.projectStatus);

  return {
    slug: optionalText(payload.slug) || slugifyPortfolioTitle(title, crypto.randomUUID()),
    startedAt: optionalText(payload.startedAt),
    completedAt,
    year: optionalNumber(payload.year) ?? periodDate.getFullYear(),
    month: optionalNumber(payload.month) ?? periodDate.getMonth() + 1,
    district: optionalText(payload.district),
    publicLocation: optionalText(payload.publicLocation),
    privateAddress: optionalText(payload.privateAddress),
    showExactAddress: payload.showExactAddress === true,
    workCategory: optionalText(payload.workCategory) || "Гіпсокартон",
    objectArea: optionalNumber(payload.objectArea),
    durationDays: optionalNumber(payload.durationDays),
    materialsStores: optionalStringArray(payload.materialsStores),
    projectStatus: ["completed", "in_progress", "planned"].includes(projectStatus)
      ? projectStatus
      : "completed",
    beforePhotoUrls: optionalStringArray(payload.beforePhotoUrls),
    afterPhotoUrls: optionalStringArray(payload.afterPhotoUrls),
    progressPhotoUrls: optionalStringArray(payload.progressPhotoUrls),
    beforePhotos: optionalPhotos(payload.beforePhotos, "before"),
    progressPhotos: optionalPhotos(payload.progressPhotos, "progress"),
    afterPhotos: optionalPhotos(payload.afterPhotos, "after"),
    mainPhoto: optionalMainPhoto(payload.mainPhoto),
    masterComment: optionalText(payload.masterComment),
    projectNotes: optionalText(payload.projectNotes),
    clientVisibleComment: optionalText(payload.clientVisibleComment),
    documents: optionalDocuments(payload.documents),
  };
}

function validatePayload(payload: PortfolioPayload) {
  if (!Array.isArray(payload.workLines) || payload.workLines.length === 0) {
    throw new Error("Додайте щонайменше один рядок робіт.");
  }

  const workLines: ValidatedLine[] = payload.workLines.map((line, index) => {
    if (!line || typeof line !== "object") {
      throw new Error(`Некоректний рядок робіт №${index + 1}.`);
    }

    const record = line as Record<string, unknown>;
    const unitPrice = Number(record.unitPrice);
    const volume = Number(record.volume);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error(`Вкажіть коректну ціну у рядку №${index + 1}.`);
    }

    if (!Number.isFinite(volume) || volume <= 0) {
      throw new Error(`Вкажіть коректний обсяг у рядку №${index + 1}.`);
    }

    return {
      workType: requiredText(record.workType, `Тип роботи №${index + 1}`),
      unit: requiredText(record.unit, `Одиниця №${index + 1}`),
      unitPrice,
      volume,
      total: calculateLineTotal(unitPrice, volume),
    };
  });

  const title = requiredText(payload.title, "Назва");
  const createdAt = typeof payload.createdAt === "string" ? payload.createdAt : undefined;

  return {
    id: typeof payload.id === "string" ? payload.id : undefined,
    createdAt,
    masterId: requiredText(payload.masterId, "Майстер"),
    title,
    description: optionalText(payload.description),
    city: requiredText(payload.city, "Місто"),
    objectType: requiredText(payload.objectType, "Тип обʼєкта"),
    photoUrl: typeof payload.photoUrl === "string" ? payload.photoUrl : "",
    photoUrls: optionalStringArray(payload.photoUrls),
    workLines,
    totalAmount: calculatePortfolioTotal(
      workLines.map((line, index) => ({ ...line, id: String(index) })),
    ),
    meta: buildMeta(payload, title, createdAt),
  };
}

function mapItem(item: any, lines: any[] = [], metaFallback: Record<string, unknown> = {}) {
  return {
    id: item.id,
    masterId: item.master_id,
    title: item.title,
    description: item.description,
    city: item.city,
    objectType: item.object_type,
    photoUrl: item.photo_url,
    ...(item.meta ?? metaFallback),
    totalAmount: Number(item.total_amount),
    createdAt: item.created_at,
    workLines: lines
      .filter((line) => line.portfolio_item_id === item.id)
      .map((line) => ({
        id: line.id,
        workType: line.work_type,
        unit: line.unit,
        unitPrice: Number(line.unit_price),
        volume: Number(line.volume),
        total: Number(line.total),
      })),
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function GET(request: Request) {
  const masterId = new URL(request.url).searchParams.get("masterId");

  if (!masterId) {
    return NextResponse.json({ error: "Не вказано майстра." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ items: [], persistence: "browser" });
  }

  let result: any = await supabase
    .from("portfolio_items")
    .select(extendedSelect)
    .eq("master_id", masterId)
    .order("created_at", { ascending: false });

  if (result.error && /meta|column/i.test(result.error.message)) {
    result = await supabase
      .from("portfolio_items")
      .select(baseSelect)
      .eq("master_id", masterId)
      .order("created_at", { ascending: false });
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  const items: any[] = result.data ?? [];
  const itemIds = items.map((item: any) => item.id);
  const { data: lines, error: linesError } = itemIds.length
    ? await supabase
        .from("portfolio_work_lines")
        .select("id, portfolio_item_id, work_type, unit, unit_price, volume, total, position")
        .in("portfolio_item_id", itemIds)
        .order("position", { ascending: true })
    : { data: [], error: null };

  if (linesError) {
    return NextResponse.json({ error: linesError.message }, { status: 400 });
  }

  return NextResponse.json({
    items: items.map((item: any) => mapItem(item, lines ?? [])),
    persistence: "supabase",
  });
}

export async function POST(request: Request) {
  try {
    const payload = validatePayload((await request.json()) as PortfolioPayload);
    const supabase = createServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json({
        item: {
          ...payload,
          ...payload.meta,
          id: crypto.randomUUID(),
          workLines: payload.workLines.map((line) => ({
            id: crypto.randomUUID(),
            ...line,
          })),
          createdAt: new Date().toISOString(),
        },
        persistence: "browser",
      });
    }

    const basePayload = {
      master_id: payload.masterId,
      title: payload.title,
      description: payload.description,
      city: payload.city,
      object_type: payload.objectType,
      photo_url: payload.photoUrl,
      total_amount: payload.totalAmount,
    };

    let itemResult: any = await supabase
      .from("portfolio_items")
      .insert({ ...basePayload, meta: payload.meta })
      .select(extendedSelect)
      .single();

    if (itemResult.error && /meta|column/i.test(itemResult.error.message)) {
      itemResult = await supabase
        .from("portfolio_items")
        .insert(basePayload)
        .select(baseSelect)
        .single();
    }

    if (itemResult.error) throw new Error(itemResult.error.message);

    const { data: lines, error: linesError } = await supabase
      .from("portfolio_work_lines")
      .insert(
        payload.workLines.map((line, index) => ({
          portfolio_item_id: itemResult.data.id,
          work_type: line.workType,
          unit: line.unit,
          unit_price: line.unitPrice,
          volume: line.volume,
          position: index,
        })),
      )
      .select("id, portfolio_item_id, work_type, unit, unit_price, volume, total");

    if (linesError) {
      await supabase.from("portfolio_items").delete().eq("id", itemResult.data.id);
      throw new Error(linesError.message);
    }

    return NextResponse.json({
      item: mapItem(itemResult.data, lines ?? [], payload.meta),
      persistence: "supabase",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не вдалося зберегти роботу.",
      },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const payload = validatePayload((await request.json()) as PortfolioPayload);

    if (!payload.id) {
      throw new Error("Не вказано проєкт для редагування.");
    }

    const browserItem = {
      id: payload.id,
      masterId: payload.masterId,
      title: payload.title,
      description: payload.description,
      city: payload.city,
      objectType: payload.objectType,
      photoUrl: payload.photoUrl,
      photoUrls: payload.photoUrls,
      ...payload.meta,
      totalAmount: payload.totalAmount,
      createdAt: payload.createdAt ?? new Date().toISOString(),
      workLines: payload.workLines.map((line) => ({
        id: crypto.randomUUID(),
        ...line,
      })),
    };
    const supabase = createServerSupabaseClient();

    if (!supabase || !isUuid(payload.id)) {
      return NextResponse.json({
        item: browserItem,
        persistence: "browser",
      });
    }

    const basePayload = {
      title: payload.title,
      description: payload.description,
      city: payload.city,
      object_type: payload.objectType,
      photo_url: payload.photoUrl,
      total_amount: payload.totalAmount,
    };

    let itemResult: any = await supabase
      .from("portfolio_items")
      .update({ ...basePayload, meta: payload.meta })
      .eq("id", payload.id)
      .eq("master_id", payload.masterId)
      .select(extendedSelect)
      .single();

    if (itemResult.error && /meta|column/i.test(itemResult.error.message)) {
      itemResult = await supabase
        .from("portfolio_items")
        .update(basePayload)
        .eq("id", payload.id)
        .eq("master_id", payload.masterId)
        .select(baseSelect)
        .single();
    }

    if (itemResult.error) throw new Error(itemResult.error.message);

    const { error: deleteLinesError } = await supabase
      .from("portfolio_work_lines")
      .delete()
      .eq("portfolio_item_id", payload.id);

    if (deleteLinesError) throw new Error(deleteLinesError.message);

    const { data: lines, error: linesError } = await supabase
      .from("portfolio_work_lines")
      .insert(
        payload.workLines.map((line, index) => ({
          portfolio_item_id: payload.id,
          work_type: line.workType,
          unit: line.unit,
          unit_price: line.unitPrice,
          volume: line.volume,
          position: index,
        })),
      )
      .select("id, portfolio_item_id, work_type, unit, unit_price, volume, total");

    if (linesError) throw new Error(linesError.message);

    return NextResponse.json({
      item: mapItem(itemResult.data, lines ?? [], payload.meta),
      persistence: "supabase",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не вдалося оновити роботу.",
      },
      { status: 400 },
    );
  }
}
