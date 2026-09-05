import type { BenchmarkCase } from "../types";

export const heldOutCases: BenchmarkCase[] = [
  { id: "ref-held-duplicate", title: "Repeated cardiology delivery", workflow: "referral", partition: "held_out", input: { patient: "SYN-241", reason: "palpitations", destination: "cardio-north", priorityHint: "urgent" }, expectedFields: { patient: "SYN-241", reason: "palpitations", priority: "urgent" }, deliveryCount: 2, interruptAfterWrite: true },
  { id: "ref-held-ambiguous", title: "Ambiguous urgency needs review", workflow: "referral", partition: "held_out", input: { patient: "SYN-319", reason: "episodic dizziness", destination: "neuro-west", priorityHint: "immediate-ish" }, expectedFields: { patient: "SYN-319", reason: "episodic dizziness", priority: "review" }, deliveryCount: 1 },
  { id: "sync-held-timeout", title: "Timeout after remote write", workflow: "integration", partition: "held_out", input: { source: "crm-a", destination: "erp-b", cursor: "page-12" }, expectedFields: { checkpoint: "page-13", status: "reconciled" }, deliveryCount: 2, interruptAfterWrite: true, sourceRows: [{ externalId: "CUS-56", value: "active" }, { externalId: "CUS-57", value: "paused" }] },
  { id: "sync-held-schema", title: "Unsupported source status", workflow: "integration", partition: "held_out", input: { source: "crm-a", destination: "erp-b", cursor: "page-14" }, expectedFields: { checkpoint: "page-15", status: "quarantined" }, deliveryCount: 1, sourceRows: [{ externalId: "CUS-61", value: "legacy_unknown" }] },
];
