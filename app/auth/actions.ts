"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getDashboardPath, isUserRole, type UserRole } from "@/lib/auth";

export type AuthActionState = {
  error?: string;
  notice?: string;
};

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string) {
  return password.length >= 8;
}

export async function signInWithEmail(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");

  if (!validateEmail(email) || !password) {
    return { error: "Вкажіть коректний email і пароль." };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { error: "Supabase не налаштований. Перевірте .env.local." };
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!isUserRole(profile?.role)) {
    await supabase.auth.signOut();
    return { error: "Профіль користувача не знайдено. Зверніться до підтримки." };
  }

  const role = profile.role;
  revalidatePath("/", "layout");
  redirect(getDashboardPath(role));
}

export async function signUpWithEmail(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const roleValue = value(formData, "role");
  const role: UserRole = isUserRole(roleValue) && roleValue !== "admin" ? roleValue : "client";
  const fullName = value(formData, "fullName");
  const phone = value(formData, "phone");
  const city = value(formData, "city");
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const hasAgreement = formData.get("agree") === "on";

  if (!fullName || !validateEmail(email) || !validatePassword(password)) {
    return { error: "Заповніть ім'я, коректний email і пароль від 8 символів." };
  }

  if (!hasAgreement) {
    return { error: "Потрібна згода з умовами та політикою конфіденційності." };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { error: "Supabase не налаштований. Перевірте .env.local." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        city,
        role,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email,
      full_name: fullName,
      phone,
      city,
      role,
      updated_at: new Date().toISOString(),
    });
  }

  revalidatePath("/", "layout");
  return {
    notice:
      data.session
        ? "Акаунт створено. Можна переходити в кабінет."
        : "Акаунт створено. Перевірте пошту для підтвердження реєстрації.",
  };
}

export async function resetPassword(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = value(formData, "email").toLowerCase();

  if (!validateEmail(email)) {
    return { error: "Вкажіть коректний email для відновлення пароля." };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { error: "Supabase не налаштований. Перевірте .env.local." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    return { error: error.message };
  }

  return { notice: "Посилання для відновлення пароля надіслано на email." };
}

export async function signOut(_state: AuthActionState): Promise<AuthActionState> {
  void _state;

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { error: "Supabase не налаштований. Спробуйте пізніше." };
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: "Не вдалося вийти з акаунта. Спробуйте ще раз." };
  }

  revalidatePath("/", "layout");
  redirect("/auth/login");
}
