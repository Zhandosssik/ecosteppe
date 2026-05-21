import { NextResponse } from "next/server";
import { fetchProfileData } from "@/lib/profile/fetch-profile-data";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function publicError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
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

  const { data: profile } = await authClient
    .from("profiles")
    .select("volunteer_status")
    .eq("id", authData.user.id)
    .maybeSingle();

  const current = profile?.volunteer_status as string | undefined;
  if (current === "pending") {
    return publicError("Заявка уже на рассмотрении", 409);
  }
  if (current === "approved") {
    return publicError("Вы уже верифицированный волонтёр", 409);
  }

  const { error } = await authClient
    .from("profiles")
    .update({
      volunteer_status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", authData.user.id);

  if (error) {
    console.error("[profile/volunteer]", error);
    return publicError("Не удалось отправить заявку", 500);
  }

  const origin = new URL(request.url).origin;
  const data = await fetchProfileData(origin);
  return NextResponse.json({
    message: "Заявка отправлена администратору",
    profile: data,
  });
}
