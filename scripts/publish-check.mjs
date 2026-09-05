import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const ignored = new Set([".git", ".next", ".vercel", "node_modules", "coverage", "test-results", "playwright-report", "artifacts"]);
const files = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else files.push(path);
  }
}

walk(root);
const patterns = [
  new RegExp("gh" + "p_[A-Za-z0-9]{20,}"),
  new RegExp("github" + "_pat_[A-Za-z0-9_]{20,}"),
  new RegExp("sk-" + "[A-Za-z0-9_-]{20,}"),
  new RegExp("BEGIN " + "(?:RSA|OPENSSH|EC) PRIVATE KEY"),
  new RegExp("(?:VERCEL_TOKEN|SUPABASE_SERVICE_ROLE_KEY)" + "\\s*=")
];
const problems = [];

for (const path of files) {
  const name = relative(root, path).replaceAll("\\", "/");
  if (/^\.env(?:\.|$)/.test(name) || /\.(?:pem|key|p12)$/i.test(name)) problems.push(`${name}: forbidden credential file`);
  if (statSync(path).size > 5_000_000) problems.push(`${name}: exceeds 5 MB publish limit`);
  const buffer = readFileSync(path);
  if (buffer.includes(0)) continue;
  const text = buffer.toString("utf8");
  for (const pattern of patterns) if (pattern.test(text)) problems.push(`${name}: matches secret pattern ${pattern.source}`);
}

if (problems.length > 0) {
  console.error(`Publish hygiene failed:\n${problems.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Publish hygiene passed: ${files.length} files scanned, no secret patterns or forbidden artifacts.`);
}
