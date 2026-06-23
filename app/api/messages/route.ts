import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createLocalId, mockRequestMessages, type RequestMessage } from "@/lib/requests";

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
    senderRole: row.sender_role === "master" || row.sender_type === "master" ? "master" : "client",
    body: String(row.body ?? row.message_text ?? ""),
    isRead: Boolean(row.is_read),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function GET(request: Request) {
  const requestId = new URL(request.url).searchParams.get("requestId") ?? "";
  const supabase = createServerSupabaseClient();

  if (!supabase) {
    return NextResponse.json({
      messages: mockRequestMessages.filter((message) => !requestId || message.requestId === requestId),
      persistence: "browser",
    });
  }

  let query = supabase.from("messages").select("*").order("created_at", { ascending: true });
  if (requestId) query = query.eq("request_id", requestId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({
      messages: mockRequestMessages.filter((message) => !requestId || message.requestId === requestId),
      persistence: "browser",
      warning: error.message,
    });
  }

  return NextResponse.json({ messages: (data ?? []).map(fromSupabase), persistence: "supabase" });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const message: RequestMessage = {
      id: createLocalId("message"),
      requestId: text(payload.requestId, "ID заявки"),
      senderRole: payload.senderRole === "client" ? "client" : "master",
      body: text(payload.body, "повідомлення"),
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    const supabase = createServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json({ message, persistence: "browser" });
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        request_id: message.requestId,
        master_id: typeof payload.masterId === "string" ? payload.masterId : null,
        sender_type: message.senderRole,
        sender_name: message.senderRole === "master" ? "Майстер" : "Клієнт",
        message_text: message.body,
        sender_role: message.senderRole,
        body: message.body,
        is_read: message.isRead,
        created_at: message.createdAt,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({
        message,
        persistence: "browser",
        warning: error.message,
      });
    }

    return NextResponse.json({ message: fromSupabase(data), persistence: "supabase" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не вдалося надіслати повідомлення." },
      { status: 400 },
    );
  }
}
