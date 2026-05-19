import { createClient } from "@supabase/supabase-js";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";
import { normalizeSupabaseUrl } from "@/lib/supabase/normalize-url";

export function createSupabaseAdminClient() {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
