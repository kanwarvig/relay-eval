#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runEvaluation } from "../src/lib/eval/index";
import type { Partition, VariantId } from "../src/lib/eval/types";

type Writer = (message: string) => void;

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function help() {
  return `Relay Eval — deterministic workflow evaluation and release gate

Usage:
  relay-eval run [--partition held_out|tuning|all] [--trials 5] [--seed 1701] [--out report.json]
  relay-eval compare [same options]
  relay-eval gate [same options] [--expect pass|block]
  relay-eval report [same options] [--out report.json]

Exit codes: 0 pass/success, 1 valid run blocked, 2 invalid arguments, 3 incomplete evidence.`;
}

export function main(args = process.argv.slice(2), write: Writer = (message) => process.stdout.write(message)): number {
  const command = args[0] ?? "help";
  if (command === "help" || command === "--help" || command === "-h") {
    write(`${help()}\n`);
    return 0;
  }
  if (!["run", "compare", "gate", "report"].includes(command)) {
    write(`${JSON.stringify({ error: { code: "INVALID_COMMAND", message: `Unknown command: ${command}` } })}\n`);
    return 2;
  }
  try {
    const partition = (option(args, "--partition") ?? "held_out") as Partition | "all";
    if (!["held_out", "tuning", "all"].includes(partition)) throw new Error(`Invalid partition: ${partition}`);
    const trialsPerCase = Number(option(args, "--trials") ?? 5);
    const seed = Number(option(args, "--seed") ?? 1701);
    const candidate = (option(args, "--candidate") ?? "candidate-v1.5.0") as VariantId;
    if (!Number.isInteger(trialsPerCase) || trialsPerCase < 1 || trialsPerCase > 25) throw new Error("Trials must be an integer from 1 to 25");
    if (!Number.isInteger(seed) || seed < 0) throw new Error("Seed must be a non-negative integer");
    if (!["baseline-v1.4.0", "candidate-v1.5.0"].includes(candidate)) throw new Error(`Unknown candidate: ${candidate}`);
    const report = runEvaluation({ partition, trialsPerCase, seed, candidate });
    const output = command === "compare"
      ? { runId: report.runId, baseline: report.baseline, candidate: report.candidate, deltas: report.deltas, gate: report.gate }
      : report;
    const serialized = `${JSON.stringify(output, null, 2)}\n`;
    const outPath = option(args, "--out");
    if (outPath) {
      const absolute = resolve(outPath);
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, serialized, "utf8");
      write(`${JSON.stringify({ written: absolute, runId: report.runId, status: report.gate.status })}\n`);
    } else {
      write(serialized);
    }
    if (command === "gate") {
      const expected = option(args, "--expect");
      if (expected && !["pass", "block"].includes(expected)) return 2;
      if (expected) return expected.toUpperCase() === report.gate.status ? 0 : 1;
      return report.gate.status === "PASS" ? 0 : 1;
    }
    return 0;
  } catch (error) {
    write(`${JSON.stringify({ error: { code: "INVALID_CONFIG", message: error instanceof Error ? error.message : "Unknown error" } })}\n`);
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = main();
