import { heldOutCases } from "./fixtures/held-out";
import { tuningCases } from "./fixtures/tuning";
import type { BenchmarkCase, TestSet } from "./types";

export const benchmark: TestSet = {
  id: "consequential-workflows",
  version: "2026.09.1",
  description: "Synthetic deterministic cases for referral delivery safety and idempotent customer-data synchronization.",
  cases: [...tuningCases, ...heldOutCases],
};

function fixtureFingerprint(testCase: BenchmarkCase): string {
  return JSON.stringify({ workflow: testCase.workflow, input: testCase.input, deliveryCount: testCase.deliveryCount, interruptAfterWrite: testCase.interruptAfterWrite ?? false, sourceRows: testCase.sourceRows ?? [] });
}

export function validateTestSet(testSet: TestSet): void {
  const ids = new Set<string>();
  for (const testCase of testSet.cases) {
    if (ids.has(testCase.id)) throw new Error(`Duplicate benchmark case: ${testCase.id}`);
    ids.add(testCase.id);
  }
  const tuningFingerprints = new Set(testSet.cases.filter((item) => item.partition === "tuning").map(fixtureFingerprint));
  const leaked = testSet.cases.filter((item) => item.partition === "held_out" && tuningFingerprints.has(fixtureFingerprint(item)));
  if (leaked.length > 0) throw new Error(`Tuning and held-out fixtures overlap: ${leaked.map((item) => item.id).join(", ")}`);
}
