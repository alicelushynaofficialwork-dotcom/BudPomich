import { NextResponse } from "next/server";
import type { EditableMasterProfile } from "@/lib/master-profile-edit";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function requiredText(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Заповніть поле «${field}».`);
  }

  return value.trim();
}

function optionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function validateProfile(value: unknown): EditableMasterProfile {
  if (!value || typeof value !== "object") {
    throw new Error("Некоректні дані профілю.");
  }

  const profile = value as Record<string, unknown>;
  const priceFrom = Number(profile.priceFrom);

  if (!Number.isFinite(priceFrom) || priceFrom < 0) {
    throw new Error("Вкажіть коректну стартову ціну.");
  }

  if (!Array.isArray(profile.services) || profile.services.length === 0) {
    throw new Error("Додайте щонайменше одну послугу.");
  }

  const services = profile.services.map((service, index) => {
    if (!service || typeof service !== "object") {
      throw new Error(`Некоректна послуга №${index + 1}.`);
    }

    const row = service as Record<string, unknown>;
    return {
      name: requiredText(row.name, `Назва послуги №${index + 1}`),
      price: requiredText(row.price, `Ціна послуги №${index + 1}`),
    };
  });

  return {
    id: requiredText(profile.id, "ID майстра"),
    name: requiredText(profile.name, "Ім'я"),
    profession: requiredText(profile.profession, "Професія"),
    city: requiredText(profile.city, "Місто"),
    description: requiredText(profile.description, "Короткий опис"),
    fullDescription: requiredText(profile.fullDescription, "Про майстра"),
    avatarUrl: optionalText(profile.avatarUrl),
    coverImageUrl: optionalText(profile.coverImageUrl),
    avatarZoom: optionalNumber(profile.avatarZoom, 1),
    avatarPositionX: optionalNumber(profile.avatarPositionX, 50),
    avatarPositionY: optionalNumber(profile.avatarPositionY, 35),
    coverZoom: optionalNumber(profile.coverZoom, 1),
    coverPositionX: optionalNumber(profile.coverPositionX, 50),
    coverPositionY: optionalNumber(profile.coverPositionY, 50),
    priceFrom,
    experience: requiredText(profile.experience, "Досвід"),
    services,
  };
}

function mapProfileRow(data: Record<string, any>): EditableMasterProfile {
  return {
    id: data.master_id,
    name: data.name,
    profession: data.profession,
    city: data.city,
    description: data.description,
    fullDescription: data.full_description,
    avatarUrl: data.avatar_url ?? "",
    coverImageUrl: data.cover_image_url ?? "",
    avatarZoom: Number(data.avatar_zoom ?? 1),
    avatarPositionX: Number(data.avatar_position_x ?? 50),
    avatarPositionY: Number(data.avatar_position_y ?? 35),
    coverZoom: Number(data.cover_zoom ?? 1),
    coverPositionX: Number(data.cover_position_x ?? 50),
    coverPositionY: Number(data.cover_position_y ?? 50),
    priceFrom: Number(data.price_from),
    experience: data.experience,
    services: data.services,
  };
}

function isMissingProfileStorage(errorMessage: string) {
  return /master_profile_edits|schema cache|could not find|relation .* does not exist/i.test(errorMessage);
}

export async function GET(request: Request) {
  const masterId = new URL(request.url).searchParams.get("masterId");

  if (!masterId) {
    return NextResponse.json({ error: "Не вказано майстра." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ profile: null, persistence: "browser" });
  }

  const extendedSelect =
    "master_id, name, profession, city, description, full_description, avatar_url, cover_image_url, avatar_zoom, avatar_position_x, avatar_position_y, cover_zoom, cover_position_x, cover_position_y, price_from, experience, services";
  const baseSelect =
    "master_id, name, profession, city, description, full_description, price_from, experience, services";

  let result = await supabase
    .from("master_profile_edits")
    .select(extendedSelect)
    .eq("master_id", masterId)
    .maybeSingle();

  if (result.error && /avatar_url|cover_image_url|avatar_zoom|avatar_position|cover_zoom|cover_position|column/i.test(result.error.message)) {
    result = await supabase
      .from("master_profile_edits")
      .select(baseSelect)
      .eq("master_id", masterId)
      .maybeSingle();
  }

  if (result.error && isMissingProfileStorage(result.error.message)) {
    return NextResponse.json({ profile: null, persistence: "browser" });
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  return NextResponse.json({
    profile: result.data ? mapProfileRow(result.data as Record<string, any>) : null,
    persistence: "supabase",
  });
}

export async function POST(request: Request) {
  try {
    const profile = validateProfile(await request.json());
    const supabase = createServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json({ profile, persistence: "browser" });
    }

    const extendedPayload = {
        master_id: profile.id,
        name: profile.name,
        profession: profile.profession,
        city: profile.city,
        description: profile.description,
        full_description: profile.fullDescription,
        avatar_url: profile.avatarUrl,
        cover_image_url: profile.coverImageUrl,
        avatar_zoom: profile.avatarZoom,
        avatar_position_x: profile.avatarPositionX,
        avatar_position_y: profile.avatarPositionY,
        cover_zoom: profile.coverZoom,
        cover_position_x: profile.coverPositionX,
        cover_position_y: profile.coverPositionY,
        price_from: profile.priceFrom,
        experience: profile.experience,
        services: profile.services,
        updated_at: new Date().toISOString(),
      };
    const basePayload = {
        master_id: profile.id,
        name: profile.name,
        profession: profile.profession,
        city: profile.city,
        description: profile.description,
        full_description: profile.fullDescription,
        price_from: profile.priceFrom,
        experience: profile.experience,
        services: profile.services,
        updated_at: new Date().toISOString(),
      };

    let { error } = await supabase.from("master_profile_edits").upsert(
      extendedPayload,
      { onConflict: "master_id" },
    );

    if (error && /avatar_url|cover_image_url|avatar_zoom|avatar_position|cover_zoom|cover_position|column/i.test(error.message)) {
      const fallback = await supabase.from("master_profile_edits").upsert(
        basePayload,
        { onConflict: "master_id" },
      );
      error = fallback.error;
    }

    if (error && isMissingProfileStorage(error.message)) {
      return NextResponse.json({ profile, persistence: "browser" });
    }

    if (error) throw new Error(error.message);

    return NextResponse.json({ profile, persistence: "supabase" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не вдалося зберегти профіль.",
      },
      { status: 400 },
    );
  }
}
