import type { SupabaseClient } from "@supabase/supabase-js";

export const TEAM_LOGOS_BUCKET = "team-logos";

export async function ensureTeamLogosBucket(
  admin: SupabaseClient,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: buckets, error: listError } = await admin.storage.listBuckets();

  if (listError) {
    console.error("[storage] listBuckets", listError);
  } else if (
    buckets?.some((b) => b.id === TEAM_LOGOS_BUCKET || b.name === TEAM_LOGOS_BUCKET)
  ) {
    return { ok: true };
  }

  const { error: createError } = await admin.storage.createBucket(
    TEAM_LOGOS_BUCKET,
    {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ],
    },
  );

  if (createError) {
    const msg = createError.message.toLowerCase();
    if (msg.includes("already exists") || msg.includes("duplicate")) {
      return { ok: true };
    }
    return { ok: false, message: createError.message };
  }

  return { ok: true };
}
