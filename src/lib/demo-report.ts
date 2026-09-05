import { runEvaluation } from "@/lib/eval";

export const demoReport = runEvaluation({
  partition: "held_out",
  trialsPerCase: 5,
  seed: 1701,
});

export const candidateTrials = demoReport.trials.filter(
  (trial) => trial.variant === demoReport.config.candidate,
);

export const failedCandidateTrials = candidateTrials.filter((trial) => !trial.passed);

export const shortRunId = demoReport.runId.replace("run-", "#").toUpperCase();

export const traceHref = (runUnitId: string) => `/traces/${encodeURIComponent(runUnitId)}`;

