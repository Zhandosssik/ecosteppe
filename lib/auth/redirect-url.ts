export function getAuthRedirectUrl(path = "/auth/callback"): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  return `${base}${path}`;
}
