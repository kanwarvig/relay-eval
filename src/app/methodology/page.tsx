import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, PageIntro } from "@/components/ui";
import { demoReport, shortRunId } from "@/lib/demo-report";

export const metadata: Metadata = { title: "Methodology" };

export default function MethodologyPage() {
  const report = demoReport;
  return (
    <div className="page methodPage">
      <Breadcrumbs items={[{ label: "Overview", href: "/" }, { label: "Methodology" }]} />
      <PageIntro
        eyebrow={`Methodology / benchmark ${report.testSet.version}`}
        title="A release gate built around outcomes."
        copy="Relay Eval compares workflow versions on the same held-out cases and recorded seeds, then applies hard invariants before quality or budget trade-offs."
        action={<Link className="button buttonPrimary" href={`/runs/${report.runId}`}>See current decision <span>→</span></Link>}
      />

      <section className="methodFlow reveal delayOne" aria-labelledby="method-flow-title">
        <div className="sectionTitle"><p className="eyebrow">Evaluation sequence / {shortRunId}</p><h2 id="method-flow-title">What the harness actually does</h2></div>
        <ol>
          <li><span>01</span><div><h3>Run paired trials</h3><p>Baseline {report.config.baseline} and candidate {report.config.candidate} execute the same held-out cases across {report.config.seeds.length} recorded seeds.</p></div></li>
          <li><span>02</span><div><h3>Record effects</h3><p>Each trial stores tool calls, idempotency keys, assertions, and the final state—not only the workflow&apos;s response.</p></div></li>
          <li><span>03</span><div><h3>Apply the release policy</h3><p>Hard invariants and evidence completeness are evaluated before non-inferiority and simulated latency budgets.</p></div></li>
        </ol>
      </section>

      <div className="methodGrid reveal delayTwo">
        <section className="methodCard"><p className="eyebrow">Evidence included</p><h2>What this demo proves</h2><ul><li>Recorded seeds reproduce deterministic test-double behavior.</li><li>Final-state checks expose duplicate writes and unsupported persisted values.</li><li>The gate blocks this candidate because {report.gate.rules.filter((rule) => !rule.passed).length} predeclared rules fail.</li><li>Every planned candidate trial has a trace and final state in this report.</li></ul></section>
        <section className="methodCard boundaryCard"><p className="eyebrow">Evidence boundary</p><h2>What it does not prove</h2><ul><li>No live provider or production system is connected.</li><li>Adapters, latency, and cost are explicitly simulated.</li><li>Inputs contain no real patient or customer data.</li><li>This is not a claim of HIPAA compliance, production fitness, agent determinism, or general safety.</li></ul></section>
      </div>

      <section className="provenance reveal delayTwo"><div><span>Fixture hash</span><code>{report.testSet.fixtureHash}</code></div><div><span>Harness</span><code>{report.harnessVersion}</code></div><div><span>Generated</span><code>{report.generatedAt}</code></div><div><span>Machine-readable</span><Link href="/api/runs">/api/runs</Link></div></section>
    </div>
  );
}

