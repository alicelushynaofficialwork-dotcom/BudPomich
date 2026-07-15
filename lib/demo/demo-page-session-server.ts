import "server-only";

import type { DemoRole } from "@/lib/demo/start-demo-session";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type SessionRow = { id: string; state: unknown; expires_at: string };
type TemplateRow = { id: string; version: number; state: unknown };

export class DemoPageSessionError extends Error {
  constructor(message: string, public readonly code: "unavailable" | "auth" | "read" | "restore") { super(message); }
}

export async function loadCurrentDemoPageSession(role: DemoRole): Promise<{
  state: unknown;
  accessWarning: boolean;
} | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new DemoPageSessionError("Demo service is unavailable.", "unavailable");
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new DemoPageSessionError("Unable to read authenticated demo user.", "auth");
  if (!authData.user) return null;

  const { data: session, error: sessionError } = await supabase
    .from("demo_sessions").select("id, state, expires_at")
    .eq("user_id", authData.user.id).eq("role", role).maybeSingle<SessionRow>();
  if (sessionError) throw new DemoPageSessionError("Unable to read demo session.", "read");
  if (!session) return null;

  const now = new Date();
  const expiresAt = new Date(session.expires_at).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) {
    const { data: template, error: templateError } = await supabase
      .from("demo_templates").select("id, version, state")
      .eq("role", role).eq("is_active", true).order("version", { ascending: false })
      .limit(1).maybeSingle<TemplateRow>();
    if (templateError || !template) throw new DemoPageSessionError("Unable to read active demo template.", "restore");
    const nowIso = now.toISOString();
    const { data: restored, error: restoreError } = await supabase
      .from("demo_sessions")
      .update({ state: template.state, template_id: template.id, template_version: template.version, expires_at: new Date(now.getTime() + 86_400_000).toISOString(), last_accessed_at: nowIso, updated_at: nowIso })
      .eq("id", session.id).eq("user_id", authData.user.id).eq("role", role)
      .select("state").single<{ state: unknown }>();
    if (restoreError || !restored) throw new DemoPageSessionError("Unable to restore expired demo session.", "restore");
    return { state: restored.state, accessWarning: false };
  }

  const { error: accessError } = await supabase.from("demo_sessions")
    .update({ last_accessed_at: now.toISOString() })
    .eq("id", session.id).eq("user_id", authData.user.id).eq("role", role);
  return { state: session.state, accessWarning: Boolean(accessError) };
}
