import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function getAuthedUserId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const fromSession = sessionData.session?.user?.id;
  if (fromSession) return fromSession;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function isTeamCaptain(
  supabase: SupabaseClient,
  teamId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("teams")
    .select("captain_id")
    .eq("id", teamId)
    .maybeSingle();
  return data?.captain_id === userId;
}

/** Строка участника в team_members (service role — без рекурсивного RLS). */
export async function findTeamMembership(
  userId: string,
  authClient?: SupabaseClient | null,
): Promise<{ teamId: string } | null> {
  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data, error } = await admin
      .from("team_members")
      .select("team_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[team-auth] membership lookup", error);
      return null;
    }

    const teamId = data?.team_id as string | undefined;
    return teamId ? { teamId } : null;
  }

  if (!authClient) return null;

  const { data, error } = await authClient
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[team-auth] membership lookup", error);
    return null;
  }

  const teamId = data?.team_id as string | undefined;
  return teamId ? { teamId } : null;
}

/** Участник в team_members или капитан команды */
export async function isTeamMember(
  supabase: SupabaseClient,
  teamId: string,
  userId: string,
): Promise<boolean> {
  if (await isTeamCaptain(supabase, teamId, userId)) return true;

  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data } = await admin
      .from("team_members")
      .select("team_id")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .maybeSingle();
    return Boolean(data);
  }

  const { data, error } = await supabase.rpc("is_team_member", {
    p_team_id: teamId,
  });
  if (!error && data === true) return true;

  return false;
}

/**
 * Доступ к чату/событиям: участник или капитан.
 * Если капитан без строки в team_members — восстанавливаем через service role.
 */
export async function ensureTeamChatAccess(
  supabase: SupabaseClient,
  teamId: string,
  userId: string,
): Promise<boolean> {
  if (!(await isTeamMember(supabase, teamId, userId))) {
    return false;
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return true;

  const { data: member } = await admin
    .from("team_members")
    .select("team_id")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (member) return true;

  const { error: repairError } = await admin.from("team_members").insert({
    team_id: teamId,
    user_id: userId,
  });

  return !repairError || repairError.code === "23505";
}
