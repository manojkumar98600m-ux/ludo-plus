export type AuthUser = { id: string; name: string };
const KEY = "ludo_plus_demo_user";
export function getCurrentUser(): AuthUser | null {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) as AuthUser : null; }
  catch { return null; }
}
export function saveSession(user: AuthUser) { localStorage.setItem(KEY, JSON.stringify(user)); }
export function clearSession() { localStorage.removeItem(KEY); }