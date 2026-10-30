import { useState } from "react";
const profiles = [{ name: "Sample profile 1", age: 24, bio: "Games, music and good conversations.", emoji: "😊" }, { name: "Sample profile 2", age: 23, bio: "Music lover and weekend explorer.", emoji: "🌸" }, { name: "Sample profile 3", age: 26, bio: "Gaming and travel.", emoji: "😎" }];
export default function DatingView() {
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [index, setIndex] = useState(0);
  const [likes, setLikes] = useState(0);
  const p = profiles[index];
  return <section className="panel"><span className="eyebrow">18+ CONNECTIONS</span><h2>Discover people</h2>
    {!adultConfirmed ? <div className="dating-card"><div className="dating-avatar">🔞</div><h3>Adults only (18+)</h3><p className="muted">This is an age self-confirmation for the prototype, not identity or age verification. Do not use dating features unless you are 18 or older.</p><label style={{display:"flex",gap:10,alignItems:"center"}}><input type="checkbox" checked={adultConfirmed} onChange={e=>setAdultConfirmed(e.target.checked)}/> I confirm that I am 18 years of age or older.</label><p className="muted small">Production launch requires reliable age assurance, reporting, blocking and moderation.</p></div> :
      <div className="dating-card"><div className="dating-avatar">{p.emoji}</div><h3>{p.name}, {p.age}</h3><p className="muted">{p.bio}</p><div className="button-row"><button className="secondary-btn" onClick={() => setIndex((index + 1) % profiles.length)}>Pass</button><button className="primary-btn" onClick={() => { setLikes(likes + 1); setIndex((index + 1) % profiles.length); }}>♥ Like</button></div><p className="muted small">These are fictional demo profiles. Likes are local demo interactions and are not sent to real users.</p><button className="secondary-btn" onClick={()=>setAdultConfirmed(false)}>Exit 18+ section</button></div>}
    <p className="muted small">Dating section is a prototype. No real people or verified matches are currently shown. Likes: {likes}</p>
  </section>;
}
