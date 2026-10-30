import { useState } from "react";
export default function LudoBoard() {
  const [dice, setDice] = useState<number | null>(null);
  return <section className="panel">
    <div className="section-head"><div><span className="eyebrow">GAME ZONE</span><h2>Ludo Arena</h2></div><span className="tag">Demo mode</span></div>
    <div className="ludo-board" aria-label="Decorative Ludo board">
      <div className="home red">RED</div><div className="home green">GREEN</div>
      <div className="home yellow">YELLOW</div><div className="home blue">BLUE</div>
      <div className="center-star">✦</div>
    </div>
    <div className="dice-row"><button className="primary-btn" onClick={() => setDice(1 + Math.floor(Math.random() * 6))}>Roll dice</button><strong className="dice">{dice ?? "—"}</strong></div>
    <p className="muted small">This is a local UI demo, not online multiplayer. Room creation and live turns need a game server.</p>
  </section>;
}