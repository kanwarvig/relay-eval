export default function Loading() {
  return (
    <div className="page loadingState" role="status" aria-live="polite">
      <div className="loadingMark" aria-hidden="true"><span /><span /><span /></div>
      <p className="eyebrow">Loading evidence</p>
      <h1>Reconstructing the release record…</h1>
      <p>Pairing trials, assertions, and final-state evidence.</p>
    </div>
  );
}

