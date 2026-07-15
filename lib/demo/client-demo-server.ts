import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { DemoRole } from "@/lib/demo/start-demo-session";

export type DemoSessionRow = {
  id: string;
  role: DemoRole;
  template_id: string;
  template_version: number;
  state: unknown;
  expires_at: string;
  updated_at: string | null;
};

export class DemoApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getCurrentDemoSession(role: DemoRole): Promise<{
  supabase: SupabaseClient;
  userId: string;
  session: DemoSessionRow;
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new DemoApiError("Сервіс демоверсії тимчасово недоступний.", 503, "unavailable");
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new DemoApiError("Потрібна активна демосесія.", 401, "unauthorized");
  }

  const { data: session, error: sessionError } = await supabase
    .from("demo_sessions")
    .select("id, role, template_id, template_version, state, expires_at, updated_at")
    .eq("user_id", authData.user.id)
    .eq("role", role)
    .maybeSingle<DemoSessionRow>();

  if (sessionError) {
    console.error("Demo API: failed to read current demo session.", sessionError.message);
    throw new DemoApiError("Не вдалося завантажити демосесію.", 500, "session_read_failed");
  }

  if (!session) {
    throw new DemoApiError("Демосесію не знайдено.", 404, "session_not_found");
  }

  const expirationTime = new Date(session.expires_at).getTime();
  if (!Number.isFinite(expirationTime) || expirationTime <= Date.now()) {
    throw new DemoApiError(
      "Термін дії демосесії завершився. Створіть нову демоверсію.",
      410,
      "session_expired",
    );
  }

  return { supabase, userId: authData.user.id, session };
}

export async function updateCurrentDemoState(
  role: DemoRole,
  mutate: (state: unknown, now: string) => unknown,
): Promise<unknown> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { supabase, userId, session } = await getCurrentDemoSession(role);
    const now = new Date().toISOString();
    const nextState = mutate(session.state, now);
    let updateQuery = supabase
      .from("demo_sessions")
      .update({ state: nextState, last_accessed_at: now, updated_at: now })
      .eq("id", session.id)
      .eq("user_id", userId)
      .eq("role", role);

    updateQuery = session.updated_at
      ? updateQuery.eq("updated_at", session.updated_at)
      : updateQuery.is("updated_at", null);

    const { data: updated, error: updateError } = await updateQuery
      .select("state")
      .maybeSingle<{ state: unknown }>();

    if (updateError) {
      console.error("Demo API: failed to update demo state.", updateError.message);
      throw new DemoApiError("Не вдалося зберегти зміни демоверсії.", 500, "state_update_failed");
    }

    if (updated) return updated.state;
  }

  throw new DemoApiError(
    "Дані демоверсії змінилися в іншій вкладці. Повторіть дію.",
    409,
    "state_conflict",
  );
}

export function demoErrorResponse(error: unknown) {
  if (error instanceof DemoApiError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  console.error("Demo API: unexpected server error.");
  return Response.json(
    { error: "Сталася непередбачена помилка демоверсії.", code: "unexpected_error" },
    { status: 500 },
  );
}
