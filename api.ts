const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `Request failed: ${response.status}`);
  return data as T;
}
export const api = {
  health: () => apiRequest<{ status: string }>("/api/health"),
  merchantConfig: () => apiRequest<{ configured: boolean; paymentEnabled: boolean; status: string }>("/api/payment/merchant-config")
};