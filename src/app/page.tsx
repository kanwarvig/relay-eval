import Link from "next/link";
import { DecisionBadge, MetricCard, pct, signedPct } from "@/components/ui";
import { candidateTrials, demoReport, shortRunId, traceHref } from "@/lib/demo-report";

export default function Home() {
  const report = demoReport;
  const failedRules = report.gate.rules.filter((rule) => !rule.passed);
  const firstFailure = candidateTrials.find((trial) => !trial.passed) ?? candidateTrials[0];

  return (
    <div className="page homePage">
      <section className="homeHero reveal">
        <div className="heroCopy">
          <p className="eyebrow">Workflow release control / {shortRunId}</p>
          <DecisionBadge status={report.gate.status} />
          <h1>Know what the workflow <em>did</em> before it ships.</h1>
          <p className="lede">Run workflow versions repeatedly. Check tool calls and final state. Block a release when one unsafe effect outweighs a better-looking answer.</p>
          <div className="heroActions">
            <Link className="button buttonPrimary" href={`/runs/${report.runId}`}>Review blocked release <span>↗</span></Link>
            <Link className="button buttonSecondary" href={traceHref(firstFailure.runUnitId)}>Open a failed trace</Link>
          </div>
        </div>
        <div className="decisionConsole" data-testid="gate-status">
          <div className="consoleTop"><span>Current decision</span><code>{shortRunId}</code></div>
          <strong className="consoleStatus">{report.gate.status}</strong>
          <p>{report.gate.summary}</p>
          <div className="consoleRules"><span><b>{failedRules.length}</b> rules failed</span><span><b>{candidateTrials.length}</b> candidate trials</span><span><b>{report.clusters.length}</b> failure fingerprints</span></div>
          <Link href={`/runs/${report.runId}`} className="consoleLink">Open decision record <span>→</span></Link>
        </div>
      </section>

      <section className="guidedSection reveal delayOne" aria-labelledby="guided-title">
        <div className="sectionTitle"><p className="eyebrow">One review, three moves</p><h2 id="guided-title">Follow the evidence, not the prose.</h2></div>
        <div className="stepGrid">
          <Link href={`/runs/${report.runId}`} className="stepCard"><span>01</span><div><small>Decide</small><h3>Read the release gate</h3><p>See the candidate against every predeclared rule.</p></div><b>→</b></Link>
          <Link href="/failures" className="stepCard"><span>02</span><div><small>Diagnose</small><h3>Group repeat failures</h3><p>Find stable fingerprints across cases and seeds.</p></div><b>→</b></Link>
          <Link href={traceHref(firstFailure.runUnitId)} className="stepCard"><span>03</span><div><small>Verify</small><h3>Inspect the final state</h3><p>Trace the write, assertion, and stored outcome.</p></div><b>→</b></Link>
        </div>
      </section>

      <section className="snapshotSection reveal delayTwo" aria-labelledby="snapshot-title">
        <div className="sectionTitle inlineTitle"><div><p className="eyebrow">Candidate snapshot</p><h2 id="snapshot-title">Quality rose. Safety regressed.</h2></div><Link href={`/runs/${report.runId}`}>Full comparison →</Link></div>
        <div className="metricGrid">
          <MetricCard label="Task success" value={pct(report.candidate.taskSuccessRate)} compare={signedPct(report.deltas.taskSuccessRate)} note={`95% CI ${pct(report.candidate.taskSuccessInterval.low)}–${pct(report.candidate.taskSuccessInterval.high)}`} tone="bad" />
          <MetricCard label="Extraction quality" value={pct(report.candidate.extractionScore)} compare={signedPct(report.deltas.extractionScore)} note={`95% CI ${pct(report.candidate.extractionInterval.low)}–${pct(report.candidate.extractionInterval.high)}`} tone="good" />
          <MetricCard label="Duplicate writes" value={pct(report.candidate.duplicateWriteRate)} compare="must be 0" note="Final-state invariant; no offsetting allowed" tone="bad" />
        </div>
      </section>

      <aside className="boundaryNote reveal delayTwo"><span>Evidence boundary</span><p>Adapters, latency, and cost are simulated. The harness reproduces side effects for recorded seeds; it does not claim production fitness, compliance, or general safety.</p><Link href="/methodology">Read methodology →</Link></aside>
    </div>
  );
}
