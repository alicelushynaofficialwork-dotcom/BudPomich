import { NextResponse } from "next/server";
import { calculateLineTotal, calculatePortfolioTotal } from "@/lib/portfolio";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const masterId = new URL(request.url).searchParams.get("masterId");

  if (!masterId) {
    return NextResponse.json({ error: "Не вказано майстра." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ items: [], persistence: "browser" });
  }

  const { data: items, error: itemsError } = await supabase
    .from("portfolio_items")
    .select(
      "id, master_id, title, description, city, object_type, photo_url, total_amount, created_at",
    )
    .eq("master_id", masterId)
    .order("created_at", { ascending: false });

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 400 });
  }

  const itemIds = (items ?? []).map((item) => item.id);
  const { data: lines, error: linesError } = itemIds.length
    ? await supabase
        .from("portfolio_work_lines")
        .select(
          "id, portfolio_item_id, work_type, unit, unit_price, volume, total, position",
        )
        .in("portfolio_item_id", itemIds)
        .order("position", { ascending: true })
    : { data: [], error: null };

  if (linesError) {
    return NextResponse.json({ error: linesError.message }, { status: 400 });
  }

  return NextResponse.json({
    items: (items ?? []).map((item) => ({
      id: item.id,
      masterId: item.master_id,
      title: item.title,
      description: item.description,
      city: item.city,
      objectType: item.object_type,
      photoUrl: item.photo_url,
      totalAmount: Number(item.total_amount),
      createdAt: item.created_at,
      workLines: (lines ?? [])
        .filter((line) => line.portfolio_item_id === item.id)
        .map((line) => ({
          id: line.id,
          workType: line.work_type,
          unit: line.unit,
          unitPrice: Number(line.unit_price),
          volume: Number(line.volume),
          total: Number(line.total),
        })),
    })),
    persistence: "supabase",
  });
}

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
  workLines?: unknown;
};

type ValidatedLine = {
  workType: string;
  unit: string;
  unitPrice: number;
  volume: number;
  total: number;
};

function requiredText(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Заповніть поле «${field}».`);
  }

  return value.trim();
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

  return {
    id: typeof payload.id === "string" ? payload.id : undefined,
    createdAt:
      typeof payload.createdAt === "string" ? payload.createdAt : undefined,
    masterId: requiredText(payload.masterId, "Майстер"),
    title: requiredText(payload.title, "Назва"),
    description:
      typeof payload.description === "string" ? payload.description.trim() : "",
    city: requiredText(payload.city, "Місто"),
    objectType: requiredText(payload.objectType, "Тип об'єкта"),
    photoUrl: typeof payload.photoUrl === "string" ? payload.photoUrl : "",
    photoUrls: Array.isArray(payload.photoUrls)
      ? payload.photoUrls.filter((url): url is string => typeof url === "string" && Boolean(url))
      : [],
    workLines,
    totalAmount: calculatePortfolioTotal(
      workLines.map((line, index) => ({ ...line, id: String(index) })),
    ),
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function POST(request: Request) {
  try {
    const payload = validatePayload((await request.json()) as PortfolioPayload);
    const supabase = createServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json({
        item: {
          ...payload,
          id: crypto.randomUUID(),
          photoUrls: payload.photoUrls,
          workLines: payload.workLines.map((line) => ({
            id: crypto.randomUUID(),
            ...line,
          })),
          createdAt: new Date().toISOString(),
        },
        persistence: "browser",
      });
    }

    const { data: item, error: itemError } = await supabase
      .from("portfolio_items")
      .insert({
        master_id: payload.masterId,
        title: payload.title,
        description: payload.description,
        city: payload.city,
        object_type: payload.objectType,
        photo_url: payload.photoUrl,
        total_amount: payload.totalAmount,
      })
      .select("id, master_id, title, description, city, object_type, photo_url, total_amount, created_at")
      .single();

    if (itemError) {
      throw new Error(itemError.message);
    }

    const { data: lines, error: linesError } = await supabase
      .from("portfolio_work_lines")
      .insert(
        payload.workLines.map((line, index) => ({
          portfolio_item_id: item.id,
          work_type: line.workType,
          unit: line.unit,
          unit_price: line.unitPrice,
          volume: line.volume,
          position: index,
        })),
      )
      .select("id, work_type, unit, unit_price, volume, total");

    if (linesError) {
      await supabase.from("portfolio_items").delete().eq("id", item.id);
      throw new Error(linesError.message);
    }

    return NextResponse.json({
      item: {
        id: item.id,
        masterId: item.master_id,
        title: item.title,
        description: item.description,
        city: item.city,
        objectType: item.object_type,
        photoUrl: item.photo_url,
        photoUrls: payload.photoUrls,
        totalAmount: Number(item.total_amount),
        createdAt: item.created_at,
        workLines: (lines ?? []).map((line) => ({
          id: line.id,
          workType: line.work_type,
          unit: line.unit,
          unitPrice: Number(line.unit_price),
          volume: Number(line.volume),
          total: Number(line.total),
        })),
      },
      persistence: "supabase",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не вдалося зберегти роботу.";

    return NextResponse.json({ error: message }, { status: 400 });
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

    const { data: item, error: itemError } = await supabase
      .from("portfolio_items")
      .update({
        title: payload.title,
        description: payload.description,
        city: payload.city,
        object_type: payload.objectType,
        photo_url: payload.photoUrl,
        total_amount: payload.totalAmount,
      })
      .eq("id", payload.id)
      .eq("master_id", payload.masterId)
      .select(
        "id, master_id, title, description, city, object_type, photo_url, total_amount, created_at",
      )
      .single();

    if (itemError) throw new Error(itemError.message);

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
      .select("id, work_type, unit, unit_price, volume, total");

    if (linesError) throw new Error(linesError.message);

    return NextResponse.json({
      item: {
        id: item.id,
        masterId: item.master_id,
        title: item.title,
        description: item.description,
        city: item.city,
        objectType: item.object_type,
        photoUrl: item.photo_url,
        photoUrls: payload.photoUrls,
        totalAmount: Number(item.total_amount),
        createdAt: item.created_at,
        workLines: (lines ?? []).map((line) => ({
          id: line.id,
          workType: line.work_type,
          unit: line.unit,
          unitPrice: Number(line.unit_price),
          volume: Number(line.volume),
          total: Number(line.total),
        })),
      },
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
