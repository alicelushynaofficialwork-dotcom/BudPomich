import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase";

export const demoRoles = ["client", "master", "contractor"] as const;

export type DemoRole = (typeof demoRoles)[number];

type DemoTemplate = {
  id: string;
  name: string;
  version: number;
  state: unknown;
};

type DemoSession = {
  id: string;
  role: DemoRole;
};

export type DemoSessionResult = {
  id: string;
  role: DemoRole;
  templateName: string;
};

async function findExistingSession(
  supabase: SupabaseClient,
  userId: string,
  role: DemoRole,
) {
  return supabase
    .from("demo_sessions")
    .select("id, role")
    .eq("user_id", userId)
    .eq("role", role)
    .maybeSingle<DemoSession>();
}

export async function startDemoSession(role: DemoRole): Promise<DemoSessionResult> {
  const supabase = createClient();

  if (!supabase) {
    throw new Error("Supabase browser client is not configured.");
  }

  const { data: authData } = await supabase.auth.getUser();
  let user = authData.user;

  if (!user) {
    const { data: anonymousData, error: anonymousError } =
      await supabase.auth.signInAnonymously();

    if (anonymousError || !anonymousData.user) {
      throw anonymousError ?? new Error("Anonymous sign-in returned no user.");
    }

    user = anonymousData.user;
  }

  const { data: template, error: templateError } = await supabase
    .from("demo_templates")
    .select("id, name, version, state")
    .eq("role", role)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle<DemoTemplate>();

  if (templateError || !template) {
    throw templateError ?? new Error(`No active demo template found for role: ${role}.`);
  }

  const { data: existingSession, error: existingSessionError } =
    await findExistingSession(supabase, user.id, role);

  if (existingSessionError) {
    throw existingSessionError;
  }

  if (existingSession) {
    return {
      id: existingSession.id,
      role: existingSession.role,
      templateName: template.name,
    };
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data: createdSession, error: createError } = await supabase
    .from("demo_sessions")
    .insert({
      user_id: user.id,
      role,
      template_id: template.id,
      template_version: template.version,
      state: template.state,
      expires_at: expiresAt,
    })
    .select("id, role")
    .single<DemoSession>();

  if (createError || !createdSession) {
    // If two clicks raced, preserve and return the row created first.
    if (createError?.code === "23505") {
      const { data: racedSession, error: racedSessionError } =
        await findExistingSession(supabase, user.id, role);

      if (!racedSessionError && racedSession) {
        return {
          id: racedSession.id,
          role: racedSession.role,
          templateName: template.name,
        };
      }
    }

    throw createError ?? new Error("Demo session insert returned no row.");
  }

  return {
    id: createdSession.id,
    role: createdSession.role,
    templateName: template.name,
  };
}
