import { NextResponse } from "next/server";
import { mapTeamRow } from "@/lib/teams/map-row";
import { teamsToSummaries } from "@/lib/teams/to-team-summary";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { findTeamMembership, getAuthedUserId } from "@/lib/teams/team-auth";
import { uploadTeamLogo } from "@/lib/teams/upload-team-logo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 503 });
  }

  const authClient = await createSupabaseAuthServerClient();
  const userId = authClient ? await getAuthedUserId(authClient) : null;

  let myTeams: Awaited<ReturnType<typeof teamsToSummaries>> = [];
  const supabase = createSupabaseServerClient();

  if (userId && authClient && supabase) {
    const membership = await findTeamMembership(userId, authClient);

    let teamId = membership?.teamId;

    if (!teamId) {
      const { data: captained } = await authClient
        .from("teams")
        .select("id")
        .eq("captain_id", userId)
        .limit(1)
        .maybeSingle();
      teamId = captained?.id as string | undefined;
    }

    if (teamId) {
      const { data: team } = await authClient
        .from("teams")
        .select("id, name, description, logo_url, member_count, captain_id")
        .eq("id", teamId)
        .maybeSingle();

      if (team) {
        const summaries = await teamsToSummaries(supabase, [team], {
          userId,
        });
        myTeams = summaries.map((t) => ({
          ...t,
          isCaptain: true,
          isMember: true,
        }));
      }
    }
  }

  return NextResponse.json({ myTeams, currentUserId: userId });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 503 });
  }

  const authClient = await createSupabaseAuthServerClient();
  if (!authClient) {
    return NextResponse.json({ error: "Ошибка подключения" }, { status: 503 });
  }

  const userId = await getAuthedUserId(authClient);
  if (!userId) {
    return NextResponse.json({ error: "Нужно войти" }, { status: 401 });
  }

  const existing = await findTeamMembership(userId, authClient);

  if (existing?.teamId) {
    return NextResponse.json(
      { error: "Вы уже в команде. Можно состоять только в одной." },
      { status: 409 },
    );
  }

  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const logo = form.get("logo");

  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Название: от 2 до 80 символов" }, { status: 400 });
  }

  let logoUrl: string | null = null;

  if (logo instanceof File && logo.size > 0) {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json(
        {
          error:
            "Загрузка логотипа недоступна. Добавьте SUPABASE_SERVICE_ROLE_KEY в .env",
        },
        { status: 503 },
      );
    }
    const admin = createSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Ошибка подключения к Storage" }, { status: 503 });
    }

    const uploaded = await uploadTeamLogo(admin, userId, logo);
    if ("error" in uploaded) {
      return NextResponse.json(
        {
          error: "Не удалось загрузить логотип",
          detail:
            process.env.NODE_ENV === "development" ? uploaded.error : undefined,
        },
        { status: 500 },
      );
    }
    logoUrl = uploaded.url;
  }

  const { data: team, error: insertError } = await authClient
    .from("teams")
    .insert({
      name,
      description: description || null,
      logo_url: logoUrl,
      captain_id: userId,
      member_count: 1,
      total_xp: 0,
      dumps_cleared: 0,
    })
    .select(
      "id, name, description, logo_url, member_count, total_xp, dumps_cleared, captain_id",
    )
    .single();

  if (insertError || !team) {
    console.error("[teams/create]", insertError);
    return NextResponse.json({ error: "Не удалось создать команду" }, { status: 500 });
  }

  let memberOk = false;
  const { error: memberError } = await authClient.from("team_members").insert({
    team_id: team.id,
    user_id: userId,
  });

  if (memberError) {
    console.error("[teams/create] member", memberError);
    if (memberError.code === "23505") {
      memberOk = true;
    } else {
      const admin = createSupabaseAdminClient();
      if (admin) {
        const { error: adminMemberError } = await admin.from("team_members").insert({
          team_id: team.id,
          user_id: userId,
        });
        memberOk =
          !adminMemberError ||
          adminMemberError.code === "23505";
        if (!memberOk) {
          console.error("[teams/create] member admin", adminMemberError);
        }
      }
    }
  } else {
    memberOk = true;
  }

  if (!memberOk) {
    await authClient.from("teams").delete().eq("id", team.id);
    return NextResponse.json(
      { error: "Не удалось добавить вас в команду как капитана" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    team: mapTeamRow(team, { isCaptain: true, isMember: true }),
    joined: true,
    isCaptain: true,
  });
}
