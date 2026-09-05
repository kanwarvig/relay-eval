import { expect, test } from "@playwright/test";

test("blocks the unsafe candidate and explains the hard invariant", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("gate-status")).toContainText("BLOCK");
  await expect(page.getByText("No duplicate external writes")).toBeVisible();
  await expect(page.getByText("Final-state invariant")).toBeVisible();
});

test("drills from a failure cluster into a raw execution trace", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Failure clusters/ }).click();
  await expect(page.getByRole("tab", { name: /Failure clusters/ })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: /One logical referral after retries/ }).click();
  await expect(page.getByRole("heading", { name: "Trace → assertion → final state" })).toBeVisible();
  await expect(page.getByText("FINAL STATE DIFF")).toBeVisible();
  await expect(page.getByText(/NO_DUPLICATE_WRITE/)).toBeVisible();
});

test("serves a typed machine-readable run", async ({ request }) => {
  const response = await request.get("/api/runs?partition=held_out&trials=2&seed=11");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.data).toMatchObject({ schemaVersion: "relay-eval.report.v1", gate: { status: "BLOCK" }, config: { trialsPerCase: 2 } });
});
