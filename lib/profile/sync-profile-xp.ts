import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { xpFromVerifiedCount } from "@/lib/profile/real-stats";

/** Привести profiles.xp к факту: только verified-отчёты с user_id */
export async function syncProfileXpIfNeeded(
  userId: string,
  verifiedCount: number,
  storedXp: number,
): Promise<number> {
  const realXp = xpFromVerifiedCount(verifiedCount);
  if (realXp === storedXp) return realXp;

  const admin = createSupabaseAdminClient();
  if (admin) {
    const { error } = await admin
      .from("profiles")
      .update({ xp: realXp, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      console.error("[profile] sync xp", error);
    }
  }

  return realXp;
}

export async function getVerifiedReportCount(
  client: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await client
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "verified")
    .eq("ai_verified", true);

  if (error) {
    console.error("[profile] verified count", error);
    return 0;
  }

  return count ?? 0;
}
