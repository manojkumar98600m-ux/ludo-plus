type Props = { onClose: () => void };
export default function MembershipModal({ onClose }: Props) {
  return <div className="modal-backdrop" role="presentation"><div className="modal panel" role="dialog" aria-modal="true" aria-labelledby="member-title">
    <button className="close-btn" onClick={onClose} aria-label="Close">×</button><div className="crown">♛</div><span className="eyebrow">LUDO PLUS VIP</span><h2 id="member-title">Premium Membership</h2>
    <div className="price">₹50 <small>/ 90 days</small></div><ul className="feature-list"><li>Premium profile styling</li><li>VIP membership badge</li><li>Access to eligible premium features</li></ul>
    <button className="disabled-btn" disabled>PhonePe setup pending</button><p className="muted small">Payments are disabled. No money will be charged and membership cannot activate until official PhonePe merchant integration and server-side verification are completed.</p>
  </div></div>;
}