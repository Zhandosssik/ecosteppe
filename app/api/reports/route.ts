import { NextResponse } from "next/server";
import { fetchImageBuffer } from "@/lib/ai/fetch-image-buffer";
import {
  getCleanupLocationSimilarityMin,
  getTrashConfidenceThreshold,
  isGroqConfigured,
} from "@/lib/ai/env";
import {
  verifyCleanupPair,
  verifyCleanupPhoto,
  verifyTrashPhoto,
} from "@/lib/ai/verify-trash";
import { completedRetentionCutoffIso } from "@/lib/reports/completed-retention";
import { isPublicZoneReport } from "@/lib/reports/is-cleanup-proof";
import { withDistanceSorted } from "@/lib/reports/sort-by-distance";
import type { ReportsListScope } from "@/types/report";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createSupabaseAuthServerClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/supabase/env";
import { isValidSupabaseProjectUrl } from "@/lib/supabase/normalize-url";
import type { ReportStatus } from "@/types/report";

const BUCKET = "report-photos";
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

function publicError(message: string, status: number, detail?: string) {
  const body: { error: string; detail?: string } = { error: message };
  if (process.env.NODE_ENV === "development" && detail) {
    body.detail = detail;
  }
  return NextResponse.json(body, { status });
}

const REPORT_SELECT =
  "id, user_id, lat, lng, photo_url, ai_verified, ai_confidence, status, notes, created_at, cleaned_at, cleanup_photo_url";

function parseListScope(raw: string | null): ReportsListScope {
  return raw === "completed" ? "completed" : "active";
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
  const scope = parseListScope(searchParams.get("scope"));
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const lat =
    latParam !== null ? Number.parseFloat(latParam) : Number.NaN;
  const lng =
    lngParam !== null ? Number.parseFloat(lngParam) : Number.NaN;
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return publicError("Не удалось подключиться к Supabase", 503);
  }

  let query = supabase
    .from("reports")
    .select(REPORT_SELECT)
    .eq("status", "verified");

  if (scope === "active") {
    query = query.is("cleaned_at", null);
  } else {
    query = query
      .not("cleaned_at", "is", null)
      .gte("cleaned_at", completedRetentionCutoffIso());
  }

  if (!hasGeo) {
    const orderColumn = scope === "completed" ? "cleaned_at" : "created_at";
    query = query.order(orderColumn, { ascending: false }).limit(100);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[reports GET]", error);
    return publicError("Ошибка загрузки заявок", 500, error.message);
  }

  const rows = (data ?? []).filter(isPublicZoneReport);

  if (hasGeo) {
    const sorted = withDistanceSorted(rows, lat, lng);
    if (scope === "completed") {
      sorted.sort(
        (a, b) =>
          new Date(b.cleaned_at ?? 0).getTime() -
          new Date(a.cleaned_at ?? 0).getTime(),
      );
    }
    return NextResponse.json({ reports: sorted });
  }

  const reports = [...rows].sort((a, b) => {
    const aTime =
      scope === "completed"
        ? new Date(a.cleaned_at ?? 0).getTime()
        : new Date(a.created_at).getTime();
    const bTime =
      scope === "completed"
        ? new Date(b.cleaned_at ?? 0).getTime()
        : new Date(b.created_at).getTime();
    return bTime - aTime;
  });

  return NextResponse.json({ reports });
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
  const cleanupOfRaw = formData.get("cleanup_of");
  const cleanupOf =
    typeof cleanupOfRaw === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      cleanupOfRaw.trim(),
    )
      ? cleanupOfRaw.trim()
      : null;
  const isCleanupReport = cleanupOf !== null;
  let notes =
    typeof notesRaw === "string" && notesRaw.trim().length > 0
      ? notesRaw.trim()
      : null;
  if (isCleanupReport && !notes) {
    notes = "Уборка завершена";
  }

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

  let cleanupBeforePhotoUrl: string | null = null;

  if (isCleanupReport) {
    const { data: original, error: originalError } = await supabase
      .from("reports")
      .select("id, cleaned_at, status, photo_url")
      .eq("id", cleanupOf!)
      .maybeSingle();

    if (originalError) {
      console.error("[reports POST] cleanup lookup", originalError);
      return publicError("Не удалось проверить заявку", 500, originalError.message);
    }

    if (!original) {
      return publicError("Исходная заявка не найдена", 404);
    }

    if (original.cleaned_at) {
      return publicError(
        "Эта зона уже убрана. Повторная уборка недоступна.",
        409,
      );
    }

    if (original.status !== "verified") {
      return publicError(
        "Уборку можно завершить только для подтверждённой заявки",
        400,
      );
    }

    cleanupBeforePhotoUrl = original.photo_url;
  }

  const reportId = crypto.randomUUID();
  const ext = photo.type.includes("png") ? "png" : "jpg";
  const storagePath = `${reportId}.${ext}`;

  const buffer = Buffer.from(await photo.arrayBuffer());
  const contentType = photo.type || "image/jpeg";

  if (isCleanupReport) {
    return completeZoneCleanup({
      supabase,
      cleanupOf: cleanupOf!,
      beforePhotoUrl: cleanupBeforePhotoUrl,
      buffer,
      contentType,
    });
  }

  let reportStatus: ReportStatus = "pending";
  let aiVerified = false;
  let aiConfidence: number | null = null;
  let userMessage: string | undefined;

  if (isGroqConfigured()) {
    const verification = await verifyTrashPhoto(buffer, contentType);

    if (verification.ok) {
      const { isTrash, isHumanMadeWaste, isNaturalObject, confidence, reason } =
        verification.result;
      aiConfidence = confidence;
      const threshold = getTrashConfidenceThreshold();

      if (isNaturalObject && !isHumanMadeWaste) {
        return publicError(
          reason ??
            "На фото похоже на природный объект (камень, галька, грунт), а не на мусор. Такую зону нельзя убрать. Сфотографируйте реальные отходы или выберите другую точку.",
          422,
        );
      }

      if (!isTrash && !isHumanMadeWaste) {
        return publicError(
          reason ??
            "На фото не обнаружен убираемый мусор. Сделайте снимок зоны с отходами.",
          422,
        );
      }

      const actionable =
        isHumanMadeWaste || (isTrash && !isNaturalObject && confidence >= threshold);

      if (actionable && confidence >= threshold) {
        reportStatus = "verified";
        aiVerified = true;
      } else if (!isTrash) {
        return publicError(
          reason ??
            "На фото не обнаружен мусор. Сделайте снимок зоны загрязнения.",
          422,
        );
      } else {
        userMessage =
          "Заявка сохранена и ожидает проверки: ИИ не уверен в наличии мусора.";
      }
    } else {
      console.error("[reports POST] AI", verification.error);
      userMessage =
        "Не удалось проверить фото автоматически. Заявка сохранена и ожидает модерации.";
    }
  } else {
    userMessage = "ИИ не настроен. Заявка сохранена и ожидает проверки.";
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType,
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

  let userId: string | null = null;
  const authClient = await createSupabaseAuthServerClient();
  if (authClient) {
    const { data: authData } = await authClient.auth.getUser();
    userId = authData.user?.id ?? null;
  }

  const { data, error: insertError } = await supabase
    .from("reports")
    .insert({
      id: reportId,
      user_id: userId,
      lat,
      lng,
      photo_url: photoUrl,
      notes,
      status: reportStatus,
      ai_verified: aiVerified,
      ai_confidence: aiConfidence,
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

  return NextResponse.json({
    id: data.id,
    status: reportStatus,
    message: userMessage,
  });
}

async function completeZoneCleanup({
  supabase,
  cleanupOf,
  beforePhotoUrl,
  buffer,
  contentType,
}: {
  supabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
  cleanupOf: string;
  beforePhotoUrl: string | null;
  buffer: Buffer;
  contentType: string;
}) {
  if (!isGroqConfigured()) {
    return publicError(
      "ИИ не настроен — нельзя подтвердить уборку автоматически.",
      503,
    );
  }

  const minSimilarity = getCleanupLocationSimilarityMin();
  let isRealOutdoor = false;
  let isClean = false;
  let reason: string | undefined;

  const beforeFetched = beforePhotoUrl
    ? await fetchImageBuffer(beforePhotoUrl)
    : null;

  if (beforeFetched) {
    const pairCheck = await verifyCleanupPair(
      beforeFetched.buffer,
      buffer,
      contentType,
      beforeFetched.contentType,
    );

    if (!pairCheck.ok) {
      console.error("[reports POST] cleanup pair AI", pairCheck.error);
      return publicError(
        pairCheck.error ??
          "Не удалось сравнить фото. Попробуйте снова через минуту.",
        pairCheck.error?.includes("429") ? 429 : 503,
      );
    }

    const r = pairCheck.result;
    isRealOutdoor = r.isRealOutdoor;
    isClean = r.isClean;
    reason = r.reason;

    if (r.onlyNaturalObject) {
      return publicError(
        r.reason ??
          "На фото «до» нет убираемого мусора — похоже на камень или природный объект. Отметьте заявку как «Это не мусор».",
        422,
      );
    }

    if (!r.sameLocation || r.locationSimilarity < minSimilarity) {
      return publicError(
        r.reason ??
          "Фото «после» не похоже на то же место, что «до». Снимите с того же ракурса и расстояния.",
        422,
      );
    }

    if (!r.isRealOutdoor) {
      return publicError(
        r.reason ??
          "Сфотографируйте реальное место на улице после уборки, а не однотонный фон.",
        422,
      );
    }

    if (!r.improvementDetected && !r.isClean) {
      return publicError(
        r.reason ??
          "ИИ не видит, что место стало чище по сравнению с фото «до». Уберите мусор и сфотографируйте снова.",
        422,
      );
    }

    if (!r.isClean) {
      return publicError(
        r.reason ??
          "На фото всё ещё виден мусор. Уберите основную часть отходов и сфотографируйте снова.",
        422,
      );
    }
  } else {
    const verification = await verifyCleanupPhoto(buffer, contentType);

    if (!verification.ok) {
      console.error("[reports POST] cleanup AI", verification.error);
      return publicError(
        verification.error ??
          "Не удалось проверить фото. Попробуйте снова через минуту.",
        verification.error?.includes("429") ? 429 : 503,
      );
    }

    isRealOutdoor = verification.result.isRealOutdoor;
    isClean = verification.result.isClean;
    reason = verification.result.reason;

    if (!isRealOutdoor) {
      return publicError(
        reason ??
          "Сфотографируйте реальное место на улице после уборки, а не однотонный фон.",
        422,
      );
    }
    if (!isClean) {
      return publicError(
        reason ??
          "На фото всё ещё виден мусор. Уберите основную часть отходов и сфотографируйте снова.",
        422,
      );
    }
  }

  const ext = contentType.includes("png") ? "png" : "jpg";
  const storagePath = `cleanups/${cleanupOf}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    console.error("[reports POST] cleanup upload", uploadError);
    return publicError(
      "Не удалось загрузить фото",
      500,
      uploadError.message,
    );
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  const cleanedAt = new Date().toISOString();
  const { data: updated, error: markError } = await supabase
    .from("reports")
    .update({
      cleaned_at: cleanedAt,
      cleanup_photo_url: publicUrlData.publicUrl,
    })
    .eq("id", cleanupOf)
    .is("cleaned_at", null)
    .select("id")
    .maybeSingle();

  if (markError) {
    console.error("[reports POST] cleanup update", markError);
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return publicError(
      "Не удалось завершить уборку",
      500,
      markError.message,
    );
  }

  if (!updated) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return publicError(
      "Эта зона уже убрана. Повторная уборка недоступна.",
      409,
    );
  }

  return NextResponse.json({
    id: cleanupOf,
    status: "verified" satisfies ReportStatus,
    message: "Уборка подтверждена и зафиксирована",
  });
}
