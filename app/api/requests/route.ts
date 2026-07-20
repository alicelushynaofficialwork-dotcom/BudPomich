import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  createLocalId,
  emptyHeightWork,
  requestStatusOptions,
  type MasterRequest,
  type RequestHeightWork,
  type RequestAdditionalWork,
  type RequestFile,
  type RequestPeriod,
  type RequestStatus,
  type BookingAttachment,
} from "@/lib/requests";

function text(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Заповніть поле "${field}".`);
  }

  return value.trim();
}

function optionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePeriods(value: unknown): RequestPeriod[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const dateFrom = optionalText(row.dateFrom);
      const dateTo = optionalText(row.dateTo);
      const period = optionalText(row.period) || (dateFrom && dateTo ? `${dateFrom} — ${dateTo}` : "");
      return dateFrom && dateTo && period ? { dateFrom, dateTo, period } : null;
    })
    .filter(Boolean) as RequestPeriod[];
}

function parseRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => typeof item === "string")
      .map(([key, item]) => [key, String(item).trim()]),
  );
}

function parseAdditionalWorks(value: unknown): RequestAdditionalWork[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        id: optionalText(row.id) || createLocalId("additional"),
        title: optionalText(row.title),
        volume: optionalText(row.volume),
        unit: optionalText(row.unit),
        pricePerUnit: optionalText(row.pricePerUnit),
        totalPrice: optionalText(row.totalPrice),
        comment: optionalText(row.comment),
      };
    })
    .filter((item): item is RequestAdditionalWork => Boolean(item?.title));
}

function parseFiles(value: unknown): RequestFile[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const fileName = optionalText(row.fileName);
      if (!fileName) return null;
      return {
        id: optionalText(row.id) || createLocalId("file"),
        fileName,
        fileType: optionalText(row.fileType) || "file",
        fileUrl: optionalText(row.fileUrl),
      };
    })
    .filter(Boolean) as RequestFile[];
}

function parseHeightWork(value: unknown): RequestHeightWork {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyHeightWork;
  }

  const row = value as Record<string, unknown>;
  const presence = optionalText(row.hasHeightWork);
  const coefficientType = optionalText(row.heightCoefficientType);

  return {
    hasHeightWork: presence === "yes" || presence === "unknown" ? presence : "no",
    heightValue: optionalText(row.heightValue),
    heightUnit: optionalText(row.heightUnit) || "м",
    heightWorkVolume: optionalText(row.heightWorkVolume),
    heightWorkVolumeUnit: optionalText(row.heightWorkVolumeUnit) || "м²",
    heightAccessType: optionalText(row.heightAccessType),
    heightWorkLocation: optionalText(row.heightWorkLocation),
    heightCoefficient: optionalText(row.heightCoefficient),
    heightCoefficientType:
      coefficientType === "selected" || coefficientType === "custom" ? coefficientType : "unknown",
    heightNormReference: optionalText(row.heightNormReference) || emptyHeightWork.heightNormReference,
    heightComment: optionalText(row.heightComment),
  };
}

function normalizeRequest(payload: unknown): MasterRequest {
  if (!payload || typeof payload !== "object") {
    throw new Error("Некоректні дані заявки.");
  }

  const row = payload as Record<string, unknown>;
  const periods = parsePeriods(row.periods);
  const desiredDate = optionalText(row.desiredDate) || periods.map((period) => period.period).join("; ");

  if (!desiredDate && !periods.length) {
    throw new Error("Оберіть бажану дату або період.");
  }

  const isCalendar = optionalText(row.source) === "profile_calendar";
  return {
    id: optionalText(row.id) || createLocalId("request"),
    masterId: text(row.masterId, "майстер"),
    masterName: optionalText(row.masterName),
    selectedServiceId: optionalText(row.selectedServiceId) || (isCalendar ? "profile-calendar" : text(row.selectedServiceId, "послуга")),
    selectedServiceTitle: optionalText(row.selectedServiceTitle) || text(row.workType, "тип роботи"),
    selectedServiceType: optionalText(row.selectedServiceType) || "custom",
    isTurnkey: Boolean(row.isTurnkey),
    clientName: optionalText(row.clientName),
    clientPhone: optionalText(row.clientPhone),
    workType: text(row.workType, "тип роботи"),
    workSubtype: optionalText(row.workSubtype),
    description: text(row.description, "опис задачі"),
    desiredDate,
    cityArea: optionalText(row.cityArea),
    budget: optionalText(row.budget),
    mainVolume: optionalText(row.mainVolume),
    additionalInfo: optionalText(row.additionalInfo),
    message: optionalText(row.message) || text(row.description, "опис задачі"),
    periods,
    serviceDetails: parseRecord(row.serviceDetails),
    additionalWorks: parseAdditionalWorks(row.additionalWorks),
    files: parseFiles(row.files),
    heightWork: parseHeightWork(row.heightWork),
    status: "new",
    isRead: false,
    createdAt: optionalText(row.createdAt) || new Date().toISOString(),
    source: optionalText(row.source) || "request_form",
  };
}

function fromSupabase(row: Record<string, unknown>): MasterRequest {
  return {
    id: String(row.id),
    masterId: String(row.master_id),
    masterName: String(row.master_name ?? ""),
    clientId: String(row.client_id ?? ""),
    selectedServiceId: String(row.selected_service_id ?? ""),
    selectedServiceTitle: String(row.selected_service_title ?? ""),
    selectedServiceType: String(row.selected_service_type ?? ""),
    isTurnkey: Boolean(row.is_turnkey),
    clientName: String(row.client_name ?? ""),
    clientPhone: String(row.client_phone ?? ""),
    workType: String(row.work_type ?? ""),
    workSubtype: String(row.work_subtype ?? ""),
    description: String(row.description ?? ""),
    desiredDate: String(row.desired_date ?? ""),
    cityArea: String(row.city_area ?? ""),
    budget: String(row.budget ?? ""),
    mainVolume: String(row.main_volume ?? ""),
    additionalInfo: String(row.additional_info ?? ""),
    message: String(row.message ?? ""),
    periods: Array.isArray(row.periods) ? (row.periods as RequestPeriod[]) : [],
    serviceDetails: parseRecord(row.service_details),
    additionalWorks: parseAdditionalWorks(row.additional_works),
    files: parseFiles(row.files),
    confirmedPeriod: row.confirmed_period && typeof row.confirmed_period === "object" ? parsePeriods([row.confirmed_period])[0] : undefined,
    source: String(row.source ?? "request_form"),
    heightWork: parseHeightWork({
      hasHeightWork:
        row.has_height_work === true
          ? "yes"
          : row.has_height_work === false
            ? "no"
            : String(row.has_height_work ?? "no"),
      heightValue: String(row.height_value ?? ""),
      heightUnit: String(row.height_unit ?? "м"),
      heightWorkVolume: String(row.height_work_volume ?? ""),
      heightWorkVolumeUnit: String(row.height_work_volume_unit ?? "м²"),
      heightAccessType: String(row.height_access_type ?? ""),
      heightWorkLocation: String(row.height_work_location ?? ""),
      heightCoefficient: String(row.height_coefficient ?? ""),
      heightCoefficientType: String(row.height_coefficient_type ?? "unknown"),
      heightNormReference: String(row.height_norm_reference ?? ""),
      heightComment: String(row.height_comment ?? ""),
    }),
    status: requestStatusOptions.includes(row.status as RequestStatus) ? (row.status as RequestStatus) : "new",
    isRead: Boolean(row.is_read),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

async function attachFiles(supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>, requests: MasterRequest[]) {
  if (!requests.length) return requests;
  const { data } = await supabase.from("booking_attachments").select("*").in("booking_id", requests.map((item) => item.id));
  const attachments = await Promise.all((data ?? []).map(async (row): Promise<BookingAttachment> => {
    const { data: signed } = await supabase.storage.from("booking-attachments").createSignedUrl(String(row.storage_path), 300);
    return { id: String(row.id), bookingId: String(row.booking_id), originalName: String(row.original_name), mimeType: String(row.mime_type), sizeBytes: Number(row.size_bytes), kind: row.kind === "image" ? "image" : "document", url: signed?.signedUrl };
  }));
  return requests.map((item) => ({ ...item, attachments: attachments.filter((file) => file.bookingId === item.id) }));
}

export async function GET(request: Request) {
  const masterId = new URL(request.url).searchParams.get("masterId") ?? "";
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ error: "Сервіс автентифікації недоступний." }, { status: 503 });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Увійдіть у систему." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  let query = supabase.from("requests").select("*").order("created_at", { ascending: false });
  if (profile?.role === "client") {
    query = query.eq("client_id", authData.user.id);
    if (masterId) query = query.eq("master_id", masterId);
  } else if (profile?.role === "master") {
    const { data: owned } = await supabase.from("master_profile_edits").select("master_id").eq("owner_id", authData.user.id);
    const ids = (owned ?? []).map((item) => String(item.master_id));
    if (!ids.length || (masterId && !ids.includes(masterId))) return NextResponse.json({ requests: [] });
    query = masterId ? query.eq("master_id", masterId) : query.in("master_id", ids);
  } else {
    return NextResponse.json({ error: "Недостатньо прав." }, { status: 403 });
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ requests: await attachFiles(supabase, (data ?? []).map(fromSupabase)) });
}

export async function POST(request: Request) {
  try {
    const normalized = normalizeRequest(await request.json());
    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json({ error: "Сервіс автентифікації недоступний." }, { status: 503 });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Увійдіть у систему." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, phone, role")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile || profile.role !== "client") {
      return NextResponse.json({ error: "Тільки клієнти можуть створювати заявки." }, { status: 403 });
    }

    const { data: masterProfile } = await supabase.from("master_profile_edits").select("master_id, name").eq("master_id", normalized.masterId).maybeSingle();
    if (!masterProfile) return NextResponse.json({ error: "Профіль майстра не знайдено." }, { status: 404 });

    const { data, error } = await supabase
      .from("requests")
      .insert({
        client_id: authData.user.id,
        master_id: normalized.masterId,
        master_name: normalized.masterName || masterProfile.name,
        selected_service_id: normalized.selectedServiceId,
        selected_service_title: normalized.selectedServiceTitle,
        selected_service_type: normalized.selectedServiceType,
        is_turnkey: normalized.isTurnkey,
        client_name: profile.full_name ?? "",
        client_phone: profile.phone ?? "",
        work_type: normalized.workType,
        work_subtype: normalized.workSubtype,
        description: normalized.description,
        desired_date: normalized.desiredDate,
        city_area: normalized.cityArea,
        budget: normalized.budget,
        main_volume: normalized.mainVolume,
        additional_info: normalized.additionalInfo,
        message: normalized.message,
        periods: normalized.periods,
        service_details: normalized.serviceDetails,
        additional_works: normalized.additionalWorks,
        files: normalized.files,
        has_height_work: normalized.heightWork.hasHeightWork,
        height_value: normalized.heightWork.heightValue,
        height_unit: normalized.heightWork.heightUnit,
        height_work_volume: normalized.heightWork.heightWorkVolume,
        height_work_volume_unit: normalized.heightWork.heightWorkVolumeUnit,
        height_access_type: normalized.heightWork.heightAccessType,
        height_work_location: normalized.heightWork.heightWorkLocation,
        height_coefficient: normalized.heightWork.heightCoefficient,
        height_coefficient_type: normalized.heightWork.heightCoefficientType,
        height_norm_reference: normalized.heightWork.heightNormReference,
        height_comment: normalized.heightWork.heightComment,
        status: normalized.status,
        is_read: normalized.isRead,
        source: normalized.source,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ request: fromSupabase(data) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не вдалося створити заявку." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const id = text(payload.id, "ID заявки");
    const status = payload.status as RequestStatus;

    if (!requestStatusOptions.includes(status)) {
      throw new Error("Некоректний статус заявки.");
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Сервіс автентифікації недоступний." }, { status: 503 });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Увійдіть у систему." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile || profile.role !== "master") return NextResponse.json({ error: "Статус заявки змінює відповідний майстер." }, { status: 403 });
    const confirmedPeriod = parsePeriods(payload.confirmedPeriod ? [payload.confirmedPeriod] : [])[0];
    const { data: owned } = await supabase.from("master_profile_edits").select("master_id").eq("owner_id", authData.user.id);
    const masterIds = (owned ?? []).map((item) => String(item.master_id));
    if (!masterIds.length) return NextResponse.json({ error: "Профіль майстра не прив’язаний до цього акаунта." }, { status: 403 });
    const updates: Record<string, unknown> = { status, is_read: true, updated_at: new Date().toISOString() };
    if (confirmedPeriod) updates.confirmed_period = confirmedPeriod;
    const { data, error } = await supabase.from("requests").update(updates).eq("id", id).in("master_id", masterIds).select("id").maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) return NextResponse.json({ error: "Заявку не знайдено або доступ заборонено." }, { status: 404 });
    return NextResponse.json({ id, status, confirmedPeriod });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не вдалося оновити заявку." },
      { status: 400 },
    );
  }
}
