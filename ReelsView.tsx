import { useEffect, useState } from "react";
import { api, getPlayerId, type Reel } from "./api";

export default function ReelsView() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [name, setName] = useState(() => localStorage.getItem("ludo-plus-chat-name") || "Player");
  const [caption, setCaption] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    try { const result = await api.getReels(); setReels(result.reels); }
    catch { setError("Reels server connect नहीं हुआ। Backend deploy जाँचें।"); }
  }
  useEffect(() => { void refresh(); }, []);

  async function publish() {
    if (!videoUrl.trim()) { setError("पहले direct video URL डालें।"); return; }
    setBusy(true); setError("");
    try {
      await api.createReel(name.trim() || "Player", caption, videoUrl.trim());
      setCaption(""); setVideoUrl(""); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Reel publish नहीं हुई।"); }
    finally { setBusy(false); }
  }

  async function toggleLike(reel: Reel) {
    try {
      const result = await api.toggleReelLike(reel.id);
      setReels(items => items.map(item => item.id === reel.id ? result.reel : item));
    } catch (e) { setError(e instanceof Error ? e.message : "Like नहीं हुआ।"); }
  }

  const playerId = getPlayerId();
  return <section className="panel">
    <div className="section-head"><div><span className="eyebrow">SHORT VIDEOS</span><h2>Reels</h2></div><span className="tag">{reels.length} videos</span></div>
    <div className="form-stack" style={{display:"grid",gap:10,marginBottom:20}}>
      <label className="muted small">Your name</label>
      <input value={name} onChange={e=>setName(e.target.value)} maxLength={24} placeholder="Display name" />
      <label className="muted small">Direct video URL (HTTPS, MP4/WebM)</label>
      <input value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} placeholder="https://example.com/video.mp4" inputMode="url" />
      <input value={caption} onChange={e=>setCaption(e.target.value)} maxLength={300} placeholder="Write a caption..." />
      <button className="primary-btn" disabled={busy} onClick={()=>void publish()}>{busy ? "Publishing…" : "＋ Publish reel"}</button>
      <p className="muted small">यह अभी direct video link लेता है; phone से video file upload अभी उपलब्ध नहीं है। केवल अपने या permission वाले videos share करें।</p>
    </div>
    {error && <p role="alert" className="muted small">{error}</p>}
    {reels.length === 0 && <div className="reel-preview"><div className="reel-emoji">🎬</div><div className="reel-caption"><b>Reels feed तैयार है</b><span>अपना HTTPS video link डालकर पहली reel publish करें।</span></div></div>}
    <div style={{display:"grid",gap:18}}>
      {reels.map(reel=><article key={reel.id} className="panel" style={{padding:12}}>
        <video src={reel.videoUrl} controls playsInline preload="metadata" style={{width:"100%",maxHeight:520,aspectRatio:"9 / 16",objectFit:"contain",background:"#080711",borderRadius:14}} />
        <p style={{marginBottom:6}}><b>{reel.displayName}</b>{reel.caption ? " · "+reel.caption : ""}</p>
        <button className="secondary-btn" onClick={()=>void toggleLike(reel)}>{reel.likes.includes(playerId) ? "♥ Liked" : "♡ Like"} · {reel.likes.length}</button>
      </article>)}
    </div>
  </section>;
}
