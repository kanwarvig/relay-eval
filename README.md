# Relay Eval

Relay Eval is an agent/workflow evaluation harness and release gate, not a generic metrics dashboard. It executes paired seeded trials, captures tool calls and destination state, then blocks a candidate when consequential side effects regress—even if extraction quality improves.

The included benchmark exercises two workflows:

- synthetic healthcare referral extraction and retry-safe delivery;
- synthetic customer migration/sync with interruption recovery and reconciliation.

`candidate-v1.5.0` has a reusable policy mutation: it rotates idempotency keys after a post-write interruption and passes unsupported source values through. The adapter actually executes those operations against an isolated destination. The gate observes duplicate records and unsupported persisted values, then blocks release.

## Run it

Requires Node.js 24+.

```bash
npm install
npm run dev

# Machine-readable full report
npm run eval -- run --partition held_out --trials 5 --seed 1701 --out artifacts/report.json

# Compact version comparison
npm run eval -- compare --partition held_out

# Real CI semantics: exits 1 because the included candidate is blocked
npm run eval:gate
```

The public JSON endpoint is `GET /api/runs?partition=held_out&trials=5&seed=1701`. Errors use one structured `{ error: { code, message, details? } }` contract.

## What is measured

Task success, extraction quality, duplicate-write rate, unsupported-field rate, recovery success, simulated cost, cost per successful task, and simulated p50/p95 latency. Reports include sample size, Wilson 95% success intervals, continuous mean intervals, the complete case/seed plan, raw assertions, traces, final state, and deterministic failure fingerprints.

## Requirement-to-evidence matrix

| Requirement | Implementation evidence | Verification evidence |
|---|---|---|
| Versioned tuning and held-out cases | `src/lib/eval/benchmark.ts` | split validation test |
| Seeded repeated paired trials | `runEvaluation` in `engine.ts` | deterministic equality test; report `config.seeds` |
| Tool calls and final-state truth | workflow adapters in `engine.ts` | adapter execution and mutated-state tests; Execution traces UI |
| Duplicate/prohibited-action gate | hard rules in `runEvaluation` | blocked candidate test; `npm run eval:gate` exits 1 |
| Quality, uncertainty, cost, latency | `stats.ts` and `summarize` | Wilson/denominator test; metric cards/API JSON |
| Version comparison and failure clusters | report `deltas` and `clusterFailures` | CLI compare test; Failure clusters UI |
| CI release semantics | `cli/relay-eval.ts` and GitHub Actions | CLI exit tests; uploaded JSON artifact |
| Review workflow | `review-workbench.tsx` | Playwright gate → cluster → trace flow |

## Design boundaries

Everything is local and synthetic: no real patient/customer data, external providers, secrets, or durable writes. Workflow adapters, cost, and latency are test doubles. The benchmark proves only that this recorded candidate fails this recorded suite under these seeds. It does not claim deterministic agents, production readiness, HIPAA compliance, certification, or universal regression prevention.

Read the [architecture](docs/architecture.md), [benchmark method](docs/benchmark-methodology.md), [hard-invariant ADR](docs/adr-001-hard-invariants.md), and [release runbook](docs/runbook.md).

## Verify

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
npm run test:e2e
```

MIT licensed.
