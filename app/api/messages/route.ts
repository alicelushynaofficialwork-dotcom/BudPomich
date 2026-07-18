import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { type RequestMessage } from "@/lib/requests";

function text(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Заповніть поле "${field}".`);
  }

  return value.trim();
}

function fromSupabase(row: Record<string, unknown>): RequestMessage {
  return {
    id: String(row.id),
    requestId: String(row.request_id),
    senderRole: String(row.sender_role ?? "client") === "master" ? "master" : "client",
    body: String(row.body ?? ""),
    isRead: row.read_at != null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function GET(request: Request) {
  const requestId = new URL(request.url).searchParams.get("requestId") ?? "";
  if (!requestId) {
    return NextResponse.json({ error: "Не вказано ID заявки." }, { status: 400 });
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

  if (!profile || profile.role !== "client") {
    return NextResponse.json({ error: "Доступ дозволено тільки для клієнтів." }, { status: 403 });
  }

  const { data: requestRow, error: requestError } = await supabase
    .from("requests")
    .select("id")
    .eq("id", requestId)
    .eq("client_id", authData.user.id)
    .maybeSingle();

  if (requestError) {
    return NextResponse.json({ error: requestError.message }, { status: 500 });
  }

  if (!requestRow) {
    return NextResponse.json({ error: "Запит не знайдено або доступ заборонено." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("request_messages")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: (data ?? []).map(fromSupabase) });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const requestId = text(payload.requestId, "ID заявки");
    const body = text(payload.body, "повідомлення");

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

    if (!profile || profile.role !== "client") {
      return NextResponse.json({ error: "Тільки клієнти можуть надсилати повідомлення." }, { status: 403 });
    }

    const { data: requestRow, error: requestError } = await supabase
      .from("requests")
      .select("id, master_id, client_id")
      .eq("id", requestId)
      .eq("client_id", authData.user.id)
      .maybeSingle();

    if (requestError) {
      return NextResponse.json({ error: requestError.message }, { status: 500 });
    }

    if (!requestRow) {
      return NextResponse.json({ error: "Запит не знайдено або доступ заборонено." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("request_messages")
      .insert({
        request_id: requestId,
        client_id: authData.user.id,
        master_id: requestRow.master_id,
        sender_id: authData.user.id,
        sender_role: "client",
        body,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: fromSupabase(data) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не вдалося надіслати повідомлення." },
      { status: 400 },
    );
  }
}
