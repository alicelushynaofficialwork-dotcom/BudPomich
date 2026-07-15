import { normalizeDemoClientState } from "@/lib/demo/client-state-adapter";
import { normalizeDemoMasterState } from "@/lib/demo/master-state-adapter";
import { normalizeDemoContractorState } from "@/lib/demo/contractor-state-adapter";
import {
  DemoApiError,
  demoErrorResponse,
  getCurrentDemoSession,
  isRecord,
} from "@/lib/demo/client-demo-server";
import { demoRoles, type DemoRole } from "@/lib/demo/start-demo-session";

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    if (
      !isRecord(payload) ||
      typeof payload.role !== "string" ||
      !demoRoles.includes(payload.role as DemoRole)
    ) {
      throw new DemoApiError("Некоректна роль демоверсії.", 400, "invalid_role");
    }

    const role = payload.role as DemoRole;
    const { supabase, userId, session } = await getCurrentDemoSession(role);
    const { data: template, error: templateError } = await supabase
      .from("demo_templates")
      .select("id, version, state")
      .eq("role", role)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; version: number; state: unknown }>();

    if (templateError) {
      console.error("Demo reset: failed to read active template.", templateError.message);
      throw new DemoApiError("Не вдалося завантажити шаблон демоверсії.", 500, "template_read_failed");
    }
    if (!template) {
      throw new DemoApiError("Активний шаблон демоверсії не знайдено.", 404, "template_not_found");
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("demo_sessions")
      .update({
        state: template.state,
        template_id: template.id,
        template_version: template.version,
        expires_at: expiresAt,
        last_accessed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", session.id)
      .eq("user_id", userId)
      .eq("role", role)
      .select("state")
      .single<{ state: unknown }>();

    if (updateError || !updated) {
      console.error("Demo reset: failed to reset demo state.", updateError?.message);
      throw new DemoApiError("Не вдалося скинути демоверсію.", 500, "reset_failed");
    }

    return Response.json({
      state:
        role === "client"
          ? normalizeDemoClientState(updated.state).data
          : role === "master"
            ? normalizeDemoMasterState(updated.state).data
            : normalizeDemoContractorState(updated.state).data,
    });
  } catch (error) {
    return demoErrorResponse(error);
  }
}
