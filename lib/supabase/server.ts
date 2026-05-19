import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { normalizeSupabaseUrl } from "@/lib/supabase/normalize-url";

/** Anon client without cookies — для публичных API (nearby и т.п.). */
export function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();

  return createClient(url, key);
}

/** Клиент с сессией пользователя из cookies (Route Handlers, Server Components). */
export async function createSupabaseAuthServerClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll вызывается из Server Component — cookies read-only
        }
      },
    },
  });
}
