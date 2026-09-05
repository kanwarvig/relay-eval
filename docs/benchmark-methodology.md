# Benchmark methodology

## Dataset and partitions

Benchmark `consequential-workflows@2026.09.1` contains eight synthetic cases: four referral-delivery cases and four customer-sync cases. Each workflow has two tuning and two held-out cases. IDs are validated as unique and the code rejects split overlap. Release decisions use held-out cases only.

## Trials

The default plan predeclares five seeds (`1701 + trialIndex × 101`) per case. Baseline and candidate execute paired trials with identical inputs, faults, adapter, and scorer. The seeded variation changes extraction completeness and simulated timing; state transitions and release decisions remain fully reproducible.

## Metrics

- Task success requires every assertion to pass.
- Extraction score is the fraction of expected administrative fields mapped.
- Duplicate and unsupported-field rates include every failed trial in the denominator.
- Wilson 95% intervals are reported for task success.
- Mean intervals plus p50/p95 are reported for simulated latency; cost per success is omitted if no task succeeds. Version comparisons use matched case/seed pairs and report 95% mean-difference intervals for quality, success, latency, and cost.

The sample is intentionally small and does not establish production safety, clinical fitness, compliance, or general model quality.
