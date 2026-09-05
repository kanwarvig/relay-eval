import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, PageIntro, pct } from "@/components/ui";
import { candidateTrials, demoReport, shortRunId, traceHref } from "@/lib/demo-report";

export const metadata: Metadata = { title: "Failure explorer" };

export default function FailuresPage() {
  const report = demoReport;
  const caseGroups = Array.from(new Map(candidateTrials.map((trial) => [trial.caseId, trial])).values());

  return (
    <div className="page">
      <Breadcrumbs items={[{ label: "Overview", href: "/" }, { label: "Failures" }]} />
      <PageIntro
        eyebrow={`Failure explorer / ${shortRunId}`}
        title="Seven fingerprints. Two unsafe patterns."
        copy="Stable assertion codes group repeat failures across workflows and seeds. Open any fingerprint to inspect a representative execution record."
        action={<Link className="button buttonSecondary" href={`/runs/${report.runId}`}>Back to decision</Link>}
      />

      <div className="explorerLayout reveal delayOne">
        <section aria-labelledby="fingerprints-title">
          <div className="listToolbar"><div><span>{report.clusters.length} fingerprints</span><h2 id="fingerprints-title">Failure clusters</h2></div><span className="quietTag">sorted critical first</span></div>
          {report.clusters.length === 0 ? (
            <div className="emptyState"><strong>No failure fingerprints</strong><p>This run has no failed candidate assertions.</p></div>
          ) : (
            <div className="clusterList">
              {report.clusters.map((cluster, index) => (
                <Link key={cluster.fingerprint} href={traceHref(cluster.exampleRunUnitId)} className="clusterCard">
                  <div className="clusterRank"><span>0{index + 1}</span><i className={cluster.severity} /></div>
                  <div className="clusterMain"><div><small>{cluster.code.replaceAll("_", " ")}</small><h3>{cluster.title}</h3></div><p>{cluster.fingerprint}</p><div className="chipRow">{cluster.caseIds.map((caseId) => <span key={caseId}>{caseId}</span>)}</div></div>
                  <div className="clusterMeta"><strong>{cluster.count}</strong><span>occurrences</span><b>Inspect trace →</b></div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="casePanel" aria-labelledby="cases-title">
          <div className="casePanelHead"><p className="eyebrow">Held-out suite</p><h2 id="cases-title">Cases in this run</h2><p>Choose one representative failed trial to inspect.</p></div>
          <div className="caseList">
            {caseGroups.map((testCase) => {
              const trials = candidateTrials.filter((trial) => trial.caseId === testCase.caseId);
              const passed = trials.filter((trial) => trial.passed).length;
              const example = trials.find((trial) => !trial.passed) ?? trials[0];
              return (
                <Link className="caseRow" href={traceHref(example.runUnitId)} key={testCase.caseId}>
                  <div><span>{testCase.workflow}</span><h3>{testCase.caseTitle}</h3><p>{testCase.caseId}</p></div>
                  <strong>{pct(passed / trials.length)}<small>passed</small></strong>
                </Link>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

