import { useState } from "react";
import { authConfigured, getCurrentUser, signIn, signUp, clearSession, updateUserProfile, type AuthUser } from "./auth";

export default function AuthPanel() {
  const [user, setUser] = useState<AuthUser | null>(() => getCurrentUser());
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [displayName, setDisplayName] = useState(() => localStorage.getItem("ludo_plus_profile_name") || "");
  const [bio, setBio] = useState(() => localStorage.getItem("ludo_plus_profile_bio") || "");
  async function submit() {
    setBusy(true); setMessage("");
    try {
      const result = mode === "login" ? await signIn(email, password) : await signUp(email, password);
      setUser(result); setPassword(""); setMessage("Account connected successfully.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }
  async function saveProfile() {
    if (!user) return;
    setBusy(true); setMessage("");
    try { const saved = await updateUserProfile(user, { displayName, bio }); setDisplayName(saved.displayName); setBio(saved.bio); localStorage.setItem("ludo_plus_profile_name", saved.displayName); localStorage.setItem("ludo_plus_profile_bio", saved.bio); setMessage("Profile saved to your account."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Profile save failed."); }
    finally { setBusy(false); }
  }
  return <section className="panel" style={{marginBottom:18}}>
    <span className="eyebrow">YOUR ACCOUNT</span><h2>{user ? "Welcome" : mode === "login" ? "Login" : "Create account"}</h2>
    {user ? <><p>{user.email}</p><label>Display name<input value={displayName} maxLength={40} onChange={e=>setDisplayName(e.target.value)} placeholder="Your name"/></label><label>About you<textarea value={bio} maxLength={160} onChange={e=>setBio(e.target.value)} placeholder="Write a short bio"/></label><div className="button-row"><button className="primary-btn" disabled={busy || !displayName.trim()} onClick={()=>void saveProfile()}>{busy ? "Saving…" : "Save profile"}</button><button className="secondary-btn" onClick={() => { clearSession(); setUser(null); setMessage("Logged out."); }}>Logout</button></div></> :
      <><p className="muted small">{authConfigured() ? "Use your email and password." : "Secure account connection is ready, but Supabase frontend keys must be configured before signup/login can work."}</p>
      <label>Email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
      <label>Password<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label>
      <div className="button-row"><button className="primary-btn" disabled={busy || !email.includes("@") || password.length<6 || !authConfigured()} onClick={()=>void submit()}>{busy ? "Please wait…" : mode === "login" ? "Login" : "Sign up"}</button><button className="secondary-btn" onClick={()=>{setMode(mode === "login" ? "signup" : "login");setMessage("");}}>{mode === "login" ? "Create account" : "I have an account"}</button></div></>}
    {message && <p className="muted small" role="status">{message}</p>}
  </section>;
}
