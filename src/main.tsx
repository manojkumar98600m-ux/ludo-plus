import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

function App() {
  return (
    <div className="app">
      <header>
        <div className="logo">🎲 LUDO PLUS</div>
        <p>PLAY · CONNECT · SHARE</p>
      </header>
      <main>
        <section className="hero">
          <span className="eyebrow">WELCOME TO LUDO PLUS</span>
          <h1>Game. Friends. Fun.</h1>
          <p>Your place to play Ludo and connect with friends.</p>
        </section>
        <div className="grid">
          <section className="tile"><div className="emoji">🎲</div><h2>Play Ludo</h2><p>Local game preview. Online multiplayer setup is still required.</p></section>
          <section className="tile"><div className="emoji">❤️</div><h2>Dating & Friends</h2><p>Discover profiles and make connections. Account and safety setup required.</p></section>
          <section className="tile"><div className="emoji">🎬</div><h2>Reels & Posts</h2><p>Share moments. Upload and feed services are not connected yet.</p></section>
          <section className="tile"><div className="emoji">💬</div><h2>Chat & Calls</h2><p>Messaging and calling services need backend integration.</p></section>
        </div>
        <section className="membership">
          <div><span className="eyebrow">LUDO PLUS PREMIUM</span><h2>90 days membership</h2><p>₹50 total · PhonePe setup pending</p></div>
          <span className="crown">👑</span>
        </section>
      </main>
      <footer>© 2026 LUDO PLUS</footer>
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
