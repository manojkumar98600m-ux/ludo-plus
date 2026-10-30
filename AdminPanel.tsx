export default function AdminPanel() {
  return <section className="panel"><span className="eyebrow">CONTROL CENTER</span><h2>Admin overview</h2>
    <div className="stats-grid"><div className="stat"><span>App</span><b>LUDO PLUS</b></div><div className="stat"><span>Membership</span><b>₹50 / 90 days</b></div><div className="stat"><span>PhonePe</span><b>Setup pending</b></div></div>
    <p className="muted small">Demo dashboard only. Do not expose admin controls publicly. A secure server-side admin login, role checks and audit logs are required before production use.</p>
  </section>;
}