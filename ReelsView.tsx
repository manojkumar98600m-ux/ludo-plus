import { useEffect, useState } from "react";
import { api, getPlayerId, type Reel } from "./api";

function fileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Video read नहीं हुआ।"));
    reader.onerror = () => reject(new Error("Video read नहीं हुआ।"));
    reader.readAsDataURL(file);
  });
}

export default function ReelsView() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [name, setName] = useState(() => localStorage.getItem("ludo-plus-chat-name") || "Player");
  const [caption, setCaption] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    try { const result = await api.getReels(); setReels(result.reels); }
    catch { setError("Reels server connect नहीं हुआ। Backend deploy जाँचें।"); }
  }
  useEffect(() => { void refresh(); }, []);

  async function publish() {
    if (!videoFile && !videoUrl.trim()) { setError("Video file चुनें या direct video URL डालें।"); return; }
    setBusy(true); setError("");
    try {
      let finalVideoUrl = videoUrl.trim();
      if (videoFile) {
        const dataUrl = await fileAsDataUrl(videoFile);
        const uploaded = await api.uploadVideo(dataUrl, videoFile.type);
        finalVideoUrl = uploaded.videoUrl;
      }
      await api.createReel(name.trim() || "Player", caption, finalVideoUrl);
      setCaption(""); setVideoUrl(""); setVideoFile(null);
      const input = document.getElementById("ludo-reel-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await refresh();
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
      <label className="muted small">Phone से video चुनें (MP4, WebM, MOV; max 8 MB)</label>
      <input id="ludo-reel-file" type="file" accept="video/mp4,video/webm,video/quicktime" onChange={e=>{const file=e.target.files?.[0]||null;if(file&&file.size>100*1024*1024){setError("Video 100 MB या उससे छोटी होनी चाहिए।");e.currentTarget.value="";setVideoFile(null);return;}setError("");setVideoFile(file);if(file)setVideoUrl("");}} />
      <label className="muted small">या direct video URL (HTTPS)</label>
      <input value={videoUrl} onChange={e=>{setVideoUrl(e.target.value);if(e.target.value)setVideoFile(null);}} placeholder="https://example.com/video.mp4" inputMode="url" />
      <input value={caption} onChange={e=>setCaption(e.target.value)} maxLength={300} placeholder="Write a caption..." />
      <button className="primary-btn" disabled={busy} onClick={()=>void publish()}>{busy ? "Uploading / publishing…" : "＋ Publish reel"}</button>
      <p className="muted small">Video upload के लिए Supabase Storage में public <b>ludo-media</b> bucket और backend में SUPABASE_URL तथा SUPABASE_SERVICE_ROLE_KEY सेट होना ज़रूरी है।</p>
    </div>
    {error && <p role="alert" className="muted small">{error}</p>}
    {reels.length === 0 && <div className="reel-preview"><div className="reel-emoji">🎬</div><div className="reel-caption"><b>Reels feed तैयार है</b><span>Video upload करें या HTTPS link से पहली reel publish करें।</span></div></div>}
    <div style={{display:"grid",gap:18}}>
      {reels.map(reel=><article key={reel.id} className="panel" style={{padding:12}}>
        <video src={reel.videoUrl} controls playsInline preload="metadata" style={{width:"100%",maxHeight:520,aspectRatio:"9 / 16",objectFit:"contain",background:"#080711",borderRadius:14}} />
        <p style={{marginBottom:6}}><b>{reel.displayName}</b>{reel.caption ? " · "+reel.caption : ""}</p>
        <button className="secondary-btn" onClick={()=>void toggleLike(reel)}>{reel.likes.includes(playerId) ? "♥ Liked" : "♡ Like"} · {reel.likes.length}</button>
      </article>)}
    </div>
  </section>;
}
