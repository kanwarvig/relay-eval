export type Workflow = "referral" | "integration";
export type Partition = "tuning" | "held_out";
export type VariantId = "baseline-v1.4.0" | "candidate-v1.5.0";

export interface BenchmarkCase {
  id: string;
  title: string;
  workflow: Workflow;
  partition: Partition;
  input: Record<string, unknown>;
  expectedFields: Record<string, string>;
  deliveryCount: number;
  interruptAfterWrite?: boolean;
  sourceRows?: Array<{ externalId: string; value: string }>;
}

export interface TestSet {
  id: string;
  version: string;
  description: string;
  cases: BenchmarkCase[];
}

export interface TraceEvent {
  sequence: number;
  stage: string;
  tool: string;
  action: "READ" | "WRITE" | "VALIDATE" | "RECOVER";
  idempotencyKey?: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown>;
  simulatedLatencyMs: number;
  simulatedCostUsd: number;
}

export interface AssertionResult {
  code: string;
  label: string;
  category: "quality" | "final_state" | "prohibited_action" | "recovery";
  passed: boolean;
  expected: string;
  actual: string;
  severity: "info" | "warning" | "critical";
}

export interface TrialResult {
  runUnitId: string;
  caseId: string;
  caseTitle: string;
  workflow: Workflow;
  partition: Partition;
  variant: VariantId;
  seed: number;
  trialIndex: number;
  extractionScore: number;
  latencyMs: number;
  costUsd: number;
  trace: TraceEvent[];
  finalState: Record<string, unknown>;
  stateDiff: string[];
  assertions: AssertionResult[];
  passed: boolean;
}

export interface Interval {
  low: number;
  high: number;
}

export interface MetricSummary {
  sampleSize: number;
  passed: number;
  taskSuccessRate: number;
  taskSuccessInterval: Interval;
  extractionScore: number;
  extractionInterval: Interval;
  prohibitedActionRate: number;
  duplicateWriteRate: number;
  unsupportedFieldRate: number;
  recoverySuccessRate: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  meanLatencyMs: number;
  latencyInterval: Interval;
  totalCostUsd: number;
  meanCostUsd: number;
  costInterval: Interval;
  costPerSuccessUsd: number | null;
}

export interface FailureCluster {
  fingerprint: string;
  code: string;
  title: string;
  severity: "warning" | "critical";
  count: number;
  workflows: Workflow[];
  caseIds: string[];
  seeds: number[];
  exampleRunUnitId: string;
}

export interface GateRuleResult {
  id: string;
  label: string;
  kind: "hard_invariant" | "non_inferiority" | "budget" | "evidence";
  passed: boolean;
  threshold: string;
  observed: string;
}

export interface EvaluationReport {
  schemaVersion: "relay-eval.report.v1";
  runId: string;
  generatedAt: string;
  harnessVersion: string;
  testSet: { id: string; version: string; fixtureHash: string };
  config: {
    baseline: VariantId;
    candidate: VariantId;
    partition: Partition | "all";
    seeds: number[];
    trialsPerCase: number;
    confidenceLevel: 0.95;
    simulated: true;
  };
  baseline: MetricSummary;
  candidate: MetricSummary;
  deltas: {
    extractionScore: number;
    taskSuccessRate: number;
    meanLatencyMs: number;
    meanCostUsd: number;
    intervals: {
      extractionScore: Interval;
      taskSuccessRate: Interval;
      meanLatencyMs: Interval;
      meanCostUsd: Interval;
    };
  };
  gate: {
    status: "PASS" | "BLOCK";
    rules: GateRuleResult[];
    summary: string;
  };
  clusters: FailureCluster[];
  trials: TrialResult[];
}

export interface RunConfig {
  baseline?: VariantId;
  candidate?: VariantId;
  partition?: Partition | "all";
  seed?: number;
  trialsPerCase?: number;
}
