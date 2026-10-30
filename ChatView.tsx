import { useEffect, useState } from "react";
import { api, getPlayerId, type ChatMessage } from "./api";

export default function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState(() => localStorage.getItem("ludo-plus-chat-name") || "Player");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [lastMessageAt, setLastMessageAt] = useState(0);
  useEffect(() => {
    let active = true;
    const refresh = async () => { try { const result = await api.getChatMessages(lastMessageAt); if (active && result.messages.length) { setMessages(old => [...old, ...result.messages].filter((m, i, all) => all.findIndex(x => x.id === m.id) === i).slice(-100)); setLastMessageAt(Math.max(lastMessageAt, ...result.messages.map(m => m.createdAt))); setError(""); } } catch { if (active) setError("Chat server connect नहीं हुआ।"); } };
    void refresh(); const timer = window.setInterval(refresh, 2500);
    return () => { active = false; window.clearInterval(timer); };
  }, [lastMessageAt]);
  async function send() {
    const text = draft.trim(), displayName = name.trim().slice(0,24);
    if (!text || !displayName || sending) return;
    setSending(true); setError(""); localStorage.setItem("ludo-plus-chat-name", displayName);
    try { const result = await api.sendChatMessage(displayName, text); setMessages(old => [...old.filter(m => m.id !== result.message.id), result.message].slice(-100)); setLastMessageAt(old => Math.max(old, result.message.createdAt)); setDraft(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Message भेजा नहीं जा सका।"); }
    finally { setSending(false); }
  }
  const ownId = getPlayerId();
  return <section className="panel"><span className="eyebrow">CONNECT</span><h2>Community chat</h2>
    <label className="chat-name-label">Your display name<input value={name} maxLength={24} onChange={e => setName(e.target.value)} placeholder="Your name" /></label>
    <div className="chat-box" aria-live="polite">{messages.length === 0 && <p className="muted small">अभी कोई message नहीं है। सबसे पहले hello कहें 👋</p>}
      {messages.map(m => <div className={m.playerId === ownId ? "chat-message chat-message-own" : "chat-message"} key={m.id}><b>{m.playerId === ownId ? "You" : m.displayName}</b><div className="chat-bubble">{m.text}</div><time>{new Date(m.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</time></div>)}
    </div>
    <div className="chat-compose"><input value={draft} maxLength={1000} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="Write a message…" /><button className="primary-btn" onClick={() => void send()} disabled={sending || !draft.trim() || !name.trim()}>{sending ? "Sending…" : "Send"}</button></div>
    {error && <p className="muted small" role="status">{error}</p>}<p className="muted small">Messages are stored in Supabase when the backend database settings are configured; otherwise they are temporary. Avoid sharing private information.</p>
  </section>;
}