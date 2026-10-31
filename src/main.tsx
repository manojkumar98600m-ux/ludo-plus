import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import LudoBoard from "../LudoBoard";
import DatingView from "../DatingView";
import ChatView from "../ChatView";
import ReelsView from "../ReelsView";
import PostsView from "../PostsView";
import MembershipModal from "../MembershipModal";
import AuthPanel from "../AuthPanel";
import "./style.css";
import "./ludo.css";

type Tab = "game" | "dating" | "reels" | "chat" | "posts";

function App() {
  const [tab, setTab] = useState<Tab>("game");
  const [membershipOpen, setMembershipOpen] = useState(false);
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "game", label: "Game", icon: "🎲" },
    { id: "dating", label: "Dating", icon: "💜" },
    { id: "reels", label: "Reels", icon: "🎬" },
    { id: "chat", label: "Chat", icon: "💬" },
    { id: "posts", label: "Posts", icon: "📸" }
  ];
  return (
    <div className="app">
      <header>
        <div className="logo">🎲 LUDO PLUS</div>
        <p>PLAY · CONNECT · SHARE</p>
      </header>
      <main>
        <AuthPanel />
        <section className="hero">
          <span className="eyebrow">YOUR SOCIAL GAMING SPACE</span>
          <h1>Game. Friends. Fun.</h1>
          <p>Play, discover and connect — all in one place.</p>
          <button className="vip-btn" onClick={() => setMembershipOpen(true)}>👑 Get VIP · ₹50 / 90 days</button>
        </section>
        <nav className="tabbar" aria-label="Main sections">
          {tabs.map(item => <button key={item.id} className={tab === item.id ? "tab active" : "tab"} onClick={() => setTab(item.id)} aria-current={tab === item.id ? "page" : undefined}>
            <span>{item.icon}</span>{item.label}
          </button>)}
        </nav>
        {tab === "game" && <><LudoBoard /><section className="notice"><b>Private rooms · Invite your friends</b><p>Create a room below, share its code, and play with up to 3 friends. Room updates sync through the API. For rooms to survive server restarts, configure the Supabase <code>ludo_rooms</code> table.</p></section></>}
        {tab === "dating" && <DatingView />}
        {tab === "reels" && <ReelsView />}
        {tab === "chat" && <ChatView />}
        {tab === "posts" && <PostsView />}
        <section className="membership">
          <div><span className="eyebrow">LUDO PLUS PREMIUM</span><h2>90 days membership</h2><p>₹50 total · PhonePe merchant setup pending. Payment is disabled until real gateway verification is implemented.</p><button className="secondary-btn" onClick={() => setMembershipOpen(true)}>View membership</button></div>
          <span className="crown">👑</span>
        </section>
        <section className="safety-note"><b>Safety & privacy</b><p>Dating profiles shown here are sample previews, not real people. Real dating launch needs verified 18+ access, reporting, blocking and moderation.</p></section>
      </main>
      <footer>© 2026 LUDO PLUS · Built for play and connection</footer>
      {membershipOpen && <MembershipModal onClose={() => setMembershipOpen(false)} />}
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
