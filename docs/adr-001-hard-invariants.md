# ADR-001: Hard side-effect invariants precede quality trade-offs

Status: accepted — 2026-09-04

## Context

An automated workflow can produce a better-looking extraction while writing a referral twice or persisting a value the destination does not support. A weighted aggregate score can hide that failure.

## Decision

The release policy evaluates duplicate writes, unsupported persisted fields, prohibited actions, and evidence completeness as non-compensable hard invariants. Only after those pass may task quality, simulated cost, or latency influence release. CI returns `1` for a valid but blocked run, `2` for invalid configuration, and reserves `3` for incomplete evidence/provider failure.

Failure clustering is deterministic and inspectable. It may help triage, but never decides whether a hard rule passes.

## Consequences

The included `candidate-v1.5.0` is deliberately blocked despite improved extraction. Product teams must change workflow policy or destination behavior, not lower an aggregate threshold to ship it.
