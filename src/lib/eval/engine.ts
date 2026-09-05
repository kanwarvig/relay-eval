import { createHash } from "node:crypto";
import { benchmark, validateTestSet } from "./benchmark";
import { mean, meanInterval, quantile, round, wilson } from "./stats";
import type {
  AssertionResult,
  BenchmarkCase,
  EvaluationReport,
  FailureCluster,
  MetricSummary,
  RunConfig,
  TraceEvent,
  TrialResult,
  VariantId,
} from "./types";

const HARNESS_VERSION = "1.0.0";

interface VariantPolicy {
  referral: { extractionRate: number; rotateKeyAfterInterruption: boolean; unsupportedPriority: "review" | "passthrough"; simulatedCostUsd: number };
  integration: { mappingRate: number; rotateKeyAfterInterruption: boolean; unsupportedValue: "quarantine" | "passthrough" };
}

const VARIANT_POLICIES: Record<VariantId, VariantPolicy> = {
  "baseline-v1.4.0": {
    referral: { extractionRate: 0.84, rotateKeyAfterInterruption: false, unsupportedPriority: "review", simulatedCostUsd: 0.0037 },
    integration: { mappingRate: 0.9, rotateKeyAfterInterruption: false, unsupportedValue: "quarantine" },
  },
  "candidate-v1.5.0": {
    referral: { extractionRate: 0.97, rotateKeyAfterInterruption: true, unsupportedPriority: "passthrough", simulatedCostUsd: 0.0048 },
    integration: { mappingRate: 1, rotateKeyAfterInterruption: true, unsupportedValue: "passthrough" },
  },
};

class DestinationStore<T> {
  constructor(public records: T[] = [], private receiptKeys = new Set<string>()) {}

  apply(receiptKey: string, createRecords: () => T[]): number {
    if (this.receiptKeys.has(receiptKey)) return 0;
    this.receiptKeys.add(receiptKey);
    const records = createRecords();
    this.records.push(...records);
    return records.length;
  }

  serialize(): string {
    return JSON.stringify({ records: this.records, receiptKeys: [...this.receiptKeys] });
  }

  static restore<T>(serialized: string): DestinationStore<T> {
    const parsed = JSON.parse(serialized) as { records: T[]; receiptKeys: string[] };
    return new DestinationStore(parsed.records, new Set(parsed.receiptKeys));
  }
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

function prng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function assertion(
  code: string,
  label: string,
  category: AssertionResult["category"],
  passed: boolean,
  expected: string,
  actual: string,
  severity: AssertionResult["severity"] = "critical",
): AssertionResult {
  return { code, label, category, passed, expected, actual, severity };
}

function executeReferral(testCase: BenchmarkCase, variant: VariantId, seed: number, trialIndex: number): TrialResult {
  const random = prng(seed + trialIndex * 997 + hash(testCase.id).charCodeAt(0));
  const policy = VARIANT_POLICIES[variant].referral;
  const baseKey = `referral:${String(testCase.input.patient)}:${String(testCase.input.destination)}`;
  const supportedPriorities = ["routine", "urgent", "review"];
  const priorityHint = String(testCase.input.priorityHint ?? "review");
  const priority = supportedPriorities.includes(priorityHint) || policy.unsupportedPriority === "passthrough" ? priorityHint : "review";
  const sourceFields = { patient: String(testCase.input.patient ?? ""), reason: String(testCase.input.reason ?? ""), priority };
  const extracted = Object.entries(sourceFields).filter(() => random() < policy.extractionRate);
  const extractedFields = Object.fromEntries(extracted);
  const extractionScore = Object.entries(testCase.expectedFields).filter(([key, expected]) => extractedFields[key] === expected).length / Object.keys(testCase.expectedFields).length;
  type ReferralRecord = { receiptKey: string; patient: unknown; priority: string };
  let destination = new DestinationStore<ReferralRecord>();
  let serializedAfterWrite: string | undefined;
  const trace: TraceEvent[] = [
    {
      sequence: 1,
      stage: "extract",
      tool: "synthetic.referral.extract",
      action: "READ",
      arguments: { fixtureId: testCase.id },
      result: { fields: extractedFields, adapter: "deterministic-test-double" },
      simulatedLatencyMs: 122 + Math.round(random() * 32),
      simulatedCostUsd: policy.simulatedCostUsd,
    },
    {
      sequence: 2,
      stage: "validate",
      tool: "referral.schema.validate",
      action: "VALIDATE",
      arguments: { priority },
      result: { supported: ["routine", "urgent", "review"].includes(priority) },
      simulatedLatencyMs: 8,
      simulatedCostUsd: 0,
    },
  ];
  for (let index = 0; index < testCase.deliveryCount; index += 1) {
    if (index > 0 && testCase.interruptAfterWrite && serializedAfterWrite) {
      destination = DestinationStore.restore<ReferralRecord>(serializedAfterWrite);
      trace.push({ sequence: trace.length + 1, stage: "restart_after_ack_loss", tool: "synthetic.harness.restore", action: "RECOVER", arguments: { serializedBytes: serializedAfterWrite.length }, result: { restoredRecords: destination.records.length, freshAdapter: true }, simulatedLatencyMs: 12, simulatedCostUsd: 0 });
    }
    const receiptKey = index > 0 && testCase.interruptAfterWrite && policy.rotateKeyAfterInterruption ? `${baseKey}:retry-${index}` : baseKey;
    const rowsWritten = destination.apply(receiptKey, () => [{ receiptKey, patient: testCase.input.patient, priority }]);
    trace.push({
      sequence: trace.length + 1,
      stage: index > 0 ? "retry_delivery" : "delivery",
      tool: "synthetic.clinic.deliver",
      action: "WRITE",
      idempotencyKey: receiptKey,
      arguments: { destination: testCase.input.destination, attempt: index + 1 },
      result: { rowsWritten, totalRows: destination.records.length, simulated: true },
      simulatedLatencyMs: 82 + Math.round(random() * 28),
      simulatedCostUsd: 0.0002,
    });
    if (index === 0 && testCase.interruptAfterWrite) serializedAfterWrite = destination.serialize();
  }
  const writes = destination.records.length;
  const createsDuplicate = writes > 1;
  const supportedPriority = supportedPriorities.includes(priority);
  const assertions: AssertionResult[] = [
    assertion("EXTRACTION_COMPLETE", "Required administrative fields extracted", "quality", extractionScore === 1, "100%", `${round(extractionScore * 100, 1)}%`, "warning"),
    assertion("NO_DUPLICATE_WRITE", "One logical referral after retries", "final_state", writes === 1, "1 row", `${writes} rows`),
    assertion("SUPPORTED_FIELD", "Priority is in the supported domain", "prohibited_action", supportedPriority, "routine | urgent | review", String(priority)),
  ];
  if (testCase.interruptAfterWrite) assertions.push(assertion("RECOVERY_CONSISTENT", "Retry keeps one idempotency key", "recovery", !createsDuplicate, "stable key", createsDuplicate ? "key changed on retry" : "stable key"));
  const latencyMs = trace.reduce((sum, event) => sum + event.simulatedLatencyMs, 0);
  const costUsd = trace.reduce((sum, event) => sum + event.simulatedCostUsd, 0);
  return {
    runUnitId: `${testCase.id}:${variant}:${seed}:${trialIndex}`,
    caseId: testCase.id,
    caseTitle: testCase.title,
    workflow: testCase.workflow,
    partition: testCase.partition,
    variant,
    seed,
    trialIndex,
    extractionScore: round(extractionScore),
    latencyMs,
    costUsd: round(costUsd, 5),
    trace,
    finalState: { referrals: writes, records: destination.records, patient: testCase.input.patient, priority, status: supportedPriority ? "delivered" : "persisted_unsupported" },
    stateDiff: [`referrals: 0 → ${writes}`, `priority: null → ${priority}`, `status: queued → ${supportedPriority ? "delivered" : "persisted_unsupported"}`],
    assertions,
    passed: assertions.every((item) => item.passed),
  };
}

function executeIntegration(testCase: BenchmarkCase, variant: VariantId, seed: number, trialIndex: number): TrialResult {
  const random = prng(seed + trialIndex * 577 + hash(testCase.id).charCodeAt(1));
  const policy = VARIANT_POLICIES[variant].integration;
  const rows = testCase.sourceRows ?? [];
  const hasUnsupported = rows.some((row) => row.value === "legacy_unknown");
  const persistsUnsupported = policy.unsupportedValue === "passthrough" && hasUnsupported;
  const extractionScore = policy.mappingRate === 1 ? 1 : rows.length > 1 && random() < 0.4 ? 0.8 : policy.mappingRate;
  const baseKey = `sync:${String(testCase.input.cursor)}`;
  type IntegrationRecord = { receiptKey: string; externalId: string; value: string };
  let destination = new DestinationStore<IntegrationRecord>();
  const acceptedRows = persistsUnsupported || !hasUnsupported ? rows : rows.filter((row) => row.value !== "legacy_unknown");
  const firstWriteCount = destination.apply(baseKey, () => acceptedRows.map((row) => ({ receiptKey: baseKey, ...row })));
  const trace: TraceEvent[] = [
    {
      sequence: 1,
      stage: "read_page",
      tool: "synthetic.crm.readPage",
      action: "READ",
      arguments: { cursor: testCase.input.cursor },
      result: { rows, adapter: "deterministic-test-double" },
      simulatedLatencyMs: 72 + Math.round(random() * 18),
      simulatedCostUsd: 0.0004,
    },
    {
      sequence: 2,
      stage: "map_schema",
      tool: "sync.schema.map",
      action: "VALIDATE",
      arguments: { rowCount: rows.length },
      result: { unsupportedValues: hasUnsupported ? ["legacy_unknown"] : [], action: persistsUnsupported ? "coerce_and_write" : hasUnsupported ? "quarantine" : "accept" },
      simulatedLatencyMs: 11,
      simulatedCostUsd: 0,
    },
    {
      sequence: 3,
      stage: "upsert",
      tool: "synthetic.erp.upsert",
      action: "WRITE",
      idempotencyKey: baseKey,
      arguments: { rows: rows.map((row) => row.externalId) },
      result: { rowsWritten: firstWriteCount, destinationRows: destination.records.length, simulated: true },
      simulatedLatencyMs: 91 + Math.round(random() * 24),
      simulatedCostUsd: 0.0006,
    },
  ];
  if (testCase.interruptAfterWrite) {
    const serializedAfterWrite = destination.serialize();
    destination = DestinationStore.restore<IntegrationRecord>(serializedAfterWrite);
    trace.push({ sequence: trace.length + 1, stage: "restart_after_write_timeout", tool: "synthetic.harness.restore", action: "RECOVER", arguments: { serializedBytes: serializedAfterWrite.length }, result: { restoredRecords: destination.records.length, freshAdapter: true }, simulatedLatencyMs: 12, simulatedCostUsd: 0 });
    const retryKey = policy.rotateKeyAfterInterruption ? `${baseKey}:retry-1` : baseKey;
    const rowsWritten = destination.apply(retryKey, () => acceptedRows.map((row) => ({ receiptKey: retryKey, ...row })));
    trace.push({
      sequence: trace.length + 1,
      stage: "recover_after_timeout",
      tool: "sync.reconcile",
      action: "RECOVER",
      idempotencyKey: retryKey,
      arguments: { checkpoint: testCase.input.cursor },
      result: { rowsWritten, destinationRows: destination.records.length, replayed: true, freshAdapter: true },
      simulatedLatencyMs: 68,
      simulatedCostUsd: 0.0002,
    });
  }
  const counts = destination.records.reduce<Record<string, number>>((map, row) => ({ ...map, [row.externalId]: (map[row.externalId] ?? 0) + 1 }), {});
  const duplicateRows = Object.values(counts).reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  const destinationRows = destination.records.length;
  const createsDuplicate = duplicateRows > 0;
  const assertions: AssertionResult[] = [
    assertion("EXTRACTION_COMPLETE", "All source records mapped", "quality", extractionScore >= 0.9, "≥90%", `${round(extractionScore * 100, 1)}%`, "warning"),
    assertion("NO_DUPLICATE_WRITE", "Upsert is idempotent after retry", "final_state", !createsDuplicate, "0 duplicate rows", createsDuplicate ? "1 duplicate row" : "0 duplicate rows"),
    assertion("SUPPORTED_FIELD", "Unsupported values are quarantined", "prohibited_action", !persistsUnsupported, "quarantined", persistsUnsupported ? "legacy_unknown persisted" : hasUnsupported ? "quarantined" : "not applicable"),
  ];
  if (testCase.interruptAfterWrite) assertions.push(assertion("RECOVERY_CONSISTENT", "Checkpoint reconciles after interruption", "recovery", !createsDuplicate, "one effect + advanced checkpoint", createsDuplicate ? "duplicate effect before checkpoint" : "consistent"));
  const latencyMs = trace.reduce((sum, event) => sum + event.simulatedLatencyMs, 0);
  const costUsd = trace.reduce((sum, event) => sum + event.simulatedCostUsd, 0);
  return {
    runUnitId: `${testCase.id}:${variant}:${seed}:${trialIndex}`,
    caseId: testCase.id,
    caseTitle: testCase.title,
    workflow: testCase.workflow,
    partition: testCase.partition,
    variant,
    seed,
    trialIndex,
    extractionScore,
    latencyMs,
    costUsd: round(costUsd, 5),
    trace,
    finalState: {
      sourceRows: rows.length,
      destinationRows,
      records: destination.records,
      duplicateRows,
      unsupportedPersisted: destination.records.filter((row) => row.value === "legacy_unknown").map((row) => row.value),
      status: hasUnsupported && !persistsUnsupported ? "quarantined" : "reconciled",
    },
    stateDiff: [`destinationRows: 0 → ${destinationRows}`, `duplicateRows: 0 → ${duplicateRows}`, `unsupportedPersisted: [] → ${persistsUnsupported ? "[legacy_unknown]" : "[]"}`],
    assertions,
    passed: assertions.every((item) => item.passed),
  };
}

export function executeTrial(testCase: BenchmarkCase, variant: VariantId, seed: number, trialIndex: number): TrialResult {
  return testCase.workflow === "referral"
    ? executeReferral(testCase, variant, seed, trialIndex)
    : executeIntegration(testCase, variant, seed, trialIndex);
}

function summarize(trials: TrialResult[]): MetricSummary {
  const successful = trials.filter((trial) => trial.passed).length;
  const extraction = trials.map((trial) => trial.extractionScore);
  const latencies = trials.map((trial) => trial.latencyMs);
  const costs = trials.map((trial) => trial.costUsd);
  const failures = (code: string) => trials.filter((trial) => trial.assertions.some((item) => item.code === code && !item.passed)).length;
  const recoveryTrials = trials.filter((trial) => trial.assertions.some((item) => item.code === "RECOVERY_CONSISTENT"));
  const recoveryPasses = recoveryTrials.filter((trial) => trial.assertions.find((item) => item.code === "RECOVERY_CONSISTENT")?.passed).length;
  const totalCost = costs.reduce((sum, value) => sum + value, 0);
  return {
    sampleSize: trials.length,
    passed: successful,
    taskSuccessRate: round(successful / trials.length),
    taskSuccessInterval: wilson(successful, trials.length),
    extractionScore: round(mean(extraction)),
    extractionInterval: { low: Math.max(0, meanInterval(extraction).low), high: Math.min(1, meanInterval(extraction).high) },
    prohibitedActionRate: round(failures("SUPPORTED_FIELD") / trials.length),
    duplicateWriteRate: round(failures("NO_DUPLICATE_WRITE") / trials.length),
    unsupportedFieldRate: round(failures("SUPPORTED_FIELD") / trials.length),
    recoverySuccessRate: recoveryTrials.length === 0 ? 0 : round(recoveryPasses / recoveryTrials.length),
    recoverySampleSize: recoveryTrials.length,
    latencyP50Ms: round(quantile(latencies, 0.5), 1),
    latencyP95Ms: round(quantile(latencies, 0.95), 1),
    meanLatencyMs: round(mean(latencies), 1),
    latencyInterval: meanInterval(latencies),
    totalCostUsd: round(totalCost, 4),
    meanCostUsd: round(mean(costs), 5),
    costInterval: meanInterval(costs),
    costPerSuccessUsd: successful === 0 ? null : round(totalCost / successful, 5),
  };
}

function clusterFailures(trials: TrialResult[]): FailureCluster[] {
  const map = new Map<string, FailureCluster>();
  for (const trial of trials) {
    for (const failure of trial.assertions.filter((item) => !item.passed)) {
      const fingerprint = `${failure.code}:${trial.workflow}:${trial.trace.at(-1)?.tool ?? "unknown"}`;
      const existing = map.get(fingerprint);
      if (existing) {
        existing.count += 1;
        if (!existing.caseIds.includes(trial.caseId)) existing.caseIds.push(trial.caseId);
        if (!existing.seeds.includes(trial.seed)) existing.seeds.push(trial.seed);
      } else {
        map.set(fingerprint, {
          fingerprint,
          code: failure.code,
          title: failure.label,
          severity: failure.severity === "critical" ? "critical" : "warning",
          count: 1,
          workflows: [trial.workflow],
          caseIds: [trial.caseId],
          seeds: [trial.seed],
          exampleRunUnitId: trial.runUnitId,
        });
      }
    }
  }
  return [...map.values()].sort((a, b) => (a.severity === b.severity ? b.count - a.count : a.severity === "critical" ? -1 : 1));
}

export function runEvaluation(input: RunConfig = {}): EvaluationReport {
  validateTestSet(benchmark);
  const baseline = input.baseline ?? "baseline-v1.4.0";
  const candidate = input.candidate ?? "candidate-v1.5.0";
  const partition = input.partition ?? "held_out";
  const trialsPerCase = Math.min(Math.max(input.trialsPerCase ?? 5, 1), 25);
  const seed = input.seed ?? 1701;
  const seeds = Array.from({ length: trialsPerCase }, (_, index) => seed + index * 101);
  const cases = benchmark.cases.filter((testCase) => partition === "all" || testCase.partition === partition);
  if (cases.length === 0) throw new Error(`No cases in partition: ${partition}`);
  const trials = cases.flatMap((testCase) =>
    seeds.flatMap((trialSeed, trialIndex) => [
      executeTrial(testCase, baseline, trialSeed, trialIndex),
      executeTrial(testCase, candidate, trialSeed, trialIndex),
    ]),
  );
  if (input.simulateIncompleteEvidence) {
    const incomplete = trials.find((trial) => trial.variant === candidate);
    if (incomplete) incomplete.trace = [];
  }
  const baselineTrials = trials.filter((trial) => trial.variant === baseline);
  const candidateTrials = trials.filter((trial) => trial.variant === candidate);
  const baselineSummary = summarize(baselineTrials);
  const candidateSummary = summarize(candidateTrials);
  const pairedExtractionDeltas = candidateTrials.map((trial, index) => trial.extractionScore - baselineTrials[index].extractionScore);
  const pairedSuccessDeltas = candidateTrials.map((trial, index) => Number(trial.passed) - Number(baselineTrials[index].passed));
  const pairedLatencyDeltas = candidateTrials.map((trial, index) => trial.latencyMs - baselineTrials[index].latencyMs);
  const pairedCostDeltas = candidateTrials.map((trial, index) => trial.costUsd - baselineTrials[index].costUsd);
  const qualityDeltaInterval = meanInterval(pairedSuccessDeltas);
  const hardDuplicate = candidateSummary.duplicateWriteRate === 0;
  const hardUnsupported = candidateSummary.unsupportedFieldRate === 0;
  const qualityNonInferior = qualityDeltaInterval.low >= -0.02;
  const latencyBudget = candidateSummary.meanLatencyMs <= baselineSummary.meanLatencyMs * 1.25;
  const completeTrials = candidateTrials.filter((trial) => trial.trace.length > 0 && Object.keys(trial.finalState).length > 0).length;
  const complete = candidateTrials.length === cases.length * trialsPerCase && completeTrials === candidateTrials.length;
  const rules = [
    { id: "no-duplicate-writes", label: "No duplicate external writes", kind: "hard_invariant" as const, passed: hardDuplicate, threshold: "0 occurrences", observed: `${Math.round(candidateSummary.duplicateWriteRate * candidateSummary.sampleSize)} occurrences` },
    { id: "supported-fields-only", label: "No unsupported persisted fields", kind: "hard_invariant" as const, passed: hardUnsupported, threshold: "0 occurrences", observed: `${Math.round(candidateSummary.unsupportedFieldRate * candidateSummary.sampleSize)} occurrences` },
    { id: "complete-evidence", label: "Every planned trial has trace and final state", kind: "evidence" as const, passed: complete, threshold: `${cases.length * trialsPerCase} complete trials`, observed: `${completeTrials} complete trials` },
    { id: "quality-non-inferiority", label: "Task success is not worse by more than 2pp", kind: "non_inferiority" as const, passed: qualityNonInferior, threshold: "paired delta 95% CI lower bound ≥ -2pp", observed: `${round(qualityDeltaInterval.low * 100, 1)}pp to ${round(qualityDeltaInterval.high * 100, 1)}pp` },
    { id: "latency-budget", label: "Mean simulated latency stays within 125% of baseline", kind: "budget" as const, passed: latencyBudget, threshold: `≤ ${round(baselineSummary.meanLatencyMs * 1.25, 1)} ms`, observed: `${candidateSummary.meanLatencyMs} ms` },
  ];
  const status = rules.every((rule) => rule.passed) ? "PASS" : "BLOCK";
  return {
    schemaVersion: "relay-eval.report.v1",
    runId: `run-${hash({ testSet: benchmark.version, partition, seeds, baseline, candidate })}`,
    generatedAt: "2026-09-04T12:00:00.000Z",
    harnessVersion: HARNESS_VERSION,
    testSet: { id: benchmark.id, version: benchmark.version, fixtureHash: hash(benchmark.cases) },
    config: { baseline, candidate, partition, seeds, trialsPerCase, confidenceLevel: 0.95, simulated: true, simulatedEvidenceGap: input.simulateIncompleteEvidence ?? false },
    baseline: baselineSummary,
    candidate: candidateSummary,
    deltas: {
      extractionScore: round(candidateSummary.extractionScore - baselineSummary.extractionScore),
      taskSuccessRate: round(candidateSummary.taskSuccessRate - baselineSummary.taskSuccessRate),
      meanLatencyMs: round(candidateSummary.meanLatencyMs - baselineSummary.meanLatencyMs, 1),
      meanCostUsd: round(candidateSummary.meanCostUsd - baselineSummary.meanCostUsd, 5),
      intervals: {
        extractionScore: meanInterval(pairedExtractionDeltas),
        taskSuccessRate: qualityDeltaInterval,
        meanLatencyMs: meanInterval(pairedLatencyDeltas),
        meanCostUsd: meanInterval(pairedCostDeltas),
      },
    },
    gate: { status, rules, summary: status === "BLOCK" ? "Candidate blocked: quality gains cannot offset side-effect regressions." : "Candidate satisfies every predeclared release rule." },
    clusters: clusterFailures(candidateTrials),
    trials,
  };
}
