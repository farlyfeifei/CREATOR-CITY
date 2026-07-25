import { supabase } from "@/lib/supabase";

const DEFAULT_DEMO_PASSWORD = "creator2026";
const GUEST_KEY = "creator-city-guest";

export function isGuestMode(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("guest") === "1") return true;
  if (params.has("creator") || params.has("username")) return false;
  return window.sessionStorage.getItem(GUEST_KEY) === "1";
}

export async function ensureCloudSessionFromUrl(): Promise<void> {
  if (!supabase || typeof window === "undefined") return;

  if (isGuestMode()) {
    window.sessionStorage.setItem(GUEST_KEY, "1");
    await supabase.auth.signOut();
    return;
  }

  window.sessionStorage.removeItem(GUEST_KEY);

  const existing = await supabase.auth.getSession();
  if (existing.data.session) return;

  const params = new URLSearchParams(window.location.search);
  const identifier = params.get("creator") || params.get("username") || "";
  if (!identifier.trim()) return;

  const email = identifier.trim().toLowerCase();
  const password = DEFAULT_DEMO_PASSWORD;
  const login = await supabase.auth.signInWithPassword({ email, password });
  if (login.error) {
    console.warn("Failed to hydrate Supabase chat session", login.error.message);
    return;
  }

  params.delete("creator");
  params.delete("username");
  const nextSearch = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`);
}
