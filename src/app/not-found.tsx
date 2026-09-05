import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page notFound">
      <p className="eyebrow">Evidence not found / 404</p>
      <h1>That record is not in this benchmark.</h1>
      <p>The run or trace may be malformed, or it may not belong to the current deterministic report.</p>
      <Link className="button buttonPrimary" href="/">Return to overview <span>→</span></Link>
    </div>
  );
}

