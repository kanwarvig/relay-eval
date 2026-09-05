import Link from "next/link";
import type { EvaluationReport, MetricSummary } from "@/lib/eval";

export const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
export const signedPct = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}pp`;
export const money = (value: number) => `$${value.toFixed(4)}`;

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          {index < items.length - 1 ? <b aria-hidden="true">/</b> : null}
        </span>
      ))}
    </nav>
  );
}

export function PageIntro({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return (
    <header className="pageIntro reveal">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lede">{copy}</p>
      </div>
      {action ? <div className="introAction">{action}</div> : null}
    </header>
  );
}

export function DecisionBadge({ status }: { status: EvaluationReport["gate"]["status"] }) {
  return <span className={`decisionBadge ${status === "BLOCK" ? "isBlock" : "isPass"}`}><i aria-hidden="true" />{status === "BLOCK" ? "Release blocked" : "Ready to release"}</span>;
}

export function MetricCard({ label, value, compare, note, tone = "neutral" }: { label: string; value: string; compare?: string; note: string; tone?: "neutral" | "good" | "bad" }) {
  return (
    <div className={`metricCard tone-${tone}`}>
      <span className="metricLabel">{label}</span>
      <div className="metricLine"><strong>{value}</strong>{compare ? <span>{compare}</span> : null}</div>
      <p>{note}</p>
    </div>
  );
}

export function ComparisonRow({ label, baseline, candidate, delta, bad = false }: { label: string; baseline: string; candidate: string; delta: string; bad?: boolean }) {
  return (
    <div className="comparisonRow">
      <strong>{label}</strong>
      <div><span>Baseline</span><b>{baseline}</b></div>
      <div><span>Candidate</span><b className={bad ? "badText" : undefined}>{candidate}</b></div>
      <em className={bad ? "badText" : "goodText"}>{delta}</em>
    </div>
  );
}

export function SummaryMetrics({ report }: { report: EvaluationReport }) {
  const baseline: MetricSummary = report.baseline;
  const candidate: MetricSummary = report.candidate;
  return (
    <div className="comparisonList">
      <ComparisonRow label="Task success" baseline={pct(baseline.taskSuccessRate)} candidate={pct(candidate.taskSuccessRate)} delta={signedPct(report.deltas.taskSuccessRate)} bad={report.deltas.taskSuccessRate < 0} />
      <ComparisonRow label="Extraction quality" baseline={pct(baseline.extractionScore)} candidate={pct(candidate.extractionScore)} delta={signedPct(report.deltas.extractionScore)} />
      <ComparisonRow label="Duplicate writes" baseline={pct(baseline.duplicateWriteRate)} candidate={pct(candidate.duplicateWriteRate)} delta="must remain 0" bad={candidate.duplicateWriteRate > 0} />
      <ComparisonRow label="Mean simulated latency" baseline={`${baseline.meanLatencyMs} ms`} candidate={`${candidate.meanLatencyMs} ms`} delta={`${report.deltas.meanLatencyMs >= 0 ? "+" : ""}${report.deltas.meanLatencyMs} ms`} bad={report.deltas.meanLatencyMs > baseline.meanLatencyMs * 0.25} />
    </div>
  );
}

