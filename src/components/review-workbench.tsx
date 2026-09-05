"use client";

import { useMemo, useState } from "react";
import type { EvaluationReport, TrialResult } from "@/lib/eval";

type Tab = "gate" | "failures" | "traces";
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const money = (value: number) => `$${value.toFixed(4)}`;

function Metric({ label, value, delta, foot, bad = false }: { label: string; value: string; delta?: string; foot: string; bad?: boolean }) {
  return <div className="metric"><div className="metricLabel">{label}</div><div className={`metricValue ${bad ? "deltaBad" : ""}`}>{value}{delta && <small className={bad ? "deltaBad" : "deltaUp"}>{delta}</small>}</div><div className="metricFoot">{foot}</div></div>;
}

export function ReviewWorkbench({ report }: { report: EvaluationReport }) {
  const [tab, setTab] = useState<Tab>("gate");
  const candidateTrials = useMemo(() => report.trials.filter((trial) => trial.variant === report.config.candidate), [report]);
  const failedTrials = useMemo(() => candidateTrials.filter((trial) => !trial.passed), [candidateTrials]);
  const [selectedRun, setSelectedRun] = useState(failedTrials[0]?.runUnitId ?? candidateTrials[0].runUnitId);
  const selectedTrial = report.trials.find((trial) => trial.runUnitId === selectedRun) ?? candidateTrials[0];
  const failedRules = report.gate.rules.filter((rule) => !rule.passed).length;
  const cases = Array.from(new Map(candidateTrials.map((trial) => [trial.caseId, trial])).values());

  return <div className="shell">
    <header className="topbar"><div className="brand"><span className="brandMark">R/</span><span>Relay Eval</span></div><div className="topMeta"><span>benchmark {report.testSet.version}</span><span className="syntheticBadge">Synthetic deterministic demo</span></div></header>
    <main className="main">
      <section className="hero">
        <div><p className="eyebrow">Release evidence / run {report.runId.replace("run-", "#")}</p><h1>Trust the outcome, <span>not the answer.</span></h1></div>
        <div className="heroSide"><p>Paired, seeded workflow trials inspect tool calls and final state. This candidate extracts more fields—and still does not ship.</p><div className="runLine"><span className="statusDot" /> {report.config.trialsPerCase} trials × {cases.length} held-out cases × 2 versions</div></div>
      </section>
      <section aria-label="Release gate result" data-testid="gate-status">
        <div className="gateBanner"><div className="gateWord">{report.gate.status}</div><div className="gateCopy"><strong>Candidate {report.config.candidate.replace("candidate-", "")} is blocked from release.</strong><span>{report.gate.summary}</span></div><div className="gateCount"><b>{failedRules}</b> rules failed</div></div>
        <div className="metricGrid">
          <Metric label="Extraction quality" value={pct(report.candidate.extractionScore)} delta={`+${pct(report.deltas.extractionScore)}`} foot={`95% CI ${pct(report.candidate.extractionInterval.low)}–${pct(report.candidate.extractionInterval.high)}`} />
          <Metric label="Task success" value={pct(report.candidate.taskSuccessRate)} delta={pct(report.deltas.taskSuccessRate)} foot={`Wilson 95% CI ${pct(report.candidate.taskSuccessInterval.low)}–${pct(report.candidate.taskSuccessInterval.high)}`} bad={report.deltas.taskSuccessRate < 0} />
          <Metric label="Duplicate writes" value={pct(report.candidate.duplicateWriteRate)} delta="must be 0" foot="Final-state invariant · no offsetting allowed" bad />
          <Metric label="Cost / success" value={report.candidate.costPerSuccessUsd === null ? "n/a" : money(report.candidate.costPerSuccessUsd)} foot={`${money(report.candidate.totalCostUsd)} total · mean 95% CI ${money(report.candidate.costInterval.low)}–${money(report.candidate.costInterval.high)} · simulated`} />
        </div>
      </section>
      <div className="workspace">
        <section className="surface">
          <div className="tabBar" role="tablist" aria-label="Evaluation review views">
            <button className="tab" role="tab" aria-selected={tab === "gate"} onClick={() => setTab("gate")}>Gate rules</button>
            <button className="tab" role="tab" aria-selected={tab === "failures"} onClick={() => setTab("failures")}>Failure clusters <span className="pill">{report.clusters.length}</span></button>
            <button className="tab" role="tab" aria-selected={tab === "traces"} onClick={() => setTab("traces")}>Execution traces</button>
          </div>
          {tab === "gate" && <GatePanel report={report} />}
          {tab === "failures" && <FailurePanel report={report} onInspect={(runId) => { setSelectedRun(runId); setTab("traces"); }} />}
          {tab === "traces" && <TracePanel trials={failedTrials.length ? failedTrials : candidateTrials} selected={selectedTrial} onSelect={setSelectedRun} />}
        </section>
        <aside className="surface aside">
          <div className="asideHead"><span>Held-out suite</span><strong>Consequential workflows</strong></div>
          {cases.map((testCase) => { const caseTrials = candidateTrials.filter((trial) => trial.caseId === testCase.caseId); const passRate = caseTrials.filter((trial) => trial.passed).length / caseTrials.length; return <div className="caseCard" key={testCase.caseId}><div className="caseCardTop"><strong>{testCase.caseTitle}</strong><span className="pill">{testCase.workflow}</span></div><p>{testCase.caseId} · {caseTrials.length} planned trials · {pct(passRate)} passed</p><div className="scorebar"><span style={{ width: `${passRate * 100}%`, background: passRate === 1 ? "var(--teal)" : "var(--orange)" }} /></div></div>; })}
        </aside>
      </div>
      <div className="methodNote"><strong>What this proves.</strong> The adapters, cost, and latency are explicitly simulated; inputs contain no real patient or customer data. The harness deterministically reproduces side effects for the recorded seeds. It does not claim that agents are deterministic, HIPAA compliance, production fitness, or general safety.</div>
      <footer className="footer"><span>fixture {report.testSet.fixtureHash} · harness {report.harnessVersion}</span><span>API: /api/runs · CLI: npm run eval</span></footer>
    </main>
  </div>;
}

function GatePanel({ report }: { report: EvaluationReport }) {
  return <div className="panel"><div className="sectionHead"><div><h2>Predeclared release policy</h2><p>Hard invariants are evaluated before quality and budget trade-offs.</p></div><span className="pill">held-out only</span></div><div className="tableWrap"><table><thead><tr><th>Rule</th><th>Threshold</th><th>Observed</th><th>Decision</th></tr></thead><tbody>{report.gate.rules.map((rule) => <tr key={rule.id}><td><strong>{rule.label}</strong><div className="ruleKind">{rule.kind.replace("_", " ")}</div></td><td>{rule.threshold}</td><td>{rule.observed}</td><td><span className={rule.passed ? "pass" : "fail"}>{rule.passed ? "✓ Pass" : "× Block"}</span></td></tr>)}</tbody></table></div></div>;
}

function FailurePanel({ report, onInspect }: { report: EvaluationReport; onInspect: (runId: string) => void }) {
  return <div className="panel"><div className="sectionHead"><div><h2>Deterministic failure fingerprints</h2><p>Clusters group stable assertion code + workflow + final tool—not prose similarity.</p></div></div><div className="clusterList">{report.clusters.map((cluster) => <button key={cluster.fingerprint} className="cluster" onClick={() => onInspect(cluster.exampleRunUnitId)}><span className="clusterCount">{cluster.count}</span><span><strong>{cluster.title}</strong><small>{cluster.fingerprint} · {cluster.caseIds.join(", ")}</small></span><span className="fail">Inspect →</span></button>)}</div></div>;
}

function TracePanel({ trials, selected, onSelect }: { trials: TrialResult[]; selected: TrialResult; onSelect: (id: string) => void }) {
  return <div className="panel"><div className="sectionHead"><div><h2>Trace → assertion → final state</h2><p>The stored outcome outranks a plausible final response.</p></div><span className="pill">seed {selected.seed}</span></div><div className="traceGrid"><div className="trialList">{trials.map((trial) => <button key={trial.runUnitId} className={`trialButton ${trial.runUnitId === selected.runUnitId ? "active" : ""}`} onClick={() => onSelect(trial.runUnitId)}><strong>{trial.caseTitle}</strong><span>{trial.seed} · {trial.assertions.filter((item) => !item.passed).length} failed assertions</span></button>)}</div><div><div className="trace">{selected.trace.map((event) => <div className="traceEvent" key={`${event.sequence}-${event.tool}`}><code>0{event.sequence} / {event.action}</code><strong>{event.tool}</strong><div className="traceMeta"><span>{event.simulatedLatencyMs} ms</span><span>{money(event.simulatedCostUsd)}</span>{event.idempotencyKey && <span>key: {event.idempotencyKey}</span>}</div></div>)}</div><div className="stateBox"><strong>FINAL STATE DIFF</strong>{selected.stateDiff.map((line) => <div key={line}>+ {line}</div>)}<br />{selected.assertions.filter((item) => !item.passed).map((item) => <div key={item.code} style={{ color: "#ff8a66" }}>× {item.code}: expected {item.expected}; observed {item.actual}</div>)}</div></div></div></div>;
}
