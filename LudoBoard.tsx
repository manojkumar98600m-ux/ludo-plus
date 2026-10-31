import { useEffect, useRef, useState } from "react";
import { api, getPlayerId, type LudoRoom } from "./api";

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
  const [playerCount, setPlayerCount] = useState(4);
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  useEffect(() => { const invitedCode = new URLSearchParams(window.location.search).get("room"); if (invitedCode) setJoinCode(invitedCode.toUpperCase().slice(0, 8)); }, []);
  const [roomMessage, setRoomMessage] = useState("Server URL configure होने पर private rooms काम करेंगे।");
  const [displayName, setDisplayName] = useState("Player");
  const [room, setRoom] = useState<LudoRoom | null>(null);
  const [roomBusy, setRoomBusy] = useState(false);
  const revisionRef = useRef(0);
  const applyingRemoteRef = useRef(false);
  const signatureRef = useRef("");

  const gameSignature = JSON.stringify({ positions, turn, dice, winner });
  useEffect(() => {
    const savedCode = localStorage.getItem("ludo-plus-last-room");
    if (!savedCode) return;
    let active = true;
    api.getLudoRoom(savedCode).then(({ room: savedRoom }) => {
      if (!active || !savedRoom.players.some(player => player.playerId === getPlayerId())) {
        if (active) localStorage.removeItem("ludo-plus-last-room");
        return;
      }
      revisionRef.current = savedRoom.game.revision;
      signatureRef.current = JSON.stringify({ positions: savedRoom.game.positions, turn: savedRoom.game.turn, dice: savedRoom.game.dice, winner: savedRoom.game.winner });
      setRoom(savedRoom); setRoomCode(savedRoom.code);
      setPositions(savedRoom.game.positions.map(row => [...row]));
      setTurn(savedRoom.game.turn); setDice(savedRoom.game.dice); setWinner(savedRoom.game.winner);
      setRoomMessage("पुराना Ludo room वापस जुड़ गया।");
    }).catch(() => localStorage.removeItem("ludo-plus-last-room"));
    return () => { active = false; };
  }, []);


  useEffect(() => {
    if (!roomCode || !room) return;
    let active = true;
    void api.heartbeatLudoRoom(roomCode).catch(() => {});
    const heartbeatTimer = window.setInterval(() => { void api.heartbeatLudoRoom(roomCode).catch(() => {}); }, 10000);
    const poll = async () => {
      try {
        const result = await api.getLudoRoom(roomCode);
        if (!active) return;
        setRoom(result.room);
        if (result.room.game.revision > revisionRef.current) {
          applyingRemoteRef.current = true;
          revisionRef.current = result.room.game.revision;
          signatureRef.current = JSON.stringify({ positions: result.room.game.positions, turn: result.room.game.turn, dice: result.room.game.dice, winner: result.room.game.winner });
          setPositions(result.room.game.positions.map(row => [...row]));
          setTurn(result.room.game.turn);
          setDice(result.room.game.dice);
          setWinner(result.room.game.winner);
          setMessage(result.room.game.winner !== null ? `${players[result.room.game.winner].name} जीत गया! 🎉` : `${players[result.room.game.turn].name} की बारी है`);
        }
      } catch { /* Keep the last known room state during brief network interruptions. */ }
    };
    const reconnect = () => { if (!active) return; void api.heartbeatLudoRoom(roomCode).then(() => poll()).catch(() => poll()); };
    const onVisibility = () => { if (document.visibilityState === "visible") reconnect(); };
    window.addEventListener("online", reconnect);
    document.addEventListener("visibilitychange", onVisibility);
    void poll();
    const timer = window.setInterval(poll, 2000);
    return () => { active = false; window.removeEventListener("online", reconnect); document.removeEventListener("visibilitychange", onVisibility); window.clearInterval(timer); window.clearInterval(heartbeatTimer); };
  }, [roomCode, room?.code]);

  useEffect(() => {
    if (!roomCode || !room) return;
    if (applyingRemoteRef.current) { applyingRemoteRef.current = false; return; }
    if (signatureRef.current === gameSignature) return;
    signatureRef.current = gameSignature;
    const expectedRevision = revisionRef.current;
    const timer = window.setTimeout(async () => {
      try {
        const result = await api.updateLudoRoomState(roomCode, getPlayerId(), { positions, turn, dice, winner, revision: expectedRevision });
        revisionRef.current = result.room.game.revision;
        setRoom(result.room);
      } catch {
        try {
          const latest = await api.getLudoRoom(roomCode);
          setRoom(latest.room);
          if (latest.room.game.revision > revisionRef.current) {
            applyingRemoteRef.current = true;
            revisionRef.current = latest.room.game.revision;
            signatureRef.current = JSON.stringify({ positions: latest.room.game.positions, turn: latest.room.game.turn, dice: latest.room.game.dice, winner: latest.room.game.winner });
            setPositions(latest.room.game.positions.map(row => [...row]));
            setTurn(latest.room.game.turn); setDice(latest.room.game.dice); setWinner(latest.room.game.winner);
          }
        } catch { setRoomMessage("Sync नहीं हो पाया। Server connection जाँचें।"); }
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [roomCode, room?.code, gameSignature]);

  async function rollDice() {
    if (dice !== null || winner !== null) return;
    let value: number;
    if (roomCode && room) {
      try {
        const result = await api.rollLudoRoomDice(roomCode);
        setRoom(result.room);
        revisionRef.current = result.room.game.revision;
        value = result.room.game.dice as number;
        signatureRef.current = JSON.stringify({ positions: result.room.game.positions, turn: result.room.game.turn, dice: value, winner: result.room.game.winner });
      } catch (error) {
        setRoomMessage(error instanceof Error ? error.message : "Server dice roll failed.");
        return;
      }
    } else {
      value = Math.floor(Math.random() * 6) + 1;
    }
    setDice(value);
    const movable = positions[turn].some(pos => pos === -1 ? value === 6 : pos + value <= 57);
    setMessage(movable ? `${players[turn].name}: गोटी चुनें` : `${players[turn].name} को चाल नहीं मिली`);
    if (!movable) window.setTimeout(() => {
      setDice(null);
      const nextTurn = room ? (turn + 1) % room.players.length : (turn + 1) % playerCount;
      setTurn(nextTurn);
      setMessage(`${players[nextTurn].name} की बारी है`);
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
      const nextTurn = room ? (turn + 1) % room.players.length : (turn + 1) % playerCount;
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
        const tokens = positions[p].map((pos, ti) => pos === 51 + laneIndex ? players[p].css + (ti + 1) : "").filter(Boolean);
        return { cls: `lane-cell ${players[p].css}`, label: "", tokens };
      }
    }
    const owner = baseOwner(r, c);
    if (owner >= 0) {
      const localR = r < 6 ? r : r > 8 ? r - 9 : r;
      const localC = c < 6 ? c : c > 8 ? c - 9 : c;
      const inHomeBase = localR >= 1 && localR <= 4 && localC >= 1 && localC <= 4;
      const tokenSpot = (localR === 1 || localR === 4) && (localC === 1 || localC === 4);
      const spotIndex = localR === 1 ? (localC === 1 ? 0 : 1) : (localC === 1 ? 2 : 3);
      const tokens = tokenSpot && positions[owner][spotIndex] === -1 ? [players[owner].css + (spotIndex + 1)] : [];
      return {
        cls: `yard-cell ${players[owner].css}${inHomeBase ? " yard-base" : ""}`,
        label: "",
        tokens
      };
    }
    if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
      const finishSpots: Record<string, number> = { "6-6": 0, "6-8": 1, "8-8": 2, "8-6": 3 };
      const finishedPlayer = finishSpots[`${r}-${c}`];
      if (finishedPlayer !== undefined) {
        const tokens = positions[finishedPlayer].map((pos, ti) => pos === 57 ? players[finishedPlayer].css + (ti + 1) : "").filter(Boolean);
        return { cls: `finish-cell finish-${players[finishedPlayer].css}`, label: "", tokens };
      }
      const centerClass = r === 6 && c === 7 ? "center-north" : r === 7 && c === 8 ? "center-east" : r === 8 && c === 7 ? "center-south" : r === 7 && c === 6 ? "center-west" : "";
      return { cls: `finish-cell ${centerClass}`, label: (r === 7 && c === 7) ? "dice-hub" : "", tokens: [] as string[] };
    }
    return { cls: "empty-cell", label: "", tokens: [] as string[] };
  }

  return <section className="panel">
    <div className="section-head"><div><span className="eyebrow">GAME ZONE</span><h2>Ludo Arena</h2></div><span className="tag">LUDO PLUS</span></div>
    <div className="ludo-feature-hero">
      <span className="ludo-feature-kicker">♛ THE ROYAL GAME</span>
      <h2>Roll the Dice. Rule the Game.</h2>
      <p>Play your way — solo, with friends, or in the online arena.</p>
      <div className="ludo-feature-actions">
        <button className="ludo-feature-primary" onClick={() => { document.getElementById("ludo-board-area")?.scrollIntoView({ behavior: "smooth", block: "start" }); setMessage("Local Ludo: पासा फेंककर खेल शुरू करें।"); }}>🎲 Play Ludo</button>
        <button className="ludo-feature-secondary" onClick={() => document.getElementById("ludo-private-room")?.scrollIntoView({ behavior: "smooth", block: "center" })}>👥 Play with Friends</button>
      </div>
    </div>
    <div className="ludo-feature-grid">
      <article className="ludo-feature-card"><span>🤖</span><div><b>Play with Computer</b><small>Computer practice mode is being prepared</small></div></article>
      <article className="ludo-feature-card"><span>👥</span><div><b>Local Multiplayer</b><small>Choose 2–4 players below</small></div></article>
      <article className="ludo-feature-card"><span>🌐</span><div><b>Online Multiplayer</b><small>Private room code available</small></div></article>
      <article className="ludo-feature-card"><span>🎙️</span><div><b>Voice Chat</b><small>Coming soon</small></div></article>
      <article className="ludo-feature-card"><span>⚡</span><div><b>Quick Mode</b><small>Coming soon</small></div></article>
      <article className="ludo-feature-card"><span>🏆</span><div><b>Tournaments</b><small>Coming soon</small></div></article>
    </div>
    <div id="ludo-board-area" className="ludo-board-title"><h3>🎲 Classic Ludo Board</h3><span>{room ? `${room.players.length} online players` : `${playerCount} local players`} · 4 tokens each</span></div>
    {!room && <div className="player-count-picker" aria-label="Choose local player count"><b>Players</b>{[2,3,4].map(count => <button key={count} type="button" className={playerCount === count ? "selected" : ""} onClick={() => { setPlayerCount(count); resetGame(); setMessage(`${players[0].name} की बारी है — ${count} players`); }}>{count} Players</button>}</div>}
    <div className="ludo15" role="img" aria-label="15 by 15 Ludo board">
      {Array.from({ length: 15 }, (_, r) => Array.from({ length: 15 }, (_, c) => {
        const cell = cellContent(r, c);
        return <div key={`${r}-${c}`} className={`ludo-cell ${cell.cls}`} title={cell.label}>
          {cell.label === "dice-hub" ? <span className="center-dice"><i>⚄</i><i>⚃</i></span> : cell.tokens.length > 0 ? <span className="board-pieces">{cell.tokens.map((token, i) => {
            const playerIndex = players.findIndex(player => token.startsWith(player.css));
            const tokenIndex = Number(token.slice(-1)) - 1;
            const canSelect = playerIndex === turn && dice !== null && winner === null;
            return <button type="button" key={`${token}-${i}`} className={`board-piece ${token.slice(0, -1)}${canSelect ? " board-piece-selectable" : ""}`} aria-label={`Select ${token} token`} title={canSelect ? "गोटी चलाने के लिए टैप करें" : token} onClick={() => { if (canSelect) moveToken(tokenIndex); }} disabled={!canSelect || (positions[playerIndex]?.[tokenIndex] === -1 && dice !== 6) || (positions[playerIndex]?.[tokenIndex] >= 0 && positions[playerIndex]?.[tokenIndex] + (dice ?? 0) > 57)} />
          })}</span> : cell.label}
        </div>;
      }))}
    </div>
    <div className="token-chooser">
      {players.slice(0, room ? room.players.length : playerCount).map((player, pi) => <div className={`token-player ${player.css}`} key={player.name}><b>{player.name}</b><div className="token-grid">{positions[pi].map((pos, i) => <button key={i} className={`token ${player.css}-token`} aria-label={`${player.name} token ${i + 1}`} onClick={() => { if (turn === pi) moveToken(i); }} disabled={turn !== pi || dice === null || (pos === -1 && dice !== 6) || (pos >= 0 && pos + dice > 57)}>{pos < 0 ? "●" : pos === 57 ? "★" : pos + 1}</button>)}</div><small>{positions[pi].filter(pos => pos === 57).length}/4 home</small></div>)}
    </div>
    <div className="game-status"><strong>{message}</strong><span>Current player: <b>{players[turn].name}</b></span></div>
    <div className="dice-row"><button className="primary-btn" onClick={rollDice} disabled={dice !== null || winner !== null}>Roll dice</button><strong className="dice">{dice ?? "—"}</strong><button className="secondary-btn" onClick={resetGame}>New game</button></div>
    {winner !== null && <p className="winner-banner">🏆 {players[winner].name} wins!</p>}
    <p className="muted small">Private room में game state polling से sync होता है; API server दोनों फोन के लिए उपलब्ध होना चाहिए।</p>
    <section id="ludo-private-room" className="private-room">
      <h3>🔐 Private Ludo Room</h3>
      <p className="muted small">Room code से जुड़ें; game state लगभग हर 2 सेकंड में sync होगा।</p>
      <div className="room-actions"><input aria-label="Your player name" placeholder="Your name" value={displayName} onChange={e => setDisplayName(e.target.value.slice(0,24))}/><button className="secondary-btn" disabled={roomBusy || !displayName.trim()} onClick={async () => { setRoomBusy(true); try { const result = await api.createLudoRoom(displayName.trim()); setRoom(result.room); setRoomCode(result.room.code); localStorage.setItem("ludo-plus-last-room", result.room.code); revisionRef.current = result.room.game.revision; signatureRef.current = JSON.stringify({ positions: result.room.game.positions, turn: result.room.game.turn, dice: result.room.game.dice, winner: result.room.game.winner }); setPositions(result.room.game.positions.map(row => [...row])); setTurn(result.room.game.turn); setDice(result.room.game.dice); setWinner(result.room.game.winner); setRoomMessage("Room बन गया। Code अपने दोस्तों को भेजें।"); } catch (error) { setRoomMessage(error instanceof Error ? error.message : "Room create नहीं हुआ। API server URL check करें।"); } finally { setRoomBusy(false); } }}>{roomBusy ? "Please wait…" : "Create room"}</button>{roomCode && <><strong className="room-code">{roomCode}</strong><button className="secondary-btn" onClick={() => { void navigator.clipboard?.writeText(roomCode).then(() => setRoomMessage("Room code copied. Friends को भेजें।")).catch(() => setRoomMessage("Room code manually copy करें: "+roomCode)); }}>Copy code</button><button className="secondary-btn" onClick={async () => { const invite = `Join my LUDO PLUS game! Room code: ${roomCode}`; try { if (navigator.share) await navigator.share({ title: "LUDO PLUS room invite", text: invite, url: `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(roomCode)}` }); else { await navigator.clipboard.writeText(invite); setRoomMessage("Invite copied. Friends को भेजें।"); } } catch { try { await navigator.clipboard.writeText(invite); setRoomMessage("Invite copied. Friends को भेजें।"); } catch { setRoomMessage(invite); } } }}>Share invite</button></>}</div>
      <div className="room-actions"><input aria-label="Enter room code" placeholder="Enter room code" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 8))}/><button className="secondary-btn" disabled={roomBusy || !joinCode.trim() || !displayName.trim()} onClick={async () => { setRoomBusy(true); try { const result = await api.joinLudoRoom(joinCode.trim(), displayName.trim()); setRoom(result.room); setRoomCode(result.room.code); localStorage.setItem("ludo-plus-last-room", result.room.code); revisionRef.current = result.room.game.revision; signatureRef.current = JSON.stringify({ positions: result.room.game.positions, turn: result.room.game.turn, dice: result.room.game.dice, winner: result.room.game.winner }); setPositions(result.room.game.positions.map(row => [...row])); setTurn(result.room.game.turn); setDice(result.room.game.dice); setWinner(result.room.game.winner); setRoomMessage(`Room join हो गया: ${result.room.players.length}/4 players`); } catch (error) { setRoomMessage(error instanceof Error ? error.message : "Room join नहीं हुआ। API server URL check करें।"); } finally { setRoomBusy(false); } }}>Join room</button></div>
      {room && room.status === "waiting" && <div className="room-actions"><button className="secondary-btn" onClick={async () => { try { const result = await api.setLudoReady(roomCode, !room.players.find(p => p.playerId === getPlayerId())?.ready); setRoom(result.room); } catch (error) { setRoomMessage(error instanceof Error ? error.message : "Ready status update नहीं हुआ।"); } }}>{room.players.find(p => p.playerId === getPlayerId())?.ready ? "Not Ready" : "I am Ready"}</button>{room.hostId === getPlayerId() && <button className="secondary-btn" disabled={room.players.length < 2 || !room.players.every(p => p.ready)} onClick={async () => { try { const result = await api.startLudoRoom(roomCode); setRoom(result.room); setRoomMessage("Game शुरू हो गया!"); } catch (error) { setRoomMessage(error instanceof Error ? error.message : "Game start नहीं हुआ।"); } }}>Start Game</button>}</div>}
      {room && <div className="room-members"><b>Room {room.code} · {room.players.length}/4 · {room.players.filter(player => player.lastSeenAt && Date.now() - player.lastSeenAt < 25000).length} online</b>{room.players.map(player => <span key={player.playerId}>{player.displayName} · {player.color}{player.playerId === room.hostId ? " · Host" : ""}{room.status === "waiting" ? (player.ready ? " · Ready" : " · Not ready") : ""} · {(player.lastSeenAt && Date.now() - player.lastSeenAt < 25000) ? "Online" : "Offline"}</span>)}<button className="secondary-btn" onClick={async () => { try { await api.leaveLudoRoom(roomCode); setRoom(null); setRoomCode(""); localStorage.removeItem("ludo-plus-last-room"); setJoinCode(""); setRoomMessage("Room से बाहर आ गए।"); resetGame(); } catch (error) { setRoomMessage(error instanceof Error ? error.message : "Room छोड़ नहीं पाए।"); } }}>Leave room</button></div>}
      <p className="muted small">{roomMessage}</p>
    </section>
  </section>;
}
