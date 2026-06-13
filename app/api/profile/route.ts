import { NextResponse } from "next/server";
import type { EditableMasterProfile } from "@/lib/master-profile-edit";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function requiredText(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Заповніть поле «${field}».`);
  }

  return value.trim();
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
    priceFrom,
    experience: requiredText(profile.experience, "Досвід"),
    services,
  };
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

  const { data, error } = await supabase
    .from("master_profile_edits")
    .select(
      "master_id, name, profession, city, description, full_description, price_from, experience, services",
    )
    .eq("master_id", masterId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    profile: data
      ? {
          id: data.master_id,
          name: data.name,
          profession: data.profession,
          city: data.city,
          description: data.description,
          fullDescription: data.full_description,
          priceFrom: Number(data.price_from),
          experience: data.experience,
          services: data.services,
        }
      : null,
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

    const { error } = await supabase.from("master_profile_edits").upsert(
      {
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
      },
      { onConflict: "master_id" },
    );

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
