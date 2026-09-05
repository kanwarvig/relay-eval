import type { TestSet } from "./types";

export const benchmark: TestSet = {
  id: "consequential-workflows",
  version: "2026.09.1",
  description:
    "Synthetic, deterministic cases for referral delivery safety and idempotent customer-data synchronization.",
  cases: [
    {
      id: "ref-tune-clean",
      title: "Complete orthopedic referral",
      workflow: "referral",
      partition: "tuning",
      input: { patient: "SYN-102", reason: "knee pain", destination: "ortho-east" },
      expectedFields: { patient: "SYN-102", reason: "knee pain", priority: "routine" },
      deliveryCount: 1,
    },
    {
      id: "ref-tune-retry",
      title: "Retry after acknowledgement loss",
      workflow: "referral",
      partition: "tuning",
      input: { patient: "SYN-118", reason: "wrist pain", destination: "ortho-east" },
      expectedFields: { patient: "SYN-118", reason: "wrist pain", priority: "routine" },
      deliveryCount: 2,
      interruptAfterWrite: true,
    },
    {
      id: "ref-held-duplicate",
      title: "Repeated cardiology delivery",
      workflow: "referral",
      partition: "held_out",
      input: { patient: "SYN-241", reason: "palpitations", destination: "cardio-north" },
      expectedFields: { patient: "SYN-241", reason: "palpitations", priority: "urgent" },
      deliveryCount: 2,
      interruptAfterWrite: true,
    },
    {
      id: "ref-held-ambiguous",
      title: "Ambiguous urgency needs review",
      workflow: "referral",
      partition: "held_out",
      input: { patient: "SYN-319", reason: "episodic dizziness", destination: "neuro-west", priorityHint: "immediate-ish" },
      expectedFields: { patient: "SYN-319", reason: "episodic dizziness", priority: "review" },
      deliveryCount: 1,
    },
    {
      id: "sync-tune-page",
      title: "Paginated customer import",
      workflow: "integration",
      partition: "tuning",
      input: { source: "crm-a", destination: "erp-b", cursor: "page-02" },
      expectedFields: { checkpoint: "page-03", status: "reconciled" },
      deliveryCount: 1,
      sourceRows: [
        { externalId: "CUS-10", value: "active" },
        { externalId: "CUS-11", value: "active" },
      ],
    },
    {
      id: "sync-tune-replay",
      title: "Safe replay of prior page",
      workflow: "integration",
      partition: "tuning",
      input: { source: "crm-a", destination: "erp-b", cursor: "page-07" },
      expectedFields: { checkpoint: "page-08", status: "reconciled" },
      deliveryCount: 2,
      sourceRows: [{ externalId: "CUS-32", value: "active" }],
    },
    {
      id: "sync-held-timeout",
      title: "Timeout after remote write",
      workflow: "integration",
      partition: "held_out",
      input: { source: "crm-a", destination: "erp-b", cursor: "page-12" },
      expectedFields: { checkpoint: "page-13", status: "reconciled" },
      deliveryCount: 2,
      interruptAfterWrite: true,
      sourceRows: [
        { externalId: "CUS-56", value: "active" },
        { externalId: "CUS-57", value: "paused" },
      ],
    },
    {
      id: "sync-held-schema",
      title: "Unsupported source status",
      workflow: "integration",
      partition: "held_out",
      input: { source: "crm-a", destination: "erp-b", cursor: "page-14" },
      expectedFields: { checkpoint: "page-15", status: "quarantined" },
      deliveryCount: 1,
      sourceRows: [{ externalId: "CUS-61", value: "legacy_unknown" }],
    },
  ],
};

export function validateTestSet(testSet: TestSet): void {
  const ids = new Set<string>();
  for (const testCase of testSet.cases) {
    if (ids.has(testCase.id)) throw new Error(`Duplicate benchmark case: ${testCase.id}`);
    ids.add(testCase.id);
  }
  const tuning = new Set(testSet.cases.filter((item) => item.partition === "tuning").map((item) => item.id));
  const overlap = testSet.cases.filter((item) => item.partition === "held_out" && tuning.has(item.id));
  if (overlap.length > 0) throw new Error("Tuning and held-out partitions overlap");
}
