import type { BenchmarkCase } from "../types";

export const tuningCases: BenchmarkCase[] = [
  { id: "ref-tune-clean", title: "Complete orthopedic referral", workflow: "referral", partition: "tuning", input: { patient: "SYN-102", reason: "knee pain", destination: "ortho-east", priorityHint: "routine" }, expectedFields: { patient: "SYN-102", reason: "knee pain", priority: "routine" }, deliveryCount: 1 },
  { id: "ref-tune-retry", title: "Retry after acknowledgement loss", workflow: "referral", partition: "tuning", input: { patient: "SYN-118", reason: "wrist pain", destination: "ortho-east", priorityHint: "routine" }, expectedFields: { patient: "SYN-118", reason: "wrist pain", priority: "routine" }, deliveryCount: 2, interruptAfterWrite: true },
  { id: "sync-tune-page", title: "Paginated customer import", workflow: "integration", partition: "tuning", input: { source: "crm-a", destination: "erp-b", cursor: "page-02" }, expectedFields: { checkpoint: "page-03", status: "reconciled" }, deliveryCount: 1, sourceRows: [{ externalId: "CUS-10", value: "active" }, { externalId: "CUS-11", value: "active" }] },
  { id: "sync-tune-replay", title: "Safe replay of prior page", workflow: "integration", partition: "tuning", input: { source: "crm-a", destination: "erp-b", cursor: "page-07" }, expectedFields: { checkpoint: "page-08", status: "reconciled" }, deliveryCount: 2, sourceRows: [{ externalId: "CUS-32", value: "active" }] },
];
