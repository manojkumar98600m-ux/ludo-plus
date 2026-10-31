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
      <header className="app-header">
        <div className="brand-mark">👑 <span>LUDO <b>PLUS</b></span></div>
        <p>PLAY · CHAT · CONNECT</p>
        <button className="header-bell" aria-label="Notifications">♧</button>
      </header>
      <main>
        <AuthPanel />
        {tab === "game" && <section className="reference-hero">
          <div className="hero-copy"><span className="eyebrow">YOUR GAME. YOUR PEOPLE.</span><h1>Play Ludo.<br/>Make Friends.<br/><em>Find Your Vibe ♥</em></h1><p>One app for gaming and social fun.</p><div className="hero-buttons"><button className="hero-play" onClick={() => document.getElementById("ludo-board-area")?.scrollIntoView({behavior:"smooth"})}>🎲 Play Ludo</button><button className="hero-friends" onClick={() => document.getElementById("ludo-private-room")?.scrollIntoView({behavior:"smooth"})}>♟ Play with Friends</button></div></div>
          <div className="hero-art" aria-hidden="true"><span className="art-dice">🎲</span><span className="art-crown">👑</span><span className="art-heart">💗</span><div className="art-orbit">LUDO<br/><b>PLUS</b></div></div>
        </section>}
        <nav className="tabbar" aria-label="Main sections">
          {tabs.map(item => <button key={item.id} className={tab === item.id ? "tab active" : "tab"} onClick={() => setTab(item.id)} aria-current={tab === item.id ? "page" : undefined}>
            <span>{item.icon}</span>{item.label}
          </button>)}
        </nav>
        {tab === "game" && <><section className="quick-actions"><button onClick={() => document.getElementById("ludo-board-area")?.scrollIntoView({behavior:"smooth"})}><span>🤖</span><b>Computer</b><small>Practice play</small></button><button onClick={() => document.getElementById("ludo-private-room")?.scrollIntoView({behavior:"smooth"})}><span>🌐</span><b>Online Game</b><small>Play together</small></button><button onClick={() => setTab("reels")}><span>🏆</span><b>Tournaments</b><small>Compete & win</small></button><button onClick={() => setMembershipOpen(true)}><span>👑</span><b>Premium</b><small>Get VIP</small></button></section><section className="social-shortcuts"><div className="shortcut-heading"><h2>Social Features</h2><span>EXPLORE</span></div><div className="shortcut-grid"><button onClick={() => setTab("posts")}><span>📸</span><b>Create Post</b></button><button onClick={() => setTab("reels")}><span>🎬</span><b>Reels</b></button><button onClick={() => setTab("dating")}><span>💞</span><b>Dating 18+</b></button><button onClick={() => setTab("chat")}><span>💬</span><b>Chat Now</b></button></div></section><LudoBoard /><section className="notice"><b>Private rooms · Invite your friends</b><p>Create a room below, share its code, and play with up to 3 friends. Room updates sync through the API. For rooms to survive server restarts, configure the Supabase <code>ludo_rooms</code> table.</p></section></>}
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
