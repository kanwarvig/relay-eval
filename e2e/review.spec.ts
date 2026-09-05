import { expect, test } from "@playwright/test";

test("guides a new reviewer from overview to the blocked release", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Know what the workflow did/i })).toBeVisible();
  await expect(page.getByTestId("gate-status")).toContainText("BLOCK");
  await expect(page.getByText("Run workflow versions repeatedly", { exact: false })).toBeVisible();

  await page.getByRole("link", { name: /Review blocked release/ }).click();
  await expect(page).toHaveURL(/\/runs\/run-/);
  await expect(page.getByRole("heading", { name: "This candidate does not ship." })).toBeVisible();
  await expect(page.getByText("No duplicate external writes")).toBeVisible();
  await expect(page.getByTestId("gate-status")).toContainText("3 blocking rules");

  await page.reload();
  await expect(page.getByRole("heading", { name: "This candidate does not ship." })).toBeVisible();
});

test("drills from a failure fingerprint into trace and final state", async ({ page }) => {
  await page.goto("/failures");
  const fingerprint = page.getByRole("link", { name: /One logical referral after retries/ }).first();
  await expect(fingerprint).toBeVisible();
  await fingerprint.click();

  await expect(page).toHaveURL(/\/traces\//);
  await expect(page.getByRole("heading", { name: "Tool-call timeline" })).toBeVisible();
  await expect(page.getByText("NO_DUPLICATE_WRITE")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Final state diff" })).toBeVisible();
  await expect(page.getByText(/referrals: 0 → 2/)).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/failures$/);
  await expect(page.getByRole("heading", { name: "Failure clusters" })).toBeVisible();
});

test("keeps focused routes usable without horizontal overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Review blocked release/ })).toBeVisible();
  const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(homeOverflow).toBeLessThanOrEqual(1);

  await page.goto("/failures");
  const failuresOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(failuresOverflow).toBeLessThanOrEqual(1);
  await page.getByRole("link", { name: /One logical referral after retries/ }).first().click();
  const traceOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(traceOverflow).toBeLessThanOrEqual(1);
});

test("serves a typed machine-readable run", async ({ request }) => {
  const response = await request.get("/api/runs?partition=held_out&trials=2&seed=11");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.data).toMatchObject({ schemaVersion: "relay-eval.report.v1", gate: { status: "BLOCK" }, config: { trialsPerCase: 2 } });
});
