import { useState } from "react";
const profiles = [{ name: "Aarav", age: 24, bio: "Games, music and good conversations.", emoji: "😊" }, { name: "Priya", age: 23, bio: "Music lover and weekend explorer.", emoji: "🌸" }, { name: "Rohan", age: 26, bio: "Gaming and travel.", emoji: "😎" }];
export default function DatingView() {
  const [index, setIndex] = useState(0); const [likes, setLikes] = useState(0);
  const p = profiles[index];
  return <section className="panel"><span className="eyebrow">18+ CONNECTIONS</span><h2>Discover people</h2>
    <div className="dating-card"><div className="dating-avatar">{p.emoji}</div><h3>{p.name}, {p.age}</h3><p className="muted">{p.bio}</p><div className="button-row"><button className="secondary-btn" onClick={() => setIndex((index + 1) % profiles.length)}>Pass</button><button className="primary-btn" onClick={() => { setLikes(likes + 1); setIndex((index + 1) % profiles.length); }}>♥ Like</button></div></div>
    <p className="muted small">Sample profiles only, not real or verified people. Dating must be restricted to verified adults (18+) before launch. Likes: {likes}</p>
  </section>;
}