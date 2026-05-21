import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ReportPickOption } from "@/types/teams";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 503 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Ошибка подключения" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("reports")
    .select("id, lat, lng, photo_url, notes, created_at")
    .eq("status", "verified")
    .is("cleaned_at", null)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    return NextResponse.json({ error: "Ошибка загрузки свалок" }, { status: 500 });
  }

  const reports: ReportPickOption[] = (data ?? []).map((r) => ({
    id: r.id as string,
    lat: r.lat as number,
    lng: r.lng as number,
    photoUrl: (r.photo_url as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    createdAt: r.created_at as string,
  }));

  return NextResponse.json({ reports });
}
