import type { SupabaseClient } from "@supabase/supabase-js";

export const AVATARS_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export async function ensureAvatarsBucket(
  admin: SupabaseClient,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: buckets, error: listError } = await admin.storage.listBuckets();

  if (listError) {
    console.error("[storage] listBuckets", listError);
  } else if (
    buckets?.some((b) => b.id === AVATARS_BUCKET || b.name === AVATARS_BUCKET)
  ) {
    return { ok: true };
  }

  const { error: createError } = await admin.storage.createBucket(AVATARS_BUCKET, {
    public: true,
    fileSizeLimit: MAX_AVATAR_BYTES,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });

  if (createError) {
    const msg = createError.message.toLowerCase();
    if (msg.includes("already exists") || msg.includes("duplicate")) {
      return { ok: true };
    }
    return { ok: false, message: createError.message };
  }

  return { ok: true };
}

export async function uploadAvatar(
  admin: SupabaseClient,
  userId: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "Фото слишком большое (макс. 5 МБ)" };
  }

  const ensured = await ensureAvatarsBucket(admin);
  if (!ensured.ok) {
    return {
      error: `Хранилище не настроено: ${ensured.message}. Выполните SQL из supabase/migrations/012_avatars_storage.sql`,
    };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)
    ? ext
    : "jpg";
  const path = `${userId}/avatar.${safeExt === "jpeg" ? "jpg" : safeExt}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(AVATARS_BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    console.error("[profile/avatar] upload", uploadError);
    return { error: uploadError.message };
  }

  const { data: publicUrl } = admin.storage
    .from(AVATARS_BUCKET)
    .getPublicUrl(path);

  return { url: `${publicUrl.publicUrl}?t=${Date.now()}` };
}
