import { NextResponse } from "next/server";
import { isPublicZoneReport } from "@/lib/reports/is-cleanup-proof";
import { withDistanceSorted } from "@/lib/reports/sort-by-distance";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isValidSupabaseProjectUrl } from "@/lib/supabase/normalize-url";

function publicError(message: string, status: number, detail?: string) {
  const body: { error: string; detail?: string } = { error: message };
  if (process.env.NODE_ENV === "development" && detail) {
    body.detail = detail;
  }
  return NextResponse.json(body, { status });
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return publicError(
      "Supabase не настроен. Заполните NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в .env",
      503,
    );
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  if (!isValidSupabaseProjectUrl(rawUrl)) {
    return publicError(
      "Неверный NEXT_PUBLIC_SUPABASE_URL. Нужен адрес вида https://xxxxx.supabase.co (без /rest/v1)",
      503,
      rawUrl.includes("/rest") ? "Уберите /rest/v1 из URL в .env" : undefined,
    );
  }

  const { searchParams } = new URL(request.url);
  const lat = Number.parseFloat(searchParams.get("lat") ?? "");
  const lng = Number.parseFloat(searchParams.get("lng") ?? "");

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return publicError("Нужны параметры lat и lng", 400);
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return publicError("Не удалось подключиться к Supabase", 503);
  }

  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, user_id, lat, lng, photo_url, ai_verified, ai_confidence, status, notes, created_at, cleaned_at, cleanup_photo_url",
    )
    .eq("status", "verified")
    .is("cleaned_at", null);

  if (error) {
    console.error("[reports/nearby]", error);

    if (error.code === "42P01" || error.message.includes("does not exist")) {
      return publicError(
        "Таблица reports не найдена. Выполните SQL из supabase/migrations/001_reports.sql",
        500,
        error.message,
      );
    }

    if (error.code === "PGRST125") {
      return publicError(
        "Неверный URL Supabase. В .env укажите только Project URL: https://xxxxx.supabase.co",
        503,
        error.message,
      );
    }

    return publicError("Ошибка загрузки заявок", 500, error.message);
  }

  const reports = withDistanceSorted(
    (data ?? []).filter(isPublicZoneReport),
    lat,
    lng,
  );

  return NextResponse.json({ reports });
}
