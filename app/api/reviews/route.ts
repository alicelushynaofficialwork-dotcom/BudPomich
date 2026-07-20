import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { MasterReview, ReviewAggregate, ReviewStatus } from "@/lib/reviews";

type ReviewRow = Record<string, unknown>;
type ScoreField = "qualityRating" | "deadlinesRating" | "communicationRating" | "estimateRating" | "cleanlinessRating";

function optionalScore(value: unknown) {
  const score = Number(value);
  return Number.isInteger(score) && score >= 1 && score <= 5 ? score : undefined;
}

function toReview(row: ReviewRow): MasterReview {
  return {
    id: String(row.id), bookingId: String(row.booking_id), masterId: String(row.master_id), clientId: String(row.client_id),
    clientName: String(row.client_public_name || "Клієнт BudPomich"), serviceTitle: typeof row.service_title === "string" ? row.service_title : undefined,
    projectId: typeof row.project_id === "string" ? row.project_id : undefined, rating: Number(row.rating),
    qualityRating: optionalScore(row.quality_rating), deadlinesRating: optionalScore(row.deadlines_rating), communicationRating: optionalScore(row.communication_rating), estimateRating: optionalScore(row.estimate_rating), cleanlinessRating: optionalScore(row.cleanliness_rating),
    text: String(row.text), imageUrls: Array.isArray(row.image_urls) ? row.image_urls.filter((url): url is string => typeof url === "string") : [],
    status: (["published", "pending", "hidden"] as ReviewStatus[]).includes(row.status as ReviewStatus) ? row.status as ReviewStatus : "hidden",
    createdAt: String(row.created_at), updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined,
    masterReply: typeof row.master_reply === "string" ? row.master_reply : undefined, masterRepliedAt: typeof row.master_replied_at === "string" ? row.master_replied_at : undefined,
    verifiedBooking: true,
  };
}

function aggregate(reviews: MasterReview[]): ReviewAggregate {
  const distribution: ReviewAggregate["distribution"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((review) => { distribution[review.rating as 1 | 2 | 3 | 4 | 5] += 1; });
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const criterion = (field: ScoreField) => {
    const values = reviews.map((review) => review[field]).filter((value): value is number => typeof value === "number");
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
  };
  return { average, count: reviews.length, distribution, criteria: { quality: criterion("qualityRating"), deadlines: criterion("deadlinesRating"), communication: criterion("communicationRating"), estimate: criterion("estimateRating"), cleanliness: criterion("cleanlinessRating") } };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const masterId = url.searchParams.get("masterId");
  const mine = url.searchParams.get("mine") === "1";
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Сервіс відгуків недоступний." }, { status: 503 });
  let query = supabase.from("reviews").select("*").order("created_at", { ascending: false });
  if (mine) {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return NextResponse.json({ error: "Увійдіть у систему." }, { status: 401 });
    query = query.eq("client_id", authData.user.id);
  } else {
    if (!masterId) return NextResponse.json({ error: "Не вказано майстра." }, { status: 400 });
    query = query.eq("master_id", masterId).eq("status", "published");
  }
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const reviews = (data ?? []).map((row) => toReview(row));
  return NextResponse.json({ reviews, aggregate: aggregate(reviews.filter((review) => review.status === "published")) });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Сервіс відгуків недоступний." }, { status: 503 });
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Увійдіть у систему, щоб залишити відгук." }, { status: 401 });
  const payload = await request.json() as Record<string, unknown>;
  const bookingId = typeof payload.bookingId === "string" ? payload.bookingId : "";
  const rating = optionalScore(payload.rating);
  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  if (!bookingId || !rating || text.length < 20) return NextResponse.json({ error: "Оберіть оцінку та напишіть щонайменше 20 символів." }, { status: 400 });
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", authData.user.id).maybeSingle();
  if (!profile || profile.role !== "client") return NextResponse.json({ error: "Відгук може залишити лише клієнт." }, { status: 403 });
  const { data: booking } = await supabase.from("requests").select("id, client_id, master_id, selected_service_title, status").eq("id", bookingId).eq("client_id", authData.user.id).maybeSingle();
  if (!booking || booking.status !== "completed") return NextResponse.json({ error: "Відгук доступний лише після завершення вашого замовлення." }, { status: 403 });
  const insert = {
    booking_id: booking.id, master_id: booking.master_id, client_id: authData.user.id, client_public_name: profile.full_name?.trim() || "Клієнт BudPomich", service_title: booking.selected_service_title,
    rating, quality_rating: optionalScore(payload.qualityRating), deadlines_rating: optionalScore(payload.deadlinesRating), communication_rating: optionalScore(payload.communicationRating), estimate_rating: optionalScore(payload.estimateRating), cleanliness_rating: optionalScore(payload.cleanlinessRating),
    text, image_urls: [], status: "published",
  };
  const { data, error } = await supabase.from("reviews").insert(insert).select("*").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Відгук для цього замовлення вже залишено." : error.message }, { status: error.code === "23505" ? 409 : 500 });
  return NextResponse.json({ review: toReview(data) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Сервіс відгуків недоступний." }, { status: 503 });
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Увійдіть у систему." }, { status: 401 });
  const payload = await request.json() as Record<string, unknown>;
  const reviewId = typeof payload.reviewId === "string" ? payload.reviewId : "";
  const reply = typeof payload.reply === "string" ? payload.reply.trim() : "";
  if (!reviewId || reply.length < 2 || reply.length > 2000) return NextResponse.json({ error: "Відповідь має містити від 2 до 2000 символів." }, { status: 400 });
  const { data, error } = await supabase.rpc("reply_to_review", { review_id: reviewId, reply_text: reply });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ review: toReview(data as ReviewRow) });
}
