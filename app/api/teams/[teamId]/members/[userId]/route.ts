import { NextResponse } from "next/server";
import { getAuthedUserId, isTeamCaptain } from "@/lib/teams/team-auth";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type RouteCtx = { params: Promise<{ teamId: string; userId: string }> };

export async function DELETE(_request: Request, ctx: RouteCtx) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 503 });
  }

  const { teamId, userId: targetUserId } = await ctx.params;
  const authClient = await createSupabaseAuthServerClient();
  if (!authClient) {
    return NextResponse.json({ error: "Ошибка подключения" }, { status: 503 });
  }

  const userId = await getAuthedUserId(authClient);
  if (!userId) {
    return NextResponse.json({ error: "Нужно войти" }, { status: 401 });
  }

  if (!(await isTeamCaptain(authClient, teamId, userId))) {
    return NextResponse.json({ error: "Только капитан может исключать" }, { status: 403 });
  }

  if (targetUserId === userId) {
    return NextResponse.json({ error: "Капитан не может исключить себя" }, { status: 400 });
  }

  const { error } = await authClient
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", targetUserId);

  if (error) {
    console.error("[teams/kick]", error);
    return NextResponse.json({ error: "Не удалось исключить" }, { status: 500 });
  }

  const { count } = await authClient
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId);

  await authClient
    .from("teams")
    .update({ member_count: count ?? 0 })
    .eq("id", teamId);

  return NextResponse.json({ ok: true });
}
