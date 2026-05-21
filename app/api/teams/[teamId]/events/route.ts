import { NextResponse } from "next/server";
import { mapEvent } from "@/lib/teams/map-row";
import { ensureTeamChatAccess, getAuthedUserId } from "@/lib/teams/team-auth";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type RouteCtx = { params: Promise<{ teamId: string }> };

export async function GET(_request: Request, ctx: RouteCtx) {
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

  if (!(await ensureTeamChatAccess(authClient, teamId, userId))) {
    return NextResponse.json({ error: "Вы не в этой команде" }, { status: 403 });
  }

  const { data, error } = await authClient
    .from("team_cleanup_events")
    .select("id, report_id, scheduled_at, title, created_by")
    .eq("team_id", teamId)
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Ошибка загрузки календаря" }, { status: 500 });
  }

  return NextResponse.json({ events: (data ?? []).map(mapEvent) });
}

export async function POST(request: Request, ctx: RouteCtx) {
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

  if (!(await ensureTeamChatAccess(authClient, teamId, userId))) {
    return NextResponse.json({ error: "Вы не в этой команде" }, { status: 403 });
  }

  let body: { reportId?: string; scheduledAt?: string; title?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 });
  }

  const scheduledAt = body.scheduledAt?.trim();
  if (!scheduledAt || Number.isNaN(Date.parse(scheduledAt))) {
    return NextResponse.json({ error: "Укажите дату и время" }, { status: 400 });
  }

  const { data, error } = await authClient
    .from("team_cleanup_events")
    .insert({
      team_id: teamId,
      report_id: body.reportId || null,
      scheduled_at: scheduledAt,
      title: body.title?.trim() || null,
      created_by: userId,
    })
    .select("id, report_id, scheduled_at, title, created_by")
    .single();

  if (error) {
    console.error("[teams/events]", error);
    return NextResponse.json({ error: "Не удалось запланировать" }, { status: 500 });
  }

  return NextResponse.json({ event: mapEvent(data) });
}
