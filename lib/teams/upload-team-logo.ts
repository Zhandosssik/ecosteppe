import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ensureTeamLogosBucket,
  TEAM_LOGOS_BUCKET,
} from "@/lib/supabase/ensure-bucket";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export async function uploadTeamLogo(
  admin: SupabaseClient,
  userId: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  if (file.size > MAX_LOGO_BYTES) {
    return { error: "Логотип слишком большой (макс. 5 МБ)" };
  }

  const ensured = await ensureTeamLogosBucket(admin);
  if (!ensured.ok) {
    return {
      error: `Хранилище не настроено: ${ensured.message}. Выполните SQL из supabase/migrations/006_team_logos_storage.sql`,
    };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)
    ? ext
    : "jpg";
  const path = `${userId}/${Date.now()}.${safeExt === "jpeg" ? "jpg" : safeExt}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let uploadError = (
    await admin.storage.from(TEAM_LOGOS_BUCKET).upload(path, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    })
  ).error;

  if (uploadError?.message?.toLowerCase().includes("not found")) {
    await ensureTeamLogosBucket(admin);
    uploadError = (
      await admin.storage.from(TEAM_LOGOS_BUCKET).upload(path, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      })
    ).error;
  }

  if (uploadError) {
    console.error("[teams/logo] upload", uploadError);
    return { error: uploadError.message };
  }

  const { data: publicUrl } = admin.storage
    .from(TEAM_LOGOS_BUCKET)
    .getPublicUrl(path);

  return { url: publicUrl.publicUrl };
}
