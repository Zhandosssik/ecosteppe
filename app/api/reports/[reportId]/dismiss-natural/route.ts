import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

function publicError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

type RouteContext = { params: Promise<{ reportId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  if (!isSupabaseAdminConfigured()) {
    return publicError("Сервер не настроен", 503);
  }

  const { reportId } = await context.params;
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(reportId)) {
    return publicError("Некорректный id заявки", 400);
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return publicError("Не удалось подключиться к Supabase", 503);
  }

  const { data: row, error: fetchError } = await supabase
    .from("reports")
    .select("id, status, cleaned_at, notes")
    .eq("id", reportId)
    .maybeSingle();

  if (fetchError) {
    console.error("[dismiss-natural]", fetchError);
    return publicError("Ошибка загрузки заявки", 500);
  }

  if (!row) {
    return publicError("Заявка не найдена", 404);
  }

  if (row.cleaned_at) {
    return publicError("Заявка уже завершена", 409);
  }

  if (row.status !== "verified") {
    return publicError("Можно отметить только активную подтверждённую заявку", 400);
  }

  const stamp = "Природный объект — уборка не требуется";
  const notes =
    row.notes && !row.notes.includes(stamp)
      ? `${row.notes}\n${stamp}`
      : stamp;

  const { error: updateError } = await supabase
    .from("reports")
    .update({
      status: "rejected",
      notes,
      ai_verified: false,
    })
    .eq("id", reportId);

  if (updateError) {
    console.error("[dismiss-natural] update", updateError);
    return publicError("Не удалось обновить заявку", 500);
  }

  return NextResponse.json({
    ok: true,
    message:
      "Заявка снята: ИИ ошибся, это не мусор (камень, галька и т.п.). Зона убрана из активных.",
  });
}
