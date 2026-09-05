import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, DecisionBadge, PageIntro, SummaryMetrics } from "@/components/ui";
import { candidateTrials, demoReport, shortRunId } from "@/lib/demo-report";

export const metadata: Metadata = { title: "Release decision" };

export function generateStaticParams() {
  return [{ id: demoReport.runId }];
}

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== demoReport.runId) notFound();

  const report = demoReport;
  const failedRules = report.gate.rules.filter((rule) => !rule.passed);

  return (
    <div className="page">
      <Breadcrumbs items={[{ label: "Overview", href: "/" }, { label: "Runs" }, { label: shortRunId }]} />
      <PageIntro
        eyebrow={`Decision record / ${shortRunId}`}
        title="This candidate does not ship."
        copy="The candidate extracted more fields, but its stored outcomes violated hard safety rules. Quality gains cannot cancel side effects."
        action={<DecisionBadge status={report.gate.status} />}
      />

      <section className="decisionBar reveal delayOne" data-testid="gate-status">
        <div><span>Release gate</span><strong>{report.gate.status}</strong></div>
        <p>{report.gate.summary}</p>
        <div className="decisionFacts"><span><b>{failedRules.length}</b> blocking rules</span><span><b>{candidateTrials.length}</b> candidate trials</span><span><b>{report.config.trialsPerCase}</b> trials per case</span></div>
      </section>

      <div className="runLayout reveal delayOne">
        <section className="contentCard" aria-labelledby="comparison-title">
          <div className="cardHeader"><div><p className="eyebrow">Paired comparison</p><h2 id="comparison-title">Baseline vs. candidate</h2></div><span className="quietTag">95% confidence</span></div>
          <SummaryMetrics report={report} />
          <p className="cardFootnote">Latency and cost are simulated. The success and extraction comparisons use the same held-out cases and seeds for both versions.</p>
        </section>

        <aside className="nextPanel">
          <p className="eyebrow">Next move</p>
          <h2>Diagnose the unsafe effects.</h2>
          <p>Start with critical failure fingerprints, then open a recorded trace to verify the final state.</p>
          <Link className="button buttonPrimary" href="/failures">Explore {report.clusters.length} failure fingerprints <span>→</span></Link>
          <Link className="textLink" href="/methodology">Check the evaluation method</Link>
        </aside>
      </div>

      <section className="rulesSection reveal delayTwo" aria-labelledby="rules-title">
        <div className="sectionTitle inlineTitle"><div><p className="eyebrow">Predeclared policy</p><h2 id="rules-title">Every rule stands on its own.</h2></div><span>{report.gate.rules.filter((rule) => rule.passed).length} passed / {failedRules.length} blocked</span></div>
        <div className="ruleList">
          {report.gate.rules.map((rule, index) => (
            <article className="ruleCard" key={rule.id}>
              <span className="ruleIndex">0{index + 1}</span>
              <div className="ruleName"><small>{rule.kind.replaceAll("_", " ")}</small><h3>{rule.label}</h3></div>
              <div className="ruleMeasure"><span>Required</span><strong>{rule.threshold}</strong></div>
              <div className="ruleMeasure"><span>Observed</span><strong>{rule.observed}</strong></div>
              <span className={`ruleResult ${rule.passed ? "pass" : "block"}`}>{rule.passed ? "Pass" : "Block"}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
