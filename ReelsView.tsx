import { useState } from "react";
const clips = [{ title: "Game night highlights", emoji: "🎲", creator: "@player_one" }, { title: "Good vibes only", emoji: "✨", creator: "@daily_vibes" }, { title: "Weekend moments", emoji: "🌆", creator: "@explorer" }];
export default function ReelsView() {
  const [index, setIndex] = useState(0); const [liked, setLiked] = useState(false);
  const clip = clips[index];
  return <section className="panel"><div className="section-head"><div><span className="eyebrow">SHORT VIDEOS</span><h2>Reels</h2></div><span className="tag">Preview</span></div>
    <div className="reel-preview"><div className="reel-emoji">{clip.emoji}</div><div className="reel-caption"><b>{clip.title}</b><span>{clip.creator}</span></div></div>
    <div className="button-row"><button className="secondary-btn" onClick={() => setLiked(!liked)}>{liked ? "♥ Liked" : "♡ Like"}</button><button className="primary-btn" onClick={() => { setIndex((index + 1) % clips.length); setLiked(false); }}>Next reel →</button></div>
    <p className="muted small">Sample reel cards only. Video upload, storage, feed and playback are not connected.</p>
  </section>;
}