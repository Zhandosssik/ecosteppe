import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** member_count — только через service role (RLS разрешает update только капитану) */
export async function syncTeamMemberCount(teamId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  if (!admin) return;

  const { count, error: countError } = await admin
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId);

  if (countError) {
    console.error("[teams] member count", countError);
    return;
  }

  const { error: updateError } = await admin
    .from("teams")
    .update({ member_count: count ?? 0 })
    .eq("id", teamId);

  if (updateError) {
    console.error("[teams] member_count update", updateError);
  }
}

export async function insertTeamMember(
  authClient: SupabaseClient,
  teamId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string; status?: number }> {
  const { error: insertError } = await authClient.from("team_members").insert({
    team_id: teamId,
    user_id: userId,
  });

  if (!insertError) {
    await syncTeamMemberCount(teamId);
    return { ok: true };
  }

  if (insertError.code === "23505") {
    await syncTeamMemberCount(teamId);
    return { ok: true };
  }

  const admin = createSupabaseAdminClient();
  if (admin) {
    const { error: adminError } = await admin.from("team_members").insert({
      team_id: teamId,
      user_id: userId,
    });
    if (!adminError || adminError.code === "23505") {
      await syncTeamMemberCount(teamId);
      return { ok: true };
    }
    console.error("[teams/join] admin insert", adminError);
  }

  console.error("[teams/join] insert", insertError);
  return { ok: false, message: "Не удалось вступить в команду" };
}
