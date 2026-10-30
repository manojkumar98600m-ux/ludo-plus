import { useState } from "react";
import { api, type LudoRoom } from "./api";

type Player = { name: string; color: string; start: number; css: string };
const players: Player[] = [
  { name: "Red", color: "#ef4444", start: 0, css: "red" },
  { name: "Green", color: "#22c55e", start: 13, css: "green" },
  { name: "Yellow", color: "#eab308", start: 26, css: "yellow" },
  { name: "Blue", color: "#3b82f6", start: 39, css: "blue" }
];
const TRACK = [
  [6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,7],[1,8],[2,8],
  [3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],
  [8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,7],
  [13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  [7,0],[6,0],[5,0],[4,0],[3,0],[2,0]
] as const;
const SAFE = [0,8,13,21,26,34,39,47];
const LANES = [
  [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]
] as const;
const TOKENS = 4;

function baseOwner(r: number, c: number) {
  if (r < 6 && c < 6) return 0;
  if (r < 6 && c > 8) return 1;
  if (r > 8 && c > 8) return 2;
  if (r > 8 && c < 6) return 3;
  return -1;
}

export default function LudoBoard() {
  const [positions, setPositions] = useState<number[][]>(() => players.map(() => Array(TOKENS).fill(-1)));
  const [turn, setTurn] = useState(0);
  const [dice, setDice] = useState<number | null>(null);
  const [message, setMessage] = useState("Red की बारी है — पासा फेंकें");
  const [winner, setWinner] = useState<number | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [roomMessage, setRoomMessage] = useState("Server URL configure होने पर private rooms काम करेंगे।");
  const [displayName, setDisplayName] = useState("Player");
  const [room, setRoom] = useState<LudoRoom | null>(null);
  const [roomBusy, setRoomBusy] = useState(false);

  function rollDice() {
    if (dice !== null || winner !== null) return;
    const value = Math.floor(Math.random() * 6) + 1;
    setDice(value);
    const movable = positions[turn].some(pos => pos === -1 ? value === 6 : pos + value <= 57);
    setMessage(movable ? `${players[turn].name}: गोटी चुनें` : `${players[turn].name} को चाल नहीं मिली`);
    if (!movable) window.setTimeout(() => {
      setDice(null);
      setTurn(current => (current + 1) % players.length);
      setMessage(`${players[(turn + 1) % players.length].name} की बारी है`);
    }, 650);
  }

  function moveToken(tokenIndex: number) {
    if (dice === null || winner !== null) return;
    const current = positions[turn][tokenIndex];
    if (current === -1 && dice !== 6) return;
    if (current >= 0 && current + dice > 57) return;
    const next = positions.map(row => [...row]);
    const nextPosition = current === -1 ? 0 : current + dice;
    next[turn][tokenIndex] = nextPosition;
    if (nextPosition < 51) {
      const landing = (players[turn].start + nextPosition) % 52;
      if (!SAFE.includes(landing)) players.forEach((player, playerIndex) => {
        if (playerIndex !== turn) next[playerIndex] = next[playerIndex].map(pos =>
          pos >= 0 && pos < 51 && (player.start + pos) % 52 === landing ? -1 : pos);
      });
    }
    setPositions(next);
    if (next[turn].filter(pos => pos === 57).length === TOKENS) {
      setWinner(turn); setMessage(`${players[turn].name} जीत गया! 🎉`);
    } else if (dice === 6) setMessage(`${players[turn].name} को 6 मिला — फिर से पासा फेंकें`);
    else {
      const nextTurn = (turn + 1) % 4;
      setTurn(nextTurn); setMessage(`${players[nextTurn].name} की बारी है`);
    }
    setDice(null);
  }

  function resetGame() {
    setPositions(players.map(() => Array(TOKENS).fill(-1)));
    setTurn(0); setDice(null); setWinner(null); setMessage("Red की बारी है — पासा फेंकें");
  }

  function cellContent(r: number, c: number) {
    const trackIndex = TRACK.findIndex(([tr, tc]) => tr === r && tc === c);
    if (trackIndex >= 0) {
      const tokens: string[] = [];
      positions.forEach((row, pi) => row.forEach((pos, ti) => {
        if (pos >= 0 && pos < 51 && (players[pi].start + pos) % 52 === trackIndex) tokens.push(players[pi].css + (ti + 1));
      }));
      return { cls: `track-cell ${SAFE.includes(trackIndex) ? "safe-cell" : ""} `, label: tokens.length ? tokens.map(t => t[0].toUpperCase()).join("") : (SAFE.includes(trackIndex) ? "★" : ""), tokens };
    }
    for (let p = 0; p < 4; p++) {
      const laneIndex = LANES[p].findIndex(([lr, lc]) => lr === r && lc === c);
      if (laneIndex >= 0) {
        const count = positions[p].filter(pos => pos === 51 + laneIndex).length;
        return { cls: `lane-cell ${players[p].css}`, label: count ? "●" : "", tokens: [] as string[] };
      }
    }
    const owner = baseOwner(r, c);
    if (owner >= 0) return { cls: `yard-cell ${players[owner].css}`, label: (r % 2 === 0 && c % 2 === 0) ? "●" : "", tokens: [] as string[] };
    if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return { cls: "finish-cell", label: (r === 7 && c === 7) ? "✦" : "", tokens: [] as string[] };
    return { cls: "empty-cell", label: "", tokens: [] as string[] };
  }

  return <section className="panel">
    <div className="section-head"><div><span className="eyebrow">GAME ZONE</span><h2>Ludo Arena</h2></div><span className="tag">15 × 15 board</span></div>
    <div className="ludo15" role="img" aria-label="15 by 15 Ludo board">
      {Array.from({ length: 15 }, (_, r) => Array.from({ length: 15 }, (_, c) => {
        const cell = cellContent(r, c);
        return <div key={`${r}-${c}`} className={`ludo-cell ${cell.cls}`} title={cell.label}>{cell.label}</div>;
      }))}
    </div>
    <div className="token-chooser">
      {players.map((player, pi) => <div className={`token-player ${player.css}`} key={player.name}><b>{player.name}</b><div className="token-grid">{positions[pi].map((pos, i) => <button key={i} className={`token ${player.css}-token`} aria-label={`${player.name} token ${i + 1}`} onClick={() => { if (turn === pi) moveToken(i); }} disabled={turn !== pi || dice === null || (pos === -1 && dice !== 6) || (pos >= 0 && pos + dice > 57)}>{pos < 0 ? "●" : pos === 57 ? "★" : pos + 1}</button>)}</div><small>{positions[pi].filter(pos => pos === 57).length}/4 home</small></div>)}
    </div>
    <div className="game-status"><strong>{message}</strong><span>Current player: <b>{players[turn].name}</b></span></div>
    <div className="dice-row"><button className="primary-btn" onClick={rollDice} disabled={dice !== null || winner !== null}>Roll dice</button><strong className="dice">{dice ?? "—"}</strong><button className="secondary-btn" onClick={resetGame}>New game</button></div>
    {winner !== null && <p className="winner-banner">🏆 {players[winner].name} wins!</p>}
    <p className="muted small">15×15 visual board with local pass-and-play controls. Online synchronized turns still require a live game server.</p>
    <section className="private-room">
      <h3>🔐 Private Ludo Room</h3>
      <p className="muted small">Room code preview — अभी दूसरे फोन से live join नहीं होगा।</p>
      <div className="room-actions"><input aria-label="Your player name" placeholder="Your name" value={displayName} onChange={e => setDisplayName(e.target.value.slice(0,24))}/><button className="secondary-btn" disabled={roomBusy || !displayName.trim()} onClick={async () => { setRoomBusy(true); try { const result = await api.createLudoRoom(displayName.trim()); setRoom(result.room); setRoomCode(result.room.code); setRoomMessage("Room server पर बन गया। Code अपने दोस्तों को भेजें।"); } catch (error) { setRoomMessage(error instanceof Error ? error.message : "Room create नहीं हुआ। API server URL check करें।"); } finally { setRoomBusy(false); } }}>{roomBusy ? "Please wait…" : "Create room"}</button>{roomCode && <strong className="room-code">{roomCode}</strong>}</div>
      <div className="room-actions"><input aria-label="Enter room code" placeholder="Enter room code" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 8))}/><button className="secondary-btn" disabled={roomBusy || !joinCode.trim() || !displayName.trim()} onClick={async () => { setRoomBusy(true); try { const result = await api.joinLudoRoom(joinCode.trim(), displayName.trim()); setRoom(result.room); setRoomCode(result.room.code); setRoomMessage(`Room join हो गया: ${result.room.players.length}/4 players`); } catch (error) { setRoomMessage(error instanceof Error ? error.message : "Room join नहीं हुआ। API server URL check करें।"); } finally { setRoomBusy(false); } }}>Join room</button></div>
      {room && <div className="room-members"><b>Room {room.code} · {room.players.length}/4</b>{room.players.map(player => <span key={player.playerId}>{player.displayName} · {player.color}</span>)}</div>}
      <p className="muted small">{roomMessage}</p>
    </section>
  </section>;
}
