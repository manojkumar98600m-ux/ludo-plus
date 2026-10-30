import express from "express";
import cors from "cors";
import { randomBytes } from "node:crypto";

const app = express();
const port = Number(process.env.PORT || 3000);
app.use(cors());
app.use(express.json({ limit: "8mb" }));

type RoomPlayer = { playerId: string; displayName: string; color: string; joinedAt: number };
type GameSnapshot = { positions: number[][]; turn: number; dice: number | null; winner: number | null; revision: number; updatedAt: number };
type Room = { code: string; hostId: string; status: "waiting" | "playing"; players: RoomPlayer[]; createdAt: number; game: GameSnapshot };
const rooms = new Map<string, Room>();
type ChatMessage = { id: string; playerId: string; displayName: string; text: string; createdAt: number };
const chatMessages: ChatMessage[] = [];
type FeedPost = { id: string; playerId: string; displayName: string; caption: string; imageUrl: string; createdAt: number; likes: string[]; comments: { id: string; playerId: string; displayName: string; text: string; createdAt: number }[] };
const feedPosts: FeedPost[] = [];
type Reel = { id: string; playerId: string; displayName: string; caption: string; videoUrl: string; createdAt: number; likes: string[] };
const reels: Reel[] = [];
const COLORS = ["red", "green", "yellow", "blue"];
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;

function cleanExpiredRooms() {
  const cutoff = Date.now() - ROOM_TTL_MS;
  for (const [code, room] of rooms) if (room.createdAt < cutoff) rooms.delete(code);
}
function makeRoomCode() {
  let code = "";
  do { code = randomBytes(4).toString("hex").slice(0, 6).toUpperCase(); } while (rooms.has(code));
  return code;
}
function publicRoom(room: Room) {
  return { code: room.code, status: room.status, players: room.players, maxPlayers: 4, createdAt: room.createdAt, game: room.game };
}

app.get("/api/health", (_req, res) => res.json({ status: "ok", app: "LUDO PLUS" }));

app.get("/api/payment/merchant-config", (_req, res) => {
  const required = ["PHONEPE_MERCHANT_ID", "PHONEPE_SALT_KEY", "PHONEPE_SALT_INDEX"];
  const configured = required.every(key => Boolean(process.env[key]?.trim()));
  res.json({
    configured,
    paymentEnabled: false,
    status: configured ? "pending_server_side_payment_integration" : "pending_merchant_setup",
    membership: { amountRupees: 50, durationDays: 90 }
  });
});

// In-memory lobby API. A persistent database and realtime transport are still required for production play.
app.post("/api/ludo/rooms", (req, res) => {
  cleanExpiredRooms();
  const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim().slice(0, 24) : "";
  const playerId = typeof req.body?.playerId === "string" ? req.body.playerId.trim().slice(0, 64) : "";
  if (!displayName || !playerId) return res.status(400).json({ error: "displayName and playerId are required." });
  const code = makeRoomCode();
  const room: Room = {
    code, hostId: playerId, status: "waiting", createdAt: Date.now(),
    players: [{ playerId, displayName, color: COLORS[0], joinedAt: Date.now() }],
    game: { positions: Array.from({ length: 4 }, () => [-1, -1, -1, -1]), turn: 0, dice: null, winner: null, revision: 0, updatedAt: Date.now() }
  };
  rooms.set(code, room);
  return res.status(201).json({ room: publicRoom(room), host: true });
});

app.post("/api/ludo/rooms/:roomCode/join", (req, res) => {
  cleanExpiredRooms();
  const code = String(req.params.roomCode || "").trim().toUpperCase();
  const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim().slice(0, 24) : "";
  const playerId = typeof req.body?.playerId === "string" ? req.body.playerId.trim().slice(0, 64) : "";
  if (!displayName || !playerId) return res.status(400).json({ error: "displayName and playerId are required." });
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: "Room not found or server restarted." });
  if (room.players.some(player => player.playerId === playerId)) return res.json({ room: publicRoom(room), host: room.hostId === playerId });
  if (room.players.length >= 4) return res.status(409).json({ error: "Room is full." });
  if (room.status !== "waiting") return res.status(409).json({ error: "Game has already started." });
  room.players.push({ playerId, displayName, color: COLORS[room.players.length], joinedAt: Date.now() });
  return res.status(200).json({ room: publicRoom(room), host: false });
});

app.get("/api/ludo/rooms/:roomCode", (req, res) => {
  cleanExpiredRooms();
  const room = rooms.get(String(req.params.roomCode || "").trim().toUpperCase());
  if (!room) return res.status(404).json({ error: "Room not found or server restarted." });
  return res.json({ room: publicRoom(room) });
});

app.put("/api/ludo/rooms/:roomCode/state", (req, res) => {
  cleanExpiredRooms();
  const room = rooms.get(String(req.params.roomCode || "").trim().toUpperCase());
  if (!room) return res.status(404).json({ error: "Room not found or server restarted." });
  const playerId = typeof req.body?.playerId === "string" ? req.body.playerId : "";
  if (!room.players.some(player => player.playerId === playerId)) return res.status(403).json({ error: "You are not a member of this room." });
  const positions = req.body?.positions;
  const turn = req.body?.turn;
  const dice = req.body?.dice;
  const winner = req.body?.winner;
  if (!Array.isArray(positions) || positions.length !== 4 || positions.some((row: unknown) => !Array.isArray(row) || row.length !== 4 || row.some((value: unknown) => !Number.isInteger(value) || (value as number) < -1 || (value as number) > 57))) {
    return res.status(400).json({ error: "Invalid token positions." });
  }
  if (!Number.isInteger(turn) || turn < 0 || turn > 3 || !(dice === null || (Number.isInteger(dice) && dice >= 1 && dice <= 6)) || !(winner === null || (Number.isInteger(winner) && winner >= 0 && winner <= 3))) {
    return res.status(400).json({ error: "Invalid game turn, dice or winner." });
  }
  const expectedRevision = Number(req.body?.revision);
  if (Number.isInteger(expectedRevision) && expectedRevision !== room.game.revision) {
    return res.status(409).json({ error: "Game state changed. Refresh the room and try again.", room: publicRoom(room) });
  }
  room.game = { positions, turn, dice, winner, revision: room.game.revision + 1, updatedAt: Date.now() };
  room.status = "playing";
  return res.json({ room: publicRoom(room) });
});

app.get("/api/chat/messages", (req, res) => { const after = Number(req.query.after || 0); return res.json({ messages: chatMessages.filter(m => m.createdAt > after).slice(-100) }); });
app.post("/api/chat/messages", (req, res) => { const playerId = typeof req.body?.playerId === "string" ? req.body.playerId.slice(0,64) : ""; const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim().slice(0,24) : ""; const text = typeof req.body?.text === "string" ? req.body.text.trim().slice(0,1000) : ""; if (!playerId || !displayName || !text) return res.status(400).json({ error: "Name and message are required." }); const message: ChatMessage = { id: randomBytes(12).toString("hex"), playerId, displayName, text, createdAt: Date.now() }; chatMessages.push(message); if (chatMessages.length > 500) chatMessages.splice(0, chatMessages.length - 500); return res.status(201).json({ message }); });

app.post("/api/uploads/image", async (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ error: "Image storage is not configured yet. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the backend, and create a public ludo-media bucket." });
  const dataUrl = typeof req.body?.dataUrl === "string" ? req.body.dataUrl : "";
  const contentType = typeof req.body?.contentType === "string" ? req.body.contentType : "";
  if (!/^image\/(jpeg|png|webp|gif)$/.test(contentType)) return res.status(400).json({ error: "Choose a JPG, PNG, WEBP, or GIF image." });
  const match = dataUrl.match(/^data:image\/(?:jpeg|png|webp|gif);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return res.status(400).json({ error: "Image data is invalid." });
  const bytes = Buffer.from(match[1], "base64");
  if (!bytes.length || bytes.length > 4 * 1024 * 1024) return res.status(413).json({ error: "Image must be smaller than 4 MB." });
  const ext = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" } as Record<string,string>)[contentType];
  const path = `posts/${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
  try {
    const response = await fetch(`${supabaseUrl}/storage/v1/object/ludo-media/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "Content-Type": contentType, "x-upsert": "false" },
      body: bytes
    });
    if (!response.ok) return res.status(502).json({ error: "Image storage upload failed. Check Supabase bucket and server settings." });
    return res.status(201).json({ imageUrl: `${supabaseUrl}/storage/v1/object/public/ludo-media/${path}` });
  } catch { return res.status(502).json({ error: "Could not reach image storage." }); }
});

app.get("/api/posts", (_req, res) => res.json({ posts: [...feedPosts].reverse().slice(0,100) }));
app.post("/api/posts", (req, res) => { const playerId = typeof req.body?.playerId === "string" ? req.body.playerId.slice(0,64) : ""; const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim().slice(0,24) : ""; const caption = typeof req.body?.caption === "string" ? req.body.caption.trim().slice(0,500) : ""; const imageUrl = typeof req.body?.imageUrl === "string" ? req.body.imageUrl.trim().slice(0,2000) : ""; if (!playerId || !displayName || (!caption && !imageUrl)) return res.status(400).json({ error: "Name and a caption or image URL are required." }); if (imageUrl && !imageUrl.startsWith("https://")) return res.status(400).json({ error: "Image URL must start with https://." }); const post: FeedPost = { id: randomBytes(12).toString("hex"), playerId, displayName, caption, imageUrl, createdAt: Date.now(), likes: [], comments: [] }; feedPosts.push(post); if (feedPosts.length > 200) feedPosts.shift(); return res.status(201).json({ post }); });
app.post("/api/posts/:postId/like", (req, res) => { const playerId = typeof req.body?.playerId === "string" ? req.body.playerId.slice(0,64) : ""; const post = feedPosts.find(p => p.id === req.params.postId); if (!post || !playerId) return res.status(!post ? 404 : 400).json({ error: !post ? "Post not found." : "Player ID required." }); post.likes = post.likes.includes(playerId) ? post.likes.filter(id => id !== playerId) : [...post.likes, playerId]; return res.json({ post }); });
app.post("/api/posts/:postId/comments", (req, res) => { const playerId = typeof req.body?.playerId === "string" ? req.body.playerId.slice(0,64) : ""; const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim().slice(0,24) : ""; const text = typeof req.body?.text === "string" ? req.body.text.trim().slice(0,300) : ""; const post = feedPosts.find(p => p.id === req.params.postId); if (!post || !playerId || !displayName || !text) return res.status(!post ? 404 : 400).json({ error: !post ? "Post not found." : "Name and comment required." }); post.comments.push({ id: randomBytes(12).toString("hex"), playerId, displayName, text, createdAt: Date.now() }); if (post.comments.length > 100) post.comments.shift(); return res.status(201).json({ post }); });
app.get("/api/reels", (_req, res) => res.json({ reels: [...reels].reverse().slice(0,100) }));
app.post("/api/reels", (req, res) => {
  const playerId = typeof req.body?.playerId === "string" ? req.body.playerId.trim().slice(0,64) : "";
  const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim().slice(0,24) : "";
  const caption = typeof req.body?.caption === "string" ? req.body.caption.trim().slice(0,300) : "";
  const videoUrl = typeof req.body?.videoUrl === "string" ? req.body.videoUrl.trim().slice(0,2000) : "";
  if (!playerId || !displayName || !videoUrl) return res.status(400).json({ error: "Name and video URL are required." });
  try { const url = new URL(videoUrl); if (url.protocol !== "https:") throw new Error("https required"); }
  catch { return res.status(400).json({ error: "Video URL must be a valid https:// link." }); }
  const reel: Reel = { id: randomBytes(12).toString("hex"), playerId, displayName, caption, videoUrl, createdAt: Date.now(), likes: [] };
  reels.push(reel); if (reels.length > 200) reels.shift();
  return res.status(201).json({ reel });
});
app.post("/api/reels/:reelId/like", (req, res) => {
  const playerId = typeof req.body?.playerId === "string" ? req.body.playerId.trim().slice(0,64) : "";
  const reel = reels.find(item => item.id === req.params.reelId);
  if (!reel || !playerId) return res.status(!reel ? 404 : 400).json({ error: !reel ? "Reel not found." : "Player ID required." });
  reel.likes = reel.likes.includes(playerId) ? reel.likes.filter(id => id !== playerId) : [...reel.likes, playerId];
  return res.json({ reel });
});

app.listen(port, "0.0.0.0", () => console.log(`LUDO PLUS API listening on ${port}`));
