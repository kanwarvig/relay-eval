import { describe, expect, it } from "vitest";
import { main } from "../cli/relay-eval";

describe("CLI", () => {
  it("emits machine-readable comparison JSON", () => {
    let output = "";
    const code = main(["compare", "--trials", "1", "--seed", "5"], (message) => { output += message; });
    expect(code).toBe(0);
    expect(JSON.parse(output)).toMatchObject({ gate: { status: "BLOCK" } });
  });

  it("returns exit code 1 when a valid candidate is blocked", () => {
    const code = main(["gate", "--trials", "1"], () => undefined);
    expect(code).toBe(1);
  });

  it("can assert the built-in regression fixture blocks in CI", () => {
    const code = main(["gate", "--trials", "2", "--expect", "block"], () => undefined);
    expect(code).toBe(0);
  });

  it("returns exit code 2 for invalid configuration", () => {
    const code = main(["run", "--partition", "secret"], () => undefined);
    expect(code).toBe(2);
  });

  it("returns exit code 3 when required trace evidence is incomplete", () => {
    const code = main(["gate", "--trials", "1", "--simulate-incomplete"], () => undefined);
    expect(code).toBe(3);
  });
});
