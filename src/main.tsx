import React from "react";
import { createRoot } from "react-dom/client";
import LudoBoard from "../LudoBoard";
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
        <LudoBoard />
        <div className="grid">
          <section className="tile"><div className="emoji">❤️</div><h2>Dating & Friends</h2><p>Profile discovery preview. Secure accounts, age checks and matching services are not connected yet.</p></section>
          <section className="tile"><div className="emoji">🎬</div><h2>Reels & Posts</h2><p>Social feed preview. Uploads, likes and comments need backend storage.</p></section>
          <section className="tile"><div className="emoji">💬</div><h2>Chat & Calls</h2><p>Messaging and voice/video calls need real-time service integration.</p></section>
        </div>
        <section className="membership">
          <div><span className="eyebrow">LUDO PLUS PREMIUM</span><h2>90 days membership</h2><p>₹50 total · PhonePe setup pending — no payment will be marked successful until a real merchant gateway is connected.</p></div>
          <span className="crown">👑</span>
        </section>
      </main>
      <footer>© 2026 LUDO PLUS</footer>
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
