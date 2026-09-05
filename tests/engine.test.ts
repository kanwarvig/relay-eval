import { describe, expect, it } from "vitest";
import { benchmark, executeTrial, runEvaluation, validateTestSet } from "@/lib/eval";

describe("deterministic evaluation engine", () => {
  it("reproduces identical reports for identical inputs", () => {
    expect(runEvaluation({ seed: 42 })).toEqual(runEvaluation({ seed: 42 }));
  });

  it("keeps tuning and held-out case identifiers disjoint", () => {
    expect(() => validateTestSet(benchmark)).not.toThrow();
    const tuning = new Set(benchmark.cases.filter((item) => item.partition === "tuning").map((item) => item.id));
    expect(benchmark.cases.filter((item) => item.partition === "held_out").every((item) => !tuning.has(item.id))).toBe(true);
  });

  it("executes the adapter and captures tool calls plus inspected final state", () => {
    const testCase = benchmark.cases.find((item) => item.id === "ref-held-duplicate")!;
    const trial = executeTrial(testCase, "candidate-v1.5.0", 1701, 0);
    expect(trial.trace.map((event) => event.tool)).toContain("synthetic.clinic.deliver");
    expect(trial.finalState).toMatchObject({ referrals: 2 });
    expect(trial.assertions.find((item) => item.code === "NO_DUPLICATE_WRITE")?.passed).toBe(false);
  });

  it("proves the candidate mutation changes final state", () => {
    const testCase = benchmark.cases.find((item) => item.id === "sync-held-timeout")!;
    const baseline = executeTrial(testCase, "baseline-v1.4.0", 1701, 0);
    const candidate = executeTrial(testCase, "candidate-v1.5.0", 1701, 0);
    expect(candidate.finalState).not.toEqual(baseline.finalState);
    expect(candidate.finalState).toMatchObject({ duplicateRows: 2 });
  });

  it("derives duplicate failure from fault timing and policy, not a case id", () => {
    const original = benchmark.cases.find((item) => item.id === "ref-held-duplicate")!;
    const perturbed = { ...original, id: "novel-retry-case", input: { ...original.input, patient: "SYN-NOVEL" } };
    const trial = executeTrial(perturbed, "candidate-v1.5.0", 22, 0);
    expect(trial.finalState).toMatchObject({ referrals: 2, patient: "SYN-NOVEL" });
    expect(trial.assertions.find((item) => item.code === "NO_DUPLICATE_WRITE")?.passed).toBe(false);
  });

  it("blocks an extraction-improving candidate with consequential regressions", () => {
    const report = runEvaluation({ partition: "held_out", trialsPerCase: 5, seed: 1701 });
    expect(report.deltas.extractionScore).toBeGreaterThan(0);
    expect(report.candidate.duplicateWriteRate).toBeGreaterThan(0);
    expect(report.candidate.unsupportedFieldRate).toBeGreaterThan(0);
    expect(report.gate.status).toBe("BLOCK");
  });

  it("reports Wilson uncertainty and retains failed trials in the denominator", () => {
    const report = runEvaluation({ trialsPerCase: 3 });
    expect(report.candidate.sampleSize).toBe(12);
    expect(report.candidate.taskSuccessInterval.low).toBeLessThanOrEqual(report.candidate.taskSuccessRate);
    expect(report.candidate.taskSuccessInterval.high).toBeGreaterThanOrEqual(report.candidate.taskSuccessRate);
  });

  it("creates stable rule-based failure clusters", () => {
    const first = runEvaluation({ seed: 9 });
    const second = runEvaluation({ seed: 9 });
    expect(first.clusters).toEqual(second.clusters);
    expect(first.clusters.some((cluster) => cluster.code === "NO_DUPLICATE_WRITE")).toBe(true);
  });
});
