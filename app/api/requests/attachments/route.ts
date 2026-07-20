import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const maxFileSize = 10 * 1024 * 1024;
const maxTotalSize = 50 * 1024 * 1024;

function safeName(name: string) {
  const extension = name.includes(".") ? `.${name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")}` : "";
  const base = name.replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "file";
  return `${base}${extension}`;
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Сховище недоступне." }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Увійдіть у систему." }, { status: 401 });

  const form = await request.formData();
  const bookingId = String(form.get("bookingId") ?? "");
  const files = form.getAll("files").filter((value): value is File => value instanceof File);
  if (!bookingId || !files.length) return NextResponse.json({ error: "Не вибрано файли." }, { status: 400 });
  if (files.length > 10 || files.some((file) => !allowedTypes.has(file.type) || file.size > maxFileSize) || files.reduce((sum, file) => sum + file.size, 0) > maxTotalSize) {
    return NextResponse.json({ error: "Дозволено до 10 JPEG, PNG, WebP або PDF, до 10 МБ кожен і 50 МБ разом." }, { status: 400 });
  }
  const { data: booking } = await supabase.from("requests").select("id").eq("id", bookingId).eq("client_id", auth.user.id).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Заявку не знайдено або доступ заборонено." }, { status: 403 });

  const uploaded: string[] = [];
  const failed: { name: string; error: string }[] = [];
  for (const file of files) {
    const path = `${bookingId}/${crypto.randomUUID()}-${safeName(file.name)}`;
    const upload = await supabase.storage.from("booking-attachments").upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error) { failed.push({ name: file.name, error: upload.error.message }); continue; }
    const metadata = await supabase.from("booking_attachments").insert({ booking_id: bookingId, uploaded_by: auth.user.id, storage_path: path, original_name: file.name, mime_type: file.type, size_bytes: file.size, kind: file.type.startsWith("image/") ? "image" : "document" });
    if (metadata.error) {
      await supabase.storage.from("booking-attachments").remove([path]);
      failed.push({ name: file.name, error: metadata.error.message });
    } else uploaded.push(file.name);
  }
  return NextResponse.json({ uploaded, failed }, { status: failed.length && !uploaded.length ? 500 : 201 });
}
