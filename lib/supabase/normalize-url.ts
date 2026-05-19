/** Project URL без /rest/v1 и без слэша в конце */
export function normalizeSupabaseUrl(url: string): string {
  let normalized = url.trim().replace(/^["']|["']$/g, "");
  normalized = normalized.replace(/\/rest\/v1\/?$/i, "");
  normalized = normalized.replace(/\/+$/, "");
  return normalized;
}

function hasRootPathOnly(pathname: string): boolean {
  return pathname === "" || pathname === "/";
}

export function isValidSupabaseProjectUrl(url: string): boolean {
  try {
    const parsed = new URL(normalizeSupabaseUrl(url));
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(".supabase.co") &&
      hasRootPathOnly(parsed.pathname)
    );
  } catch {
    return false;
  }
}
