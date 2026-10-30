import { useState } from "react";

type Player = { name: string; color: string; start: number };
const players: Player[] = [
  { name: "Red", color: "#ef4444", start: 0 },
  { name: "Green", color: "#22c55e", start: 13 },
  { name: "Yellow", color: "#eab308", start: 26 },
  { name: "Blue", color: "#3b82f6", start: 39 }
];
const TRACK_LENGTH = 52;
const TOKENS = 4;

export default function LudoBoard() {
  const [positions, setPositions] = useState<number[][]>(() => players.map(() => Array(TOKENS).fill(-1)));
  const [turn, setTurn] = useState(0);
  const [dice, setDice] = useState<number | null>(null);
  const [message, setMessage] = useState("Red की बारी है — पासा फेंकें");
  const [winner, setWinner] = useState<number | null>(null);

  function rollDice() {
    if (dice !== null || winner !== null) return;
    const value = Math.floor(Math.random() * 6) + 1;
    setDice(value);
    const movable = positions[turn].some(pos => pos === -1 ? value === 6 : pos + value <= 57);
    setMessage(movable ? `${players[turn].name}: गोटी चुनें` : `${players[turn].name} को चाल नहीं मिली`);
    if (!movable) {
      window.setTimeout(() => {
        setDice(null);
        setTurn(current => (current + 1) % players.length);
        setMessage(`${players[(turn + 1) % players.length].name} की बारी है`);
      }, 650);
    }
  }

  function moveToken(tokenIndex: number) {
    if (dice === null || winner !== null) return;
    const current = positions[turn][tokenIndex];
    if (current === -1 && dice !== 6) return;
    if (current >= 0 && current + dice > 57) return;

    const next = positions.map(row => [...row]);
    const nextPosition = current === -1 ? 0 : current + dice;
    next[turn][tokenIndex] = nextPosition;

    // Capture opponents on the shared 52-square track; safe squares are excluded.
    if (nextPosition < 51) {
      const landing = (players[turn].start + nextPosition) % TRACK_LENGTH;
      const safe = [0, 8, 13, 21, 26, 34, 39, 47];
      if (!safe.includes(landing)) {
        players.forEach((player, playerIndex) => {
          if (playerIndex === turn) return;
          next[playerIndex] = next[playerIndex].map(pos => {
            if (pos < 0 || pos >= 51) return pos;
            return (player.start + pos) % TRACK_LENGTH === landing ? -1 : pos;
          });
        });
      }
    }
    setPositions(next);
    const finished = next[turn].filter(pos => pos === 57).length;
    if (finished === TOKENS) {
      setWinner(turn);
      setMessage(`${players[turn].name} जीत गया! 🎉`);
    } else if (dice === 6) {
      setMessage(`${players[turn].name} को 6 मिला — फिर से पासा फेंकें`);
    } else {
      const nextTurn = (turn + 1) % players.length;
      setTurn(nextTurn);
      setMessage(`${players[nextTurn].name} की बारी है`);
    }
    setDice(null);
  }

  function resetGame() {
    setPositions(players.map(() => Array(TOKENS).fill(-1)));
    setTurn(0); setDice(null); setWinner(null); setMessage("Red की बारी है — पासा फेंकें");
  }

  return <section className="panel">
    <div className="section-head"><div><span className="eyebrow">GAME ZONE</span><h2>Ludo Arena</h2></div><span className="tag">Local 4-player</span></div>
    <div className="ludo-board" aria-label="Ludo board">
      <div className="home red"><b>RED</b><div className="token-grid">{positions[0].map((p, i) => <button key={i} className="token red-token" aria-label={`Red token ${i + 1}, ${p < 0 ? "home" : p}`} onClick={() => turn === 0 && moveToken(i)}>{p < 0 ? "●" : p === 57 ? "★" : p + 1}</button>)}</div></div>
      <div className="home green"><b>GREEN</b><div className="token-grid">{positions[1].map((p, i) => <button key={i} className="token green-token" aria-label={`Green token ${i + 1}, ${p < 0 ? "home" : p}`} onClick={() => turn === 1 && moveToken(i)}>{p < 0 ? "●" : p === 57 ? "★" : p + 1}</button>)}</div></div>
      <div className="home yellow"><b>YELLOW</b><div className="token-grid">{positions[2].map((p, i) => <button key={i} className="token yellow-token" aria-label={`Yellow token ${i + 1}, ${p < 0 ? "home" : p}`} onClick={() => turn === 2 && moveToken(i)}>{p < 0 ? "●" : p === 57 ? "★" : p + 1}</button>)}</div></div>
      <div className="home blue"><b>BLUE</b><div className="token-grid">{positions[3].map((p, i) => <button key={i} className="token blue-token" aria-label={`Blue token ${i + 1}, ${p < 0 ? "home" : p}`} onClick={() => turn === 3 && moveToken(i)}>{p < 0 ? "●" : p === 57 ? "★" : p + 1}</button>)}</div></div>
      <div className="center-star">✦</div>
    </div>
    <div className="game-status"><strong>{message}</strong><span>Current player: <b>{players[turn].name}</b></span></div>
    <div className="dice-row"><button className="primary-btn" onClick={rollDice} disabled={dice !== null || winner !== null}>Roll dice</button><strong className="dice">{dice ?? "—"}</strong><button className="secondary-btn" onClick={resetGame}>New game</button></div>
    <div className="player-score">{players.map((player, i) => <span key={player.name} style={{ borderColor: player.color }}><b>{player.name}</b> · {positions[i].filter(pos => pos === 57).length}/4 home</span>)}</div>
    <p className="muted small">Local pass-and-play prototype: 4 players, 4 tokens each, six to enter, captures and exact finish. Online rooms and live multiplayer still need a server.</p>
    {winner !== null && <p className="winner-banner">🏆 {players[winner].name} wins!</p>}
  </section>;
}
