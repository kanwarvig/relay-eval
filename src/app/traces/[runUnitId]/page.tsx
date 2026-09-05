import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, money } from "@/components/ui";
import { candidateTrials, shortRunId, traceHref } from "@/lib/demo-report";

export const metadata: Metadata = { title: "Execution trace" };

export const dynamic = "force-dynamic";

export default async function TracePage({ params }: { params: Promise<{ runUnitId: string }> }) {
  const { runUnitId } = await params;
  const decodedRunUnitId = decodeURIComponent(runUnitId);
  const trial = candidateTrials.find((item) => item.runUnitId === decodedRunUnitId);
  if (!trial) notFound();

  const failedAssertions = trial.assertions.filter((item) => !item.passed);
  const caseTrials = candidateTrials.filter((item) => item.caseId === trial.caseId);
  const currentIndex = caseTrials.findIndex((item) => item.runUnitId === trial.runUnitId);
  const nextTrial = caseTrials[(currentIndex + 1) % caseTrials.length];

  return (
    <div className="page tracePage">
      <Breadcrumbs items={[{ label: "Overview", href: "/" }, { label: "Failures", href: "/failures" }, { label: trial.caseId }, { label: `seed ${trial.seed}` }]} />
      <header className="traceHeader reveal">
        <div>
          <p className="eyebrow">Execution record / {shortRunId}</p>
          <div className="traceStatusLine"><span className={trial.passed ? "pass" : "block"}>{trial.passed ? "Passed" : "Failed"}</span><code>{trial.runUnitId}</code></div>
          <h1>{trial.caseTitle}</h1>
          <p className="lede">A step-by-step record of the candidate&apos;s tool calls, assertions, and stored outcome for one deterministic trial.</p>
        </div>
        <div className="traceActions"><Link className="button buttonSecondary" href="/failures">All failures</Link><Link className="button buttonPrimary" href={traceHref(nextTrial.runUnitId)}>Next seed <span>→</span></Link></div>
      </header>

      <div className="traceContext reveal delayOne">
        <span><small>Variant</small><strong>{trial.variant}</strong></span><span><small>Workflow</small><strong>{trial.workflow}</strong></span><span><small>Seed</small><strong>{trial.seed}</strong></span><span><small>Trial</small><strong>{trial.trialIndex + 1} of {reportTrialCount(trial.caseId)}</strong></span><span><small>Latency</small><strong>{trial.latencyMs} ms <i>simulated</i></strong></span><span><small>Cost</small><strong>{money(trial.costUsd)} <i>simulated</i></strong></span>
      </div>

      <div className="traceWorkspace reveal delayOne">
        <section className="timelineCard" aria-labelledby="timeline-title">
          <div className="cardHeader"><div><p className="eyebrow">Recorded execution</p><h2 id="timeline-title">Tool-call timeline</h2></div><span className="quietTag">{trial.trace.length} events</span></div>
          <ol className="timeline">
            {trial.trace.map((event) => (
              <li key={`${event.sequence}-${event.tool}`}>
                <div className="eventIndex">{String(event.sequence).padStart(2, "0")}</div>
                <div className="eventBody"><div className="eventTitle"><span className={`action action-${event.action.toLowerCase()}`}>{event.action}</span><h3>{event.tool}</h3><code>{event.stage}</code></div><div className="eventPayload"><details><summary>Arguments</summary><pre>{JSON.stringify(event.arguments, null, 2)}</pre></details><details><summary>Result</summary><pre>{JSON.stringify(event.result, null, 2)}</pre></details></div><div className="eventMeta"><span>{event.simulatedLatencyMs} ms simulated</span><span>{money(event.simulatedCostUsd)} simulated</span>{event.idempotencyKey ? <span>key: {event.idempotencyKey}</span> : null}</div></div>
              </li>
            ))}
          </ol>
        </section>

        <aside className="inspectorColumn">
          <section className="inspectorCard assertionCard">
            <div className="cardHeader"><div><p className="eyebrow">Assertions</p><h2>{failedAssertions.length} failed</h2></div></div>
            <div className="assertionList">{trial.assertions.map((item) => <div key={item.code} className={item.passed ? "assertionPass" : "assertionFail"}><span>{item.passed ? "✓" : "×"}</span><div><code>{item.code}</code><strong>{item.label}</strong><p>Expected {item.expected}<br />Observed {item.actual}</p></div></div>)}</div>
          </section>
          <section className="inspectorCard stateCard">
            <div className="cardHeader"><div><p className="eyebrow">Outcome evidence</p><h2>Final state diff</h2></div></div>
            <div className="diffList">{trial.stateDiff.map((line) => <code key={line}><span>+</span>{line}</code>)}</div>
            <details className="rawState"><summary>View raw final state</summary><pre>{JSON.stringify(trial.finalState, null, 2)}</pre></details>
          </section>
        </aside>
      </div>
    </div>
  );
}

function reportTrialCount(caseId: string) {
  return candidateTrials.filter((item) => item.caseId === caseId).length;
}
