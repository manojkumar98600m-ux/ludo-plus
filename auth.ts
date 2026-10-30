export type AuthUser = { id: string; email: string; accessToken: string };
const SESSION_KEY = "ludo_plus_auth_session";
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export function getCurrentUser(): AuthUser | null {
  try { const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) as AuthUser : null; }
  catch { return null; }
}
export function clearSession() { localStorage.removeItem(SESSION_KEY); }
export function authConfigured() { return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY); }

async function authRequest(path: string, email: string, password: string) {
  if (!authConfigured()) throw new Error("Supabase Auth setup pending: Render/Vercel frontend env में VITE_SUPABASE_URL और VITE_SUPABASE_ANON_KEY जोड़ें।");
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email: email.trim(), password })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || data.error || "Authentication failed.");
  if (!data.access_token || !data.user?.id) throw new Error("Email confirmation may be required. Check your inbox.");
  const user: AuthUser = { id: data.user.id, email: data.user.email || email.trim(), accessToken: data.access_token };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}
export const signIn = (email: string, password: string) => authRequest("token?grant_type=password", email, password);
export const signUp = (email: string, password: string) => authRequest("signup", email, password);

export async function updateUserProfile(user: AuthUser, profile: { displayName: string; bio: string }) {
  if (!authConfigured()) throw new Error("Supabase Auth setup pending.");
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${user.accessToken}` },
    body: JSON.stringify({ data: { display_name: profile.displayName.trim().slice(0,40), bio: profile.bio.trim().slice(0,160) } })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || "Profile could not be saved.");
  return { displayName: data.user_metadata?.display_name || profile.displayName, bio: data.user_metadata?.bio || profile.bio };
}
