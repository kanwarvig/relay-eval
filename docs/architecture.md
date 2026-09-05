# Architecture

Relay Eval is a deterministic execution harness with three adapters around one typed engine.

```text
versioned benchmark manifest
          ↓
paired case × seed scheduler
          ↓
workflow adapter → tool trace → in-memory destination state
          ↓                         ↓
quality scoring            final-state assertions
          └──────── release policy ────────┘
                    ↓
       CLI / JSON API / review UI / CI
```

The benchmark supplies inputs and injected fault timing. It does not supply outcomes. Each adapter runs operations against an isolated in-memory destination, records actual tool results, and derives assertions from the resulting records and receipts. Post-write faults serialize the store, discard the live adapter, restore a fresh instance, and replay from the recorded checkpoint.

## Boundaries

- `src/lib/eval/fixtures/tuning.ts` and `fixtures/held-out.ts` are physically separate manifests joined by `benchmark.ts`; validation rejects repeated IDs and content-equivalent inputs across splits.
- `src/lib/eval/engine.ts` owns execution, traces, final-state inspection, summaries, clustering, and the gate.
- `src/lib/eval/types.ts` is the versioned interface shared by every consumer.
- `cli/relay-eval.ts`, `app/api/runs`, and the review workbench adapt the same report without reimplementing evaluation rules.

## Reproducibility and truth hierarchy

A run unit is case, workflow version, seed, and trial index. Baseline and candidate share the same ordered case/seed pairs. Fixture and run IDs are content-derived. Final-state assertions outrank extraction quality, and failed trials remain in denominators. Binary success uncertainty uses Wilson 95% intervals; continuous metrics show 95% mean intervals and raw p50/p95 latency.

## Security and privacy

The public demo has no secrets, storage, external writes, or real patient/customer data. Every provider action, dollar amount, and latency value is a labeled deterministic test double. API query inputs are validated at the route boundary.
