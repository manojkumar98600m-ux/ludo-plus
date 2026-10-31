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

type Tab = "home" | "game" | "dating" | "reels" | "chat" | "posts" | "profile";

function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [membershipOpen, setMembershipOpen] = useState(false);
  const nav: { id: Tab; label: string; icon: string }[] = [
    { id: "home", label: "Home", icon: "⌂" },
    { id: "game", label: "Ludo", icon: "🎲" },
    { id: "reels", label: "Reels", icon: "▣" },
    { id: "chat", label: "Chat", icon: "▰" },
    { id: "profile", label: "Profile", icon: "♙" }
  ];
  return <div className="app ludo-plus-app">
    <header className="app-header screenshot-header">
      <button className="header-menu" aria-label="Menu" onClick={() => setTab("profile")}>☰</button><div className="brand-mark"><span className="brand-crown">👑</span><span>LUDO <b>PLUS</b></span></div>
      <p>Play · Chat · Connect</p>
      <button className="header-bell" aria-label="Notifications" onClick={() => setTab("chat")}>♧</button>
    </header>
    <main>
      {tab === "home" && <>
        <section className="reference-hero">
          <div className="hero-copy"><span className="eyebrow">YOUR GAME. YOUR PEOPLE.</span><h1>Play Ludo<br/>Make Friends<br/><em>Find Your Vibe ♥</em></h1><p>Games, reels, friends and more in one app.</p>
          <div className="hero-buttons"><button className="hero-play" onClick={() => setTab("game")}>🎲 Play Ludo</button><button className="hero-friends" onClick={() => setTab("game")}>♟ Play with Friends</button></div></div>
          <div className="hero-art" aria-hidden="true"><span className="art-dice">🎲</span><span className="art-crown">👑</span><span className="art-heart">💗</span><div className="art-orbit">LUDO<br/><b>PLUS</b></div></div>
        </section>
        <section className="story-strip" aria-label="Stories"><button onClick={() => setTab("posts")}><span className="story-ring add-story">＋</span><b>Your Story</b></button><button onClick={() => setTab("dating")}><span className="story-ring">💃</span><b>Friends</b></button><button onClick={() => setTab("reels")}><span className="story-ring">🎮</span><b>Gaming</b></button><button onClick={() => setTab("dating")}><span className="story-ring">💞</span><b>Dating 18+</b></button><button onClick={() => setTab("chat")}><span className="story-ring">💬</span><b>Chat</b></button></section>
        <section className="quick-actions"><button onClick={() => setTab("game")}><span>🎲</span><b>Play Ludo</b><small>Online · Friends</small></button><button onClick={() => setTab("game")}><span>🌐</span><b>Multiplayer</b><small>Private room</small></button><button onClick={() => setTab("reels")}><span>🏆</span><b>Tournament</b><small>Game together</small></button><button onClick={() => setMembershipOpen(true)}><span>👑</span><b>Premium</b><small>₹50 · 90 days</small></button></section>
        <section className="social-shortcuts"><div className="shortcut-heading"><h2>Social Features</h2><span onClick={() => setTab("posts")}>SEE ALL ›</span></div><div className="shortcut-grid"><button onClick={() => setTab("posts")}><span>📸</span><b>Create Post</b></button><button onClick={() => setTab("reels")}><span>🎬</span><b>Reels</b></button><button onClick={() => setTab("dating")}><span>💞</span><b>Dating 18+</b></button><button onClick={() => setTab("chat")}><span>💬</span><b>Chat Now</b></button></div></section>
        <div className="feed-heading"><h2>Explore Feed</h2><span>For you ✨</span></div><PostsView />
      </>}
      {tab === "game" && <LudoBoard />}
      {tab === "dating" && <DatingView />}
      {tab === "reels" && <ReelsView />}
      {tab === "chat" && <ChatView />}
      {tab === "posts" && <PostsView />}
      {tab === "profile" && <section className="profile-page"><h2>Your Profile</h2><p>Sign in to manage your LUDO PLUS profile.</p><AuthPanel/><button className="profile-dating" onClick={() => setTab("dating")}>💜 Open Dating 18+</button><button className="profile-dating" onClick={() => setMembershipOpen(true)}>👑 Membership · ₹50 / 90 days</button></section>}
    </main>
    <nav className="tabbar bottom-app-nav" aria-label="Main sections">{nav.map(item => <button key={item.id} className={tab === item.id ? "tab active" : "tab"} onClick={() => setTab(item.id)} aria-current={tab === item.id ? "page" : undefined}><span>{item.icon}</span>{item.label}</button>)}</nav>
    {membershipOpen && <MembershipModal onClose={() => setMembershipOpen(false)} />}
    <footer>© 2026 LUDO PLUS · Play · Chat · Connect</footer>
  </div>;
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
