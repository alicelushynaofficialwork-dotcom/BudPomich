import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MASTER_PROFILE_NOT_LINKED, resolveAuthenticatedMasterIdentity } from "@/lib/master-identity";
import { type RequestMessage } from "@/lib/requests";

function text(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Заповніть поле "${field}".`);
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
  const requestedId = new URL(request.url).searchParams.get("requestId")?.trim() ?? "";
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Сервіс автентифікації недоступний." }, { status: 503 });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return NextResponse.json({ error: "Увійдіть у систему." }, { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  let requestQuery = supabase.from("requests").select("id");
  let readerRole: "client" | "master";
  if (profile?.role === "client") {
    readerRole = "client";
    requestQuery = requestQuery.eq("client_id", authData.user.id);
  } else if (profile?.role === "master") {
    readerRole = "master";
    const resolved = await resolveAuthenticatedMasterIdentity(supabase);
    if (!resolved.ok) {
      const status = resolved.code === MASTER_PROFILE_NOT_LINKED ? 409 : 403;
      return NextResponse.json({ error: resolved.code, messages: [] }, { status });
    }
    requestQuery = requestQuery.eq("master_id", resolved.identity.masterSlug);
  } else {
    return NextResponse.json({ error: "Недостатньо прав." }, { status: 403 });
  }
  if (requestedId) requestQuery = requestQuery.eq("id", requestedId);

  const { data: requestRows, error: requestError } = await requestQuery;
  if (requestError) return NextResponse.json({ error: requestError.message }, { status: 500 });
  const requestIds = (requestRows ?? []).map((row) => String(row.id));
  if (!requestIds.length) return NextResponse.json({ messages: [] });

  await supabase
    .from("request_messages")
    .update({ read_at: new Date().toISOString() })
    .in("request_id", requestIds)
    .neq("sender_role", readerRole)
    .is("read_at", null);

  const { data, error } = await supabase
    .from("request_messages")
    .select("*")
    .in("request_id", requestIds)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: (data ?? []).map(fromSupabase) });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const requestId = text(payload.requestId, "ID заявки");
    const body = text(payload.body, "повідомлення");
    const supabase = await createServerSupabaseClient();
    if (!supabase) return NextResponse.json({ error: "Сервіс автентифікації недоступний." }, { status: 503 });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return NextResponse.json({ error: "Увійдіть у систему." }, { status: 401 });
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

    let bookingQuery = supabase.from("requests").select("id, master_id, client_id").eq("id", requestId);
    let senderRole: "client" | "master";
    if (profile?.role === "client") {
      senderRole = "client";
      bookingQuery = bookingQuery.eq("client_id", authData.user.id);
    } else if (profile?.role === "master") {
      senderRole = "master";
      const resolved = await resolveAuthenticatedMasterIdentity(supabase);
      if (!resolved.ok) return NextResponse.json({ error: resolved.code }, { status: 403 });
      bookingQuery = bookingQuery.eq("master_id", resolved.identity.masterSlug);
    } else {
      return NextResponse.json({ error: "Недостатньо прав." }, { status: 403 });
    }

    const { data: booking, error: bookingError } = await bookingQuery.maybeSingle();
    if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 });
    if (!booking) return NextResponse.json({ error: "Заявку не знайдено або доступ заборонено." }, { status: 403 });

    const { data, error } = await supabase
      .from("request_messages")
      .insert({
        request_id: booking.id,
        client_id: booking.client_id,
        master_id: booking.master_id,
        sender_id: authData.user.id,
        sender_role: senderRole,
        body,
      })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: fromSupabase(data) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не вдалося надіслати повідомлення." },
      { status: 400 },
    );
  }
}
