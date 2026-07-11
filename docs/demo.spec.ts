import { test, expect } from "@playwright/test";

/**
 * Optional smoke for a recorded / CI demo take.
 * Extend with Clerk storageState after exporting a signed-in session.
 *
 *   DEMO_BASE_URL=https://your-app.ondigitalocean.app npx playwright test docs/demo.spec.ts
 */
const base = process.env.DEMO_BASE_URL ?? "http://localhost:3000";

test.describe("VoxAssist demo smoke", () => {
  test("home loads", async ({ page }) => {
    await page.goto(base);
    await expect(page.getByText(/VoxAssist/i).first()).toBeVisible();
  });
});
