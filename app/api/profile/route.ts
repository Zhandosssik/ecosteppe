import { NextResponse } from "next/server";
import { fetchProfileData } from "@/lib/profile/fetch-profile-data";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ProfileLocale, ProfilePatchBody } from "@/types/profile";

function publicError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return publicError("Supabase не настроен", 503);
  }

  const origin = new URL(request.url).origin;
  const data = await fetchProfileData(origin);
  if (!data) {
    return publicError("Войдите в аккаунт", 401);
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) {
    return publicError("Supabase не настроен", 503);
  }

  const authClient = await createSupabaseAuthServerClient();
  if (!authClient) {
    return publicError("Не удалось подключиться", 503);
  }

  const { data: authData } = await authClient.auth.getUser();
  if (!authData.user) {
    return publicError("Войдите в аккаунт", 401);
  }

  let body: ProfilePatchBody;
  try {
    body = (await request.json()) as ProfilePatchBody;
  } catch {
    return publicError("Неверный JSON", 400);
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.locale && ["ru", "kk", "en"].includes(body.locale)) {
    patch.locale = body.locale as ProfileLocale;
  }
  if (typeof body.notificationsEnabled === "boolean") {
    patch.notifications_enabled = body.notificationsEnabled;
  }
  if (typeof body.displayName === "string") {
    const name = body.displayName.trim().slice(0, 80);
    if (name.length > 0) patch.display_name = name;
  }

  if (Object.keys(patch).length === 1) {
    return publicError("Нечего обновлять", 400);
  }

  const { error } = await authClient
    .from("profiles")
    .update(patch)
    .eq("id", authData.user.id);

  if (error) {
    console.error("[profile PATCH]", error);
    return publicError("Не удалось сохранить настройки", 500);
  }

  const origin = new URL(request.url).origin;
  const data = await fetchProfileData(origin);
  return NextResponse.json(data);
}
