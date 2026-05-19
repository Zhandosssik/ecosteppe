import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { normalizeSupabaseUrl } from "@/lib/supabase/normalize-url";

export function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();

  return createClient(url, key);
}
