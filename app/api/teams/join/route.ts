import { NextResponse } from "next/server";
import { insertTeamMember } from "@/lib/teams/update-member-count";
import { findTeamMembership } from "@/lib/teams/team-auth";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 503 });
  }

  const supabase = await createSupabaseAuthServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Ошибка подключения" }, { status: 503 });
  }

  const { data: authData, error: authError } = await supabase.auth.getSession();
  const user = authData.session?.user;
  if (authError || !user) {
    return NextResponse.json({ error: "Нужно войти в аккаунт" }, { status: 401 });
  }

  let body: { teamId?: string };
  try {
    body = (await request.json()) as { teamId?: string };
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const teamId = body.teamId?.trim();
  if (!teamId) {
    return NextResponse.json({ error: "Укажите teamId" }, { status: 400 });
  }

  const existing = await findTeamMembership(user.id, supabase);

  if (existing?.teamId) {
    if (existing.teamId === teamId) {
      return NextResponse.json({ ok: true, teamId, alreadyMember: true });
    }
    return NextResponse.json(
      { error: "Вы уже в другой команде. Сначала выйдите из неё." },
      { status: 409 },
    );
  }

  const { data: captained } = await supabase
    .from("teams")
    .select("id")
    .eq("captain_id", user.id)
    .maybeSingle();

  if (captained?.id && captained.id !== teamId) {
    return NextResponse.json(
      { error: "Вы капитан другой команды и не можете вступить сюда." },
      { status: 409 },
    );
  }

  const joined = await insertTeamMember(supabase, teamId, user.id);
  if (!joined.ok) {
    return NextResponse.json({ error: joined.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, teamId });
}
