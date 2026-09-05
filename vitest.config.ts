import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["tests/**/*.test.ts"], coverage: { reporter: ["text", "json-summary"], include: ["src/lib/eval/**/*.ts", "cli/**/*.ts"] } },
});
