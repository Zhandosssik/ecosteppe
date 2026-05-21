import { NextResponse } from "next/server";
import { fetchProfileData } from "@/lib/profile/fetch-profile-data";
import { uploadAvatar } from "@/lib/profile/upload-avatar";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import {
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

function publicError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return publicError("Supabase не настроен", 503);
  }
  if (!isSupabaseAdminConfigured()) {
    return publicError(
      "Для загрузки аватара нужен SUPABASE_SERVICE_ROLE_KEY в .env",
      503,
    );
  }

  const authClient = await createSupabaseAuthServerClient();
  if (!authClient) {
    return publicError("Не удалось подключиться", 503);
  }

  const { data: authData } = await authClient.auth.getUser();
  const user = authData.user;
  if (!user) {
    return publicError("Войдите в аккаунт", 401);
  }

  const formData = await request.formData();
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return publicError("Нужен файл photo", 400);
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return publicError("Admin-клиент недоступен", 503);
  }

  const uploaded = await uploadAvatar(admin, user.id, photo);
  if ("error" in uploaded) {
    return publicError(uploaded.error, 500);
  }

  const { error: updateError } = await authClient
    .from("profiles")
    .update({
      avatar_url: uploaded.url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("[profile/avatar] update", updateError);
    return publicError("Фото загружено, но профиль не обновлён", 500);
  }

  await authClient.auth.updateUser({
    data: { avatar_url: uploaded.url },
  });

  const origin = new URL(request.url).origin;
  const data = await fetchProfileData(origin);
  return NextResponse.json({ avatarUrl: uploaded.url, profile: data });
}
