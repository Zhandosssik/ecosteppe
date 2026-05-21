import { NextResponse } from "next/server";
import { teamsToSummaries } from "@/lib/teams/to-team-summary";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 503 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Ошибка подключения" }, { status: 503 });
  }

  let query = supabase
    .from("teams")
    .select("id, name, description, logo_url, member_count, captain_id")
    .not("captain_id", "is", null)
    .order("name", { ascending: true })
    .limit(50);

  if (q.length > 0) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[teams/search]", error);
    return NextResponse.json({ error: "Ошибка поиска" }, { status: 500 });
  }

  const teams = await teamsToSummaries(supabase, data ?? []);

  return NextResponse.json({ teams });
}
