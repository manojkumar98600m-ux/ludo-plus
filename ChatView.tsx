import { useState } from "react";
export default function ChatView() {
  const [messages, setMessages] = useState(["Welcome to LUDO PLUS chat 👋"]);
  const [draft, setDraft] = useState("");
  function send() { const value = draft.trim(); if (!value) return; setMessages([...messages, value]); setDraft(""); }
  return <section className="panel"><span className="eyebrow">CONNECT</span><h2>Chat room</h2>
    <div className="chat-box">{messages.map((m, i) => <div className="chat-bubble" key={i}>{m}</div>)}</div>
    <div className="chat-compose"><input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Write a message…" /><button className="primary-btn" onClick={send}>Send</button></div>
    <p className="muted small">Messages stay only in this browser session. Real-time private chat needs authentication and a database.</p>
  </section>;
}