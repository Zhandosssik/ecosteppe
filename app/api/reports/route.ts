import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

const BUCKET = "report-photos";
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

function publicError(message: string, status: number, detail?: string) {
  const body: { error: string; detail?: string } = { error: message };
  if (process.env.NODE_ENV === "development" && detail) {
    body.detail = detail;
  }
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  if (!isSupabaseAdminConfigured()) {
    return publicError(
      "Сервер не настроен для сохранения заявок. Добавьте SUPABASE_SERVICE_ROLE_KEY в .env",
      503,
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return publicError("Некорректные данные формы", 400);
  }

  const photo = formData.get("photo");
  const lat = Number.parseFloat(String(formData.get("lat") ?? ""));
  const lng = Number.parseFloat(String(formData.get("lng") ?? ""));
  const notesRaw = formData.get("notes");
  const notes =
    typeof notesRaw === "string" && notesRaw.trim().length > 0
      ? notesRaw.trim()
      : null;

  if (!(photo instanceof File) || photo.size === 0) {
    return publicError("Нужно фото", 400);
  }

  if (photo.size > MAX_PHOTO_BYTES) {
    return publicError("Фото слишком большое (макс. 8 МБ)", 400);
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return publicError("Некорректные координаты", 400);
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return publicError("Координаты вне допустимого диапазона", 400);
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return publicError("Не удалось подключиться к Supabase", 503);
  }

  const reportId = crypto.randomUUID();
  const ext = photo.type.includes("png") ? "png" : "jpg";
  const storagePath = `${reportId}.${ext}`;

  const buffer = Buffer.from(await photo.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: photo.type || "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    console.error("[reports POST] upload", uploadError);
    return publicError(
      "Не удалось загрузить фото",
      500,
      uploadError.message,
    );
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  const photoUrl = publicUrlData.publicUrl;

  const { data, error: insertError } = await supabase
    .from("reports")
    .insert({
      id: reportId,
      lat,
      lng,
      photo_url: photoUrl,
      notes,
      status: "verified",
      ai_verified: false,
      ai_confidence: null,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[reports POST] insert", insertError);
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return publicError(
      "Не удалось сохранить заявку",
      500,
      insertError.message,
    );
  }

  return NextResponse.json({ id: data.id });
}
