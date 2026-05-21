import { NextResponse } from "next/server";
import { mapMessage } from "@/lib/teams/map-row";
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

  const { data: rows, error } = await authClient
    .from("team_messages")
    .select("id, team_id, user_id, body, created_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error("[teams/messages]", error);
    return NextResponse.json({ error: "Ошибка загрузки чата" }, { status: 500 });
  }

  const userIds = [...new Set((rows ?? []).map((r) => r.user_id as string))];
  const { data: profiles } = await authClient
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  return NextResponse.json({
    messages: (rows ?? []).map((row) =>
      mapMessage({
        ...row,
        profiles: profileMap.get(row.user_id as string) ?? null,
      } as Parameters<typeof mapMessage>[0]),
    ),
  });
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

  let body: { body?: string };
  try {
    body = (await request.json()) as { body?: string };
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 });
  }

  const text = body.body?.trim() ?? "";
  if (!text) {
    return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });
  }

  const { data: row, error } = await authClient
    .from("team_messages")
    .insert({ team_id: teamId, user_id: userId, body: text })
    .select("id, team_id, user_id, body, created_at")
    .single();

  if (error) {
    console.error("[teams/messages/post]", error);
    return NextResponse.json({ error: "Не удалось отправить" }, { status: 500 });
  }

  const { data: profile } = await authClient
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  return NextResponse.json({
    message: mapMessage({
      ...row,
      profiles: profile,
    } as Parameters<typeof mapMessage>[0]),
  });
}
