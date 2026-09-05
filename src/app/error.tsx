"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page errorState" role="alert">
      <p className="eyebrow">Evidence unavailable</p>
      <h1>The release record could not be rendered.</h1>
      <p>The evaluation engine was not modified. Try rebuilding this view from the existing report.</p>
      <button className="button buttonPrimary" onClick={reset}>Try again <span>↻</span></button>
    </div>
  );
}

