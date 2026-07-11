import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  createLocalId,
  emptyHeightWork,
  mockRequests,
  requestStatusOptions,
  type MasterRequest,
  type RequestHeightWork,
  type RequestAdditionalWork,
  type RequestFile,
  type RequestPeriod,
  type RequestStatus,
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

  return {
    id: optionalText(row.id) || createLocalId("request"),
    masterId: text(row.masterId, "майстер"),
    masterName: text(row.masterName, "імʼя майстра"),
    selectedServiceId: text(row.selectedServiceId, "послуга"),
    selectedServiceTitle: text(row.selectedServiceTitle, "назва послуги"),
    selectedServiceType: text(row.selectedServiceType, "тип послуги"),
    isTurnkey: Boolean(row.isTurnkey),
    clientName: text(row.clientName, "імʼя клієнта"),
    clientPhone: text(row.clientPhone, "телефон"),
    workType: text(row.workType, "тип роботи"),
    workSubtype: optionalText(row.workSubtype),
    description: text(row.description, "опис задачі"),
    desiredDate,
    cityArea: text(row.cityArea, "місто або район"),
    budget: optionalText(row.budget),
    mainVolume: optionalText(row.mainVolume),
    additionalInfo: optionalText(row.additionalInfo),
    message: text(row.message, "повідомлення майстру"),
    periods,
    serviceDetails: parseRecord(row.serviceDetails),
    additionalWorks: parseAdditionalWorks(row.additionalWorks),
    files: parseFiles(row.files),
    heightWork: parseHeightWork(row.heightWork),
    status: "new",
    isRead: false,
    createdAt: optionalText(row.createdAt) || new Date().toISOString(),
  };
}

function fromSupabase(row: Record<string, unknown>): MasterRequest {
  return {
    id: String(row.id),
    masterId: String(row.master_id),
    masterName: String(row.master_name ?? ""),
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

export async function GET(request: Request) {
  const masterId = new URL(request.url).searchParams.get("masterId") ?? "";
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return NextResponse.json({
      requests: mockRequests.filter((item) => !masterId || item.masterId === masterId),
      persistence: "browser",
    });
  }

  let query = supabase.from("requests").select("*").order("created_at", { ascending: false });
  if (masterId) query = query.eq("master_id", masterId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({
      requests: mockRequests.filter((item) => !masterId || item.masterId === masterId),
      persistence: "browser",
      warning: error.message,
    });
  }

  return NextResponse.json({ requests: (data ?? []).map(fromSupabase), persistence: "supabase" });
}

export async function POST(request: Request) {
  try {
    const normalized = normalizeRequest(await request.json());
    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json({ request: normalized, persistence: "browser" });
    }

    const { data, error } = await supabase
      .from("requests")
      .insert({
        master_id: normalized.masterId,
        master_name: normalized.masterName,
        selected_service_id: normalized.selectedServiceId,
        selected_service_title: normalized.selectedServiceTitle,
        selected_service_type: normalized.selectedServiceType,
        is_turnkey: normalized.isTurnkey,
        client_name: normalized.clientName,
        client_phone: normalized.clientPhone,
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
        created_at: normalized.createdAt,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({
        request: normalized,
        persistence: "browser",
        warning: error.message,
      });
    }

    return NextResponse.json({ request: fromSupabase(data), persistence: "supabase" });
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
      return NextResponse.json({ id, status, persistence: "browser" });
    }

    const { error } = await supabase.from("requests").update({ status, is_read: true }).eq("id", id);
    if (error) {
      return NextResponse.json({ id, status, persistence: "browser", warning: error.message });
    }

    return NextResponse.json({ id, status, persistence: "supabase" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не вдалося оновити заявку." },
      { status: 400 },
    );
  }
}
