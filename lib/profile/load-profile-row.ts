import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileLocale, VolunteerStatus } from "@/types/profile";

export type ProfileCoreRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
};

export type ProfileSettingsRow = {
  locale: ProfileLocale;
  notifications_enabled: boolean;
  volunteer_status: VolunteerStatus;
};

/** Те же поля, что и в рейтинге — без колонок из 011, которые могут ещё не быть в БД */
export async function loadProfileCore(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileCoreRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, xp")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[profile] loadProfileCore", error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id as string,
    display_name: data.display_name as string | null,
    avatar_url: data.avatar_url as string | null,
    xp: Math.max(0, (data.xp as number) ?? 0),
  };
}

export async function loadProfileSettings(
  authClient: SupabaseClient,
  userId: string,
): Promise<ProfileSettingsRow> {
  const defaults: ProfileSettingsRow = {
    locale: "ru",
    notifications_enabled: true,
    volunteer_status: "none",
  };

  const { data, error } = await authClient
    .from("profiles")
    .select("locale, notifications_enabled, volunteer_status")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[profile] settings columns missing?", error.message);
    return defaults;
  }

  if (!data) return defaults;

  const locale = data.locale as string;
  const volunteer = data.volunteer_status as string;

  return {
    locale:
      locale === "kk" || locale === "en" ? locale : ("ru" as ProfileLocale),
    notifications_enabled:
      (data.notifications_enabled as boolean | undefined) ?? true,
    volunteer_status:
      volunteer === "pending" ||
      volunteer === "approved" ||
      volunteer === "rejected"
        ? volunteer
        : "none",
  };
}
