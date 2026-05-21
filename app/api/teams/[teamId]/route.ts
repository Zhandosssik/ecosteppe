import { NextResponse } from "next/server";
import { fetchTeamDetail } from "@/lib/teams/fetch-team-detail";
import { getAuthedUserId, isTeamCaptain } from "@/lib/teams/team-auth";
import { mapTeamRow } from "@/lib/teams/map-row";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type RouteCtx = { params: Promise<{ teamId: string }> };

export async function GET(_request: Request, ctx: RouteCtx) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 503 });
  }

  const { teamId } = await ctx.params;
  const authClient = await createSupabaseAuthServerClient();
  const userId = authClient ? await getAuthedUserId(authClient) : null;

  const detail = await fetchTeamDetail(teamId, userId, authClient);
  if (!detail) {
    return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 503 });
  }

  const { teamId } = await ctx.params;
  const authClient = await createSupabaseAuthServerClient();
  if (!authClient) {
    return NextResponse.json({ error: "Ошибка подключения" }, { status: 503 });
  }

  const userId = await getAuthedUserId(authClient);
  if (!userId) {
    return NextResponse.json({ error: "Нужно войти" }, { status: 401 });
  }

  if (!(await isTeamCaptain(authClient, teamId, userId))) {
    return NextResponse.json({ error: "Только капитан может редактировать" }, { status: 403 });
  }

  let body: { description?: string };
  try {
    body = (await request.json()) as { description?: string };
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 });
  }

  const description = body.description?.trim() ?? "";
  const { data, error } = await authClient
    .from("teams")
    .update({ description: description || null })
    .eq("id", teamId)
    .select(
      "id, name, description, logo_url, member_count, total_xp, dumps_cleared, captain_id",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }

  return NextResponse.json({
    team: mapTeamRow(data, { isCaptain: true, isMember: true }),
  });
}
