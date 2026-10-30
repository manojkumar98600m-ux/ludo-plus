import express from "express";
import cors from "cors";
import { randomBytes, randomInt } from "node:crypto";

const app = express();
const port = Number(process.env.PORT || 3000);
app.use(cors());
app.use(express.json({ limit: "140mb" }));

type RoomPlayer = { playerId: string; displayName: string; color: string; joinedAt: number; lastSeenAt?: number };
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
const SUPABASE_URL = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
async function dbRequest(table: string, query: string, method = "GET", body?: unknown) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "return=representation"
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Supabase ${table} request failed (${response.status}): ${detail.slice(0, 250)}`);
  }
  if (response.status === 204) return [];
  return response.json();
}
function dbReady() { return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY); }


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
async function loadRoom(code: string): Promise<Room | undefined> {
  if (!dbReady()) return rooms.get(code);
  const rows = await dbRequest("ludo_rooms", "?room_code=eq." + encodeURIComponent(code) + "&select=room_code,host_id,status,players,created_at,game&limit=1") as any[];
  const row = rows[0]; if (!row) return undefined;
  return { code: row.room_code, hostId: row.host_id, status: row.status, players: row.players, createdAt: Number(row.created_at), game: row.game };
}
async function saveRoom(room: Room, insert = false) {
  if (!dbReady()) { rooms.set(room.code, room); return; }
  const row = { room_code: room.code, host_id: room.hostId, status: room.status, players: room.players, created_at: room.createdAt, game: room.game };
  await dbRequest("ludo_rooms", insert ? "" : "?room_code=eq." + encodeURIComponent(room.code), insert ? "POST" : "PATCH", row);
}
app.post("/api/ludo/rooms", async (req, res) => {
  const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim().slice(0, 24) : "";
  const playerId = typeof req.body?.playerId === "string" ? req.body.playerId.trim().slice(0, 64) : "";
  if (!displayName || !playerId) return res.status(400).json({ error: "displayName and playerId are required." });
  const now = Date.now(); const code = makeRoomCode();
  const room: Room = { code, hostId: playerId, status: "waiting", createdAt: now, players: [{ playerId, displayName, color: COLORS[0], joinedAt: now }], game: { positions: Array.from({ length: 4 }, () => [-1, -1, -1, -1]), turn: 0, dice: null, winner: null, revision: 0, updatedAt: now } };
  try { await saveRoom(room, true); return res.status(201).json({ room: publicRoom(room), host: true }); }
  catch { return res.status(503).json({ error: "Room save failed. Check ludo_rooms Supabase table and backend keys." }); }
});
app.post("/api/ludo/rooms/:roomCode/join", async (req, res) => {
  const code = String(req.params.roomCode || "").trim().toUpperCase();
  const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim().slice(0, 24) : "";
  const playerId = typeof req.body?.playerId === "string" ? req.body.playerId.trim().slice(0, 64) : "";
  if (!displayName || !playerId) return res.status(400).json({ error: "displayName and playerId are required." });
  try { const room = await loadRoom(code); if (!room) return res.status(404).json({ error: "Room not found." });
    if (room.players.some(p => p.playerId === playerId)) return res.json({ room: publicRoom(room), host: room.hostId === playerId });
    if (room.players.length >= 4) return res.status(409).json({ error: "Room is full." });
    if (room.status !== "waiting") return res.status(409).json({ error: "Game has already started." });
    room.players.push({ playerId, displayName, color: COLORS[room.players.length], joinedAt: Date.now() }); await saveRoom(room);
    return res.status(200).json({ room: publicRoom(room), host: false });
  } catch { return res.status(503).json({ error: "Room database is temporarily unavailable." }); }
});
app.post("/api/ludo/rooms/:roomCode/heartbeat", async (req, res) => {
  try { const code = String(req.params.roomCode || "").trim().toUpperCase(); const room = await loadRoom(code);
    if (!room) return res.status(404).json({ error: "Room not found." });
    const playerId = typeof req.body?.playerId === "string" ? req.body.playerId : "";
    const player = room.players.find(p => p.playerId === playerId);
    if (!player) return res.status(403).json({ error: "Player is not in this room." });
    player.lastSeenAt = Date.now(); await saveRoom(room); return res.json({ ok: true, lastSeenAt: player.lastSeenAt });
  } catch { return res.status(503).json({ error: "Heartbeat failed." }); }
});\napp.get("/api/ludo/rooms/:roomCode", async (req, res) => {
  try { const room = await loadRoom(String(req.params.roomCode || "").trim().toUpperCase());
    if (!room) return res.status(404).json({ error: "Room not found." }); return res.json({ room: publicRoom(room) });
  } catch { return res.status(503).json({ error: "Room database is temporarily unavailable." }); }
});
function samePositions(a: number[][], b: unknown): boolean {
  return Array.isArray(b) && b.length === 4 && a.every((row, i) => Array.isArray(b[i]) && row.length === 4 && row.every((v, j) => v === b[i][j]));
}
function nextRoomTurn(room: Room, current: number) { return (current + 1) % Math.max(2, room.players.length); }
function validMoveTransition(room: Room, positions: number[][], turn: number, dice: number | null, winner: number | null): boolean {
  const old = room.game;
  if (old.winner !== null) return false;
  // A roll must not alter pieces, turn or winner.
  if (old.dice === null && dice !== null) return samePositions(old.positions, positions) && turn === old.turn && winner === old.winner;
  // A move/skip must consume the previous roll.
  if (old.dice === null || dice !== null) return false;
  const changed: { player: number; token: number }[] = [];
  for (let p = 0; p < 4; p++) for (let t = 0; t < 4; t++) if (old.positions[p][t] !== positions[p][t]) changed.push({ player: p, token: t });
  const roll = old.dice;
  if (changed.length === 0) {
    const canMove = old.positions[old.turn].some(pos => pos === -1 ? roll === 6 : pos >= 0 && pos + roll <= 57);
    return !canMove && turn === nextRoomTurn(room, old.turn) && winner === null;
  }
  if (changed.some(x => x.player !== old.turn)) return false;
  if (changed.length !== 1) return false;
  const { token } = changed[0];
  const from = old.positions[old.turn][token];
  const to = positions[old.turn][token];
  const expected = from === -1 ? (roll === 6 ? 0 : -99) : from + roll;
  if (to !== expected || to > 57) return false;
  // Other players may only have tokens sent home by a legal capture.
  const expectedBoard = old.positions.map(row => [...row]);
  expectedBoard[old.turn][token] = to;
  if (to < 51) {
    const landing = ([0, 13, 26, 39][old.turn] + to) % 52;
    if (![0,8,13,21,26,34,39,47].includes(landing)) {
      for (let p = 0; p < 4; p++) if (p !== old.turn) for (let t = 0; t < 4; t++) {
        const pos = expectedBoard[p][t];
        if (pos >= 0 && pos < 51 && ([0,13,26,39][p] + pos) % 52 === landing) expectedBoard[p][t] = -1;
      }
    }
  }
  if (!samePositions(expectedBoard, positions)) return false;
  const won = positions[old.turn].every(pos => pos === 57);
  if ((winner === old.turn) !== won) return false;
  const expectedTurn = won || roll === 6 ? old.turn : nextRoomTurn(room, old.turn);
  return turn === expectedTurn;
}

app.post("/api/ludo/rooms/:roomCode/roll", async (req, res) => {
  try {
    const code = String(req.params.roomCode || "").trim().toUpperCase();
    const room = await loadRoom(code);
    if (!room) return res.status(404).json({ error: "Room not found." });
    const playerId = typeof req.body?.playerId === "string" ? req.body.playerId : "";
    if (room.players.length < 2) return res.status(409).json({ error: "At least 2 players are required to start." });
    if (!room.players[room.game.turn] || room.players[room.game.turn].playerId !== playerId) return res.status(403).json({ error: "It is not your turn." });
    if (room.game.winner !== null || room.game.dice !== null) return res.status(409).json({ error: "Dice is already rolled or game is over.", room: publicRoom(room) });
    room.game = { ...room.game, dice: randomInt(1, 7), revision: room.game.revision + 1, updatedAt: Date.now() };
    room.status = "playing";
    await saveRoom(room);
    return res.json({ room: publicRoom(room) });
  } catch { return res.status(503).json({ error: "Dice roll failed. Check server/database connection." }); }
});

app.put("/api/ludo/rooms/:roomCode/state", async (req, res) => {
  try { const room = await loadRoom(String(req.params.roomCode || "").trim().toUpperCase());
    if (!room) return res.status(404).json({ error: "Room not found." });
    const playerId = typeof req.body?.playerId === "string" ? req.body.playerId : "";
    if (!room.players.some(p => p.playerId === playerId)) return res.status(403).json({ error: "You are not a member of this room." });
    const activePlayer = room.players[room.game.turn];
    if (!activePlayer || activePlayer.playerId !== playerId) return res.status(403).json({ error: "It is not your turn." });
    const positions = req.body?.positions, turn = req.body?.turn, dice = req.body?.dice, winner = req.body?.winner;
    if (!Array.isArray(positions) || positions.length !== 4 || positions.some((row: unknown) => !Array.isArray(row) || row.length !== 4 || row.some((v: unknown) => !Number.isInteger(v) || (v as number) < -1 || (v as number) > 57))) return res.status(400).json({ error: "Invalid token positions." });
    if (!Number.isInteger(turn) || turn < 0 || turn > 3 || !(dice === null || (Number.isInteger(dice) && dice >= 1 && dice <= 6)) || !(winner === null || (Number.isInteger(winner) && winner >= 0 && winner <= 3))) return res.status(400).json({ error: "Invalid game turn, dice or winner." });
    if (!validMoveTransition(room, positions, turn, dice, winner)) return res.status(400).json({ error: "Illegal Ludo move or game-state transition." });
    const expectedRevision = Number(req.body?.revision);
    if (Number.isInteger(expectedRevision) && expectedRevision !== room.game.revision) return res.status(409).json({ error: "Game state changed. Refresh the room and try again.", room: publicRoom(room) });
    room.game = { positions, turn, dice, winner, revision: room.game.revision + 1, updatedAt: Date.now() }; room.status = "playing"; await saveRoom(room);
    return res.json({ room: publicRoom(room) });
  } catch { return res.status(503).json({ error: "Game state could not be saved. Check Supabase configuration." }); }
});
app.get("/api/chat/messages", async (req, res) => {
  const after = Number(req.query.after || 0);
  try {
    if (dbReady()) {
      const rows = await dbRequest("chat_messages", `?select=id,player_id,display_name,message_text,created_at&created_at=gt.${Math.max(0, after)}&order=created_at.desc&limit=100`) as any[];
      return res.json({ messages: rows.reverse().map(r => ({ id: r.id, playerId: r.player_id, displayName: r.display_name, text: r.message_text, createdAt: Number(r.created_at) })) });
    }
    return res.json({ messages: chatMessages.filter(m => m.createdAt > after).slice(-100) });
  } catch { return res.status(503).json({ error: "Chat database is temporarily unavailable." }); }
});
app.post("/api/chat/messages", async (req, res) => {
  const playerId = typeof req.body?.playerId === "string" ? req.body.playerId.slice(0,64) : "";
  const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim().slice(0,24) : "";
  const text = typeof req.body?.text === "string" ? req.body.text.trim().slice(0,1000) : "";
  if (!playerId || !displayName || !text) return res.status(400).json({ error: "Name and message are required." });
  const message: ChatMessage = { id: randomBytes(12).toString("hex"), playerId, displayName, text, createdAt: Date.now() };
  try {
    if (dbReady()) await dbRequest("chat_messages", "", "POST", { id: message.id, player_id: playerId, display_name: displayName, message_text: text, created_at: message.createdAt });
    else { chatMessages.push(message); if (chatMessages.length > 500) chatMessages.splice(0, chatMessages.length - 500); }
    return res.status(201).json({ message });
  } catch { return res.status(503).json({ error: "Message could not be saved. Check Supabase configuration." }); }
});

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

app.post("/api/uploads/video", async (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ error: "Video storage is not configured yet. Configure Supabase Storage first." });
  const dataUrl = typeof req.body?.dataUrl === "string" ? req.body.dataUrl : "";
  const contentType = typeof req.body?.contentType === "string" ? req.body.contentType : "";
  const extensions: Record<string,string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
  if (!extensions[contentType]) return res.status(400).json({ error: "Choose an MP4, WebM, or MOV video." });
  const match = dataUrl.match(/^data:video\/(?:mp4|webm|quicktime);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return res.status(400).json({ error: "Video data is invalid." });
  const bytes = Buffer.from(match[1], "base64");
  if (!bytes.length || bytes.length > 100 * 1024 * 1024) return res.status(413).json({ error: "Video must be 100 MB or smaller." });
  const path = `reels/${Date.now()}-${randomBytes(8).toString("hex")}.${extensions[contentType]}`;
  try {
    const response = await fetch(`${supabaseUrl}/storage/v1/object/ludo-media/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "Content-Type": contentType, "x-upsert": "false" },
      body: bytes
    });
    if (!response.ok) return res.status(502).json({ error: "Video storage upload failed. Check Supabase bucket and server settings." });
    return res.status(201).json({ videoUrl: `${supabaseUrl}/storage/v1/object/public/ludo-media/${path}` });
  } catch { return res.status(502).json({ error: "Could not reach video storage." }); }
});

app.get("/api/posts", async (_req, res) => {
  try {
    if (dbReady()) {
      const rows = await dbRequest("feed_posts", "?select=*&order=created_at.desc&limit=100") as any[];
      return res.json({ posts: rows.map(r => ({ id:r.id, playerId:r.player_id, displayName:r.display_name, caption:r.caption || "", imageUrl:r.image_url || "", createdAt:Number(r.created_at), likes:Array.isArray(r.likes)?r.likes:[], comments:Array.isArray(r.comments)?r.comments:[] })) });
    }
    return res.json({ posts: [...feedPosts].reverse().slice(0,100) });
  } catch { return res.status(503).json({ error: "Posts database is temporarily unavailable." }); }
});
app.post("/api/posts", async (req, res) => {
  const playerId = typeof req.body?.playerId === "string" ? req.body.playerId.slice(0,64) : "";
  const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim().slice(0,24) : "";
  const caption = typeof req.body?.caption === "string" ? req.body.caption.trim().slice(0,500) : "";
  const imageUrl = typeof req.body?.imageUrl === "string" ? req.body.imageUrl.trim().slice(0,2000) : "";
  if (!playerId || !displayName || (!caption && !imageUrl)) return res.status(400).json({ error: "Name and a caption or image URL are required." });
  if (imageUrl && !imageUrl.startsWith("https://")) return res.status(400).json({ error: "Image URL must start with https://." });
  const post: FeedPost = { id: randomBytes(12).toString("hex"), playerId, displayName, caption, imageUrl, createdAt: Date.now(), likes: [], comments: [] };
  try {
    if (dbReady()) await dbRequest("feed_posts", "", "POST", { id:post.id, player_id:playerId, display_name:displayName, caption, image_url:imageUrl, created_at:post.createdAt, likes:[], comments:[] });
    else { feedPosts.push(post); if (feedPosts.length > 200) feedPosts.shift(); }
    return res.status(201).json({ post });
  } catch { return res.status(503).json({ error: "Post could not be saved. Check Supabase configuration." }); }
});
app.post("/api/posts/:postId/like", async (req, res) => {
  const playerId = typeof req.body?.playerId === "string" ? req.body.playerId.slice(0,64) : "";
  if (!playerId) return res.status(400).json({ error: "Player ID required." });
  try {
    if (dbReady()) {
      const rows = await dbRequest("feed_posts", `?id=eq.${encodeURIComponent(req.params.postId)}&select=*`) as any[];
      const row = rows[0];
      if (!row) return res.status(404).json({ error: "Post not found." });
      const likes: string[] = Array.isArray(row.likes) ? row.likes : [];
      const updated = likes.includes(playerId) ? likes.filter(id => id !== playerId) : [...likes, playerId];
      const saved = await dbRequest("feed_posts", `?id=eq.${encodeURIComponent(req.params.postId)}&select=*`, "PATCH", { likes: updated }) as any[];
      const r = saved[0] || { ...row, likes: updated };
      return res.json({ post: { id:r.id, playerId:r.player_id, displayName:r.display_name, caption:r.caption || "", imageUrl:r.image_url || "", createdAt:Number(r.created_at), likes:Array.isArray(r.likes)?r.likes:updated, comments:Array.isArray(r.comments)?r.comments:[] } });
    }
    const post = feedPosts.find(p => p.id === req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found." });
    post.likes = post.likes.includes(playerId) ? post.likes.filter(id => id !== playerId) : [...post.likes, playerId];
    return res.json({ post });
  } catch { return res.status(503).json({ error: "Post like could not be saved." }); }
});
app.post("/api/posts/:postId/comments", async (req, res) => {
  const playerId = typeof req.body?.playerId === "string" ? req.body.playerId.slice(0,64) : "";
  const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim().slice(0,24) : "";
  const text = typeof req.body?.text === "string" ? req.body.text.trim().slice(0,300) : "";
  if (!playerId || !displayName || !text) return res.status(400).json({ error: "Name and comment required." });
  const comment = { id: randomBytes(12).toString("hex"), playerId, displayName, text, createdAt: Date.now() };
  try {
    if (dbReady()) {
      const rows = await dbRequest("feed_posts", `?id=eq.${encodeURIComponent(req.params.postId)}&select=*`) as any[];
      const row = rows[0];
      if (!row) return res.status(404).json({ error: "Post not found." });
      const comments = Array.isArray(row.comments) ? row.comments : [];
      const updated = [...comments, comment].slice(-100);
      const saved = await dbRequest("feed_posts", `?id=eq.${encodeURIComponent(req.params.postId)}&select=*`, "PATCH", { comments: updated }) as any[];
      const r = saved[0] || { ...row, comments: updated };
      return res.status(201).json({ post: { id:r.id, playerId:r.player_id, displayName:r.display_name, caption:r.caption || "", imageUrl:r.image_url || "", createdAt:Number(r.created_at), likes:Array.isArray(r.likes)?r.likes:[], comments:Array.isArray(r.comments)?r.comments:updated } });
    }
    const post = feedPosts.find(p => p.id === req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found." });
    post.comments.push(comment);
    if (post.comments.length > 100) post.comments.shift();
    return res.status(201).json({ post });
  } catch { return res.status(503).json({ error: "Comment could not be saved." }); }
});
app.get("/api/reels", async (_req, res) => {
  try {
    if (dbReady()) {
      const rows = await dbRequest("reels", "?select=*&order=created_at.desc&limit=100") as any[];
      return res.json({ reels: rows.map(r => ({ id:r.id, playerId:r.player_id, displayName:r.display_name, caption:r.caption || "", videoUrl:r.video_url, createdAt:Number(r.created_at), likes:Array.isArray(r.likes)?r.likes:[] })) });
    }
    return res.json({ reels: [...reels].reverse().slice(0,100) });
  } catch { return res.status(503).json({ error: "Reels database is temporarily unavailable." }); }
});
app.post("/api/reels", async (req, res) => {
  const playerId = typeof req.body?.playerId === "string" ? req.body.playerId.trim().slice(0,64) : "";
  const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim().slice(0,24) : "";
  const caption = typeof req.body?.caption === "string" ? req.body.caption.trim().slice(0,300) : "";
  const videoUrl = typeof req.body?.videoUrl === "string" ? req.body.videoUrl.trim().slice(0,2000) : "";
  if (!playerId || !displayName || !videoUrl) return res.status(400).json({ error: "Name and video URL are required." });
  try { const url = new URL(videoUrl); if (url.protocol !== "https:") throw new Error("https required"); }
  catch { return res.status(400).json({ error: "Video URL must be a valid https:// link." }); }
  const reel: Reel = { id: randomBytes(12).toString("hex"), playerId, displayName, caption, videoUrl, createdAt: Date.now(), likes: [] };
  try {
    if (dbReady()) await dbRequest("reels", "", "POST", { id:reel.id, player_id:playerId, display_name:displayName, caption, video_url:videoUrl, created_at:reel.createdAt, likes:[] });
    else { reels.push(reel); if (reels.length > 200) reels.shift(); }
    return res.status(201).json({ reel });
  } catch { return res.status(503).json({ error: "Reel could not be saved. Check Supabase configuration." }); }
});
app.post("/api/reels/:reelId/like", async (req, res) => {
  const playerId = typeof req.body?.playerId === "string" ? req.body.playerId.trim().slice(0,64) : "";
  if (!playerId) return res.status(400).json({ error: "Player ID required." });
  try {
    if (dbReady()) {
      const rows = await dbRequest("reels", `?id=eq.${encodeURIComponent(req.params.reelId)}&select=*`) as any[];
      const row = rows[0];
      if (!row) return res.status(404).json({ error: "Reel not found." });
      const likes: string[] = Array.isArray(row.likes) ? row.likes : [];
      const updated = likes.includes(playerId) ? likes.filter(id => id !== playerId) : [...likes, playerId];
      const saved = await dbRequest("reels", `?id=eq.${encodeURIComponent(req.params.reelId)}&select=*`, "PATCH", { likes: updated }) as any[];
      const r = saved[0] || { ...row, likes: updated };
      return res.json({ reel: { id:r.id, playerId:r.player_id, displayName:r.display_name, caption:r.caption || "", videoUrl:r.video_url, createdAt:Number(r.created_at), likes:Array.isArray(r.likes)?r.likes:updated } });
    }
    const reel = reels.find(item => item.id === req.params.reelId);
    if (!reel) return res.status(404).json({ error: "Reel not found." });
    reel.likes = reel.likes.includes(playerId) ? reel.likes.filter(id => id !== playerId) : [...reel.likes, playerId];
    return res.json({ reel });
  } catch { return res.status(503).json({ error: "Reel like could not be saved." }); }
});

app.listen(port, "0.0.0.0", () => console.log(`LUDO PLUS API listening on ${port}`));
