const API_BASE_URL = (import.meta.env.VITE_API_URL || "https://ludo-plus-api.onrender.com").replace(/\/$/, "");

export type LudoRoom = {
  code: string;
  status: "waiting" | "playing";
  players: { playerId: string; displayName: string; color: string; joinedAt: number }[];
  maxPlayers: number;
  createdAt: number;
  game: { positions: number[][]; turn: number; dice: number | null; winner: number | null; revision: number; updatedAt: number };
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `Request failed: ${response.status}`);
  return data as T;
}

export function getPlayerId() {
  const key = "ludo-plus-player-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `player-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export type ChatMessage = { id: string; playerId: string; displayName: string; text: string; createdAt: number };

export type FeedComment = { id: string; playerId: string; displayName: string; text: string; createdAt: number };
export type FeedPost = { id: string; playerId: string; displayName: string; caption: string; imageUrl: string; createdAt: number; likes: string[]; comments: FeedComment[] };

export const api = {
  getPosts: () => request<{ posts: FeedPost[] }>("/api/posts"),
  createPost: (displayName: string, caption: string, imageUrl: string) => request<{ post: FeedPost }>("/api/posts", { method: "POST", body: JSON.stringify({ displayName, caption, imageUrl, playerId: getPlayerId() }) }),
  togglePostLike: (postId: string) => request<{ post: FeedPost }>(`/api/posts/${encodeURIComponent(postId)}/like`, { method: "POST", body: JSON.stringify({ playerId: getPlayerId() }) }),
  commentOnPost: (postId: string, displayName: string, text: string) => request<{ post: FeedPost }>(`/api/posts/${encodeURIComponent(postId)}/comments`, { method: "POST", body: JSON.stringify({ playerId: getPlayerId(), displayName, text }) }),
  getChatMessages: () => request<{ messages: ChatMessage[] }>("/api/chat/messages"),
  sendChatMessage: (displayName: string, text: string) => request<{ message: ChatMessage }>("/api/chat/messages", { method: "POST", body: JSON.stringify({ displayName, text, playerId: getPlayerId() }) }),
  health: () => request<{ status: string; app: string }>("/api/health"),
  merchantConfig: () => request<{ configured: boolean; paymentEnabled: boolean; status: string }>("/api/payment/merchant-config"),
  createLudoRoom: (displayName: string) => request<{ room: LudoRoom; host: boolean }>("/api/ludo/rooms", {
    method: "POST", body: JSON.stringify({ displayName, playerId: getPlayerId() })
  }),
  joinLudoRoom: (code: string, displayName: string) => request<{ room: LudoRoom; host: boolean }>(`/api/ludo/rooms/${encodeURIComponent(code)}/join`, {
    method: "POST", body: JSON.stringify({ displayName, playerId: getPlayerId() })
  }),
  getLudoRoom: (code: string) => request<{ room: LudoRoom }>(`/api/ludo/rooms/${encodeURIComponent(code)}`),
  updateLudoRoomState: (code: string, playerId: string, state: { positions: number[][]; turn: number; dice: number | null; winner: number | null; revision: number }) => request<{ room: LudoRoom }>(`/api/ludo/rooms/${encodeURIComponent(code)}/state`, { method: "PUT", body: JSON.stringify({ ...state, playerId }) })
};
