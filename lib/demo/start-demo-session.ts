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
  expires_at: string;
};

export type DemoSessionResult = {
  id: string;
  role: DemoRole;
  templateName: string;
  route: `/demo/${DemoRole}`;
};

export function getDemoCabinetRoute(role: DemoRole): `/demo/${DemoRole}` {
  return `/demo/${role}`;
}

export class DemoAuthRequiredError extends Error {}
export class DemoCaptchaRequiredError extends Error {}

async function findExistingSession(
  supabase: SupabaseClient,
  userId: string,
  role: DemoRole,
) {
  return supabase
    .from("demo_sessions")
    .select("id, role, expires_at")
    .eq("user_id", userId)
    .eq("role", role)
    .maybeSingle<DemoSession>();
}

export async function startDemoSession(
  role: DemoRole,
  options: { allowAnonymousSignIn?: boolean; captchaToken?: string } = {},
): Promise<DemoSessionResult> {
  const supabase = createClient();

  if (!supabase) {
    throw new Error("Supabase browser client is not configured.");
  }

  const { data: authData } = await supabase.auth.getUser();
  let user = authData.user;

  if (!user) {
    if (options.allowAnonymousSignIn === false) {
      throw new DemoAuthRequiredError("An active demo authentication session is required.");
    }
    if (!options.captchaToken?.trim()) {
      throw new DemoCaptchaRequiredError("A CAPTCHA token is required for anonymous sign-in.");
    }
    const { data: anonymousData, error: anonymousError } =
      await supabase.auth.signInAnonymously({
        options: { captchaToken: options.captchaToken },
      });

    if (anonymousError || !anonymousData.user) {
      throw anonymousError ?? new Error("Anonymous sign-in returned no user.");
    }

    user = anonymousData.user;
  }

  const { data: existingSession, error: existingSessionError } =
    await findExistingSession(supabase, user.id, role);

  if (existingSessionError) {
    throw existingSessionError;
  }

  const existingExpiresAt = existingSession
    ? new Date(existingSession.expires_at).getTime()
    : Number.NaN;
  const existingSessionIsActive =
    existingSession && Number.isFinite(existingExpiresAt) && existingExpiresAt > Date.now();

  if (existingSessionIsActive) {
    return {
      id: existingSession.id,
      role: existingSession.role,
      templateName: "Збережена демосесія",
      route: getDemoCabinetRoute(existingSession.role),
    };
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

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  if (existingSession) {
    const now = new Date().toISOString();
    const { data: restoredSession, error: restoreError } = await supabase
      .from("demo_sessions")
      .update({
        template_id: template.id,
        template_version: template.version,
        state: template.state,
        expires_at: expiresAt,
        last_accessed_at: now,
        updated_at: now,
      })
      .eq("id", existingSession.id)
      .eq("user_id", user.id)
      .eq("role", role)
      .select("id, role, expires_at")
      .single<DemoSession>();

    if (restoreError || !restoredSession) {
      throw restoreError ?? new Error("Expired demo session restore returned no row.");
    }

    return {
      id: restoredSession.id,
      role: restoredSession.role,
      templateName: template.name,
      route: getDemoCabinetRoute(restoredSession.role),
    };
  }

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
    .select("id, role, expires_at")
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
          route: getDemoCabinetRoute(racedSession.role),
        };
      }
    }

    throw createError ?? new Error("Demo session insert returned no row.");
  }

  return {
    id: createdSession.id,
    role: createdSession.role,
    templateName: template.name,
    route: getDemoCabinetRoute(createdSession.role),
  };
}
