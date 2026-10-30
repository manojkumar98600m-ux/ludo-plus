import { useState } from "react";
import { authConfigured, getCurrentUser, signIn, signUp, clearSession, type AuthUser } from "./auth";

export default function AuthPanel() {
  const [user, setUser] = useState<AuthUser | null>(() => getCurrentUser());
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit() {
    setBusy(true); setMessage("");
    try {
      const result = mode === "login" ? await signIn(email, password) : await signUp(email, password);
      setUser(result); setPassword(""); setMessage("Account connected successfully.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <section className="panel" style={{marginBottom:18}}>
    <span className="eyebrow">YOUR ACCOUNT</span><h2>{user ? "Welcome" : mode === "login" ? "Login" : "Create account"}</h2>
    {user ? <><p>{user.email}</p><button className="secondary-btn" onClick={() => { clearSession(); setUser(null); setMessage("Logged out."); }}>Logout</button></> :
      <><p className="muted small">{authConfigured() ? "Use your email and password." : "Secure account connection is ready, but Supabase frontend keys must be configured before signup/login can work."}</p>
      <label>Email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
      <label>Password<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label>
      <div className="button-row"><button className="primary-btn" disabled={busy || !email.includes("@") || password.length<6 || !authConfigured()} onClick={()=>void submit()}>{busy ? "Please wait…" : mode === "login" ? "Login" : "Sign up"}</button><button className="secondary-btn" onClick={()=>{setMode(mode === "login" ? "signup" : "login");setMessage("");}}>{mode === "login" ? "Create account" : "I have an account"}</button></div></>}
    {message && <p className="muted small" role="status">{message}</p>}
  </section>;
}
