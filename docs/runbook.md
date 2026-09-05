# Release runbook

1. Freeze workflow code, benchmark version, gate thresholds, and seed plan.
2. Run `npm run eval -- run --partition tuning --out artifacts/tuning.json` while iterating.
3. Run `npm run eval:gate -- --out artifacts/held-out.json` exactly once for the release candidate.
4. Interpret exit `0` as pass, `1` as a valid blocked release, `2` as invalid configuration, and `3` as incomplete evidence.
5. Inspect `gate.rules`, then `clusters`, then the cluster's `exampleRunUnitId` in `trials` to see raw trace, assertions, and final state.
6. Never waive `hard_invariant` failures with quality gains. Repair the adapter or destination policy and create a new candidate version.

Exit `3` is fail-closed evidence handling. It is exercised with `npm run eval -- gate --simulate-incomplete`, which removes a required trace from an otherwise valid run and must never be treated as a product pass/fail result.

For the included unsafe fixture, CI uses `--expect block` so the workflow is green only when the known regression is caught. Real release jobs must omit that option.

## Commands

```bash
npm run eval -- run --partition held_out --trials 5 --seed 1701 --out artifacts/report.json
npm run eval -- compare --partition held_out --trials 5
npm run eval:gate
npm run test:coverage
PLAYWRIGHT_BASE_URL=https://your-alias.example npm run test:e2e
```
