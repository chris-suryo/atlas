import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_TEST_EMAIL;
const PASSWORD = process.env.E2E_TEST_PASSWORD;
if (!EMAIL || !PASSWORD) {
  throw new Error("Set E2E_TEST_EMAIL/E2E_TEST_PASSWORD in .env.test.local");
}

// Core smoke tests against the dedicated test account (RLS-isolated — never
// touches the real account's rows). Serial: each step depends on the app
// state the previous one left behind (signed in, exercise queued, etc.).
test.describe.serial("Atlas core flows", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("sign-in redirects to Today", async () => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/today");

    // The bottom nav always renders regardless of WHOOP/recovery state —
    // the most robust signal that Today actually loaded.
    await expect(page.getByRole("link", { name: "Today" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Log" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Trends" })).toBeVisible();
  });

  test("Log: Focus -> Picker -> Plan -> Now -> Finish -> Recap", async () => {
    await page.goto("/log");
    await expect(page.getByRole("heading", { name: "What are you training?" })).toBeVisible();

    // Not `exact` — the label can carry a trailing "due"/recency badge.
    await page.getByRole("button", { name: "Push" }).click();
    await expect(page.getByRole("heading", { name: "Add to Push" })).toBeVisible();

    // A stable seed anchor (supabase/seed.sql / seed-data.ts) — not `exact`,
    // since a "last: WxRxS" summary appends after this test's first run.
    await page.getByPlaceholder("Search — or type a full set").fill("Incline DB Press");
    await page.getByRole("button", { name: "Incline DB Press" }).click();

    await expect(page.getByRole("button", { name: "Start workout" })).toBeVisible();
    await page.getByRole("button", { name: "Start workout" }).click();

    // Log one set: 135 x 8. Digits only (never "0" — it's ambiguous with the
    // keypad's own "0" key and the untouched weight/reps display).
    await page.getByRole("button", { name: "Weight" }).click();
    for (const d of ["1", "3", "5"]) {
      await page.getByRole("button", { name: d, exact: true }).click();
    }
    await page.getByRole("button", { name: "Reps" }).click();
    await page.getByRole("button", { name: "8", exact: true }).click();
    await page.getByRole("button", { name: "Log set" }).click();

    await page.getByRole("button", { name: "Finish exercise" }).click();
    await page.getByRole("button", { name: "Finish workout" }).click();

    await expect(page.getByRole("heading", { name: "Nice work." })).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
    await page.waitForURL("**/today");
  });

  test("Ankle: tap ring -> chip picker -> value shown", async () => {
    await page.goto("/today");
    await page.getByRole("button", { name: "Log ankle pain" }).click();
    // "7" has no substring relationship with any other 0-10 chip (unlike "1"/"10").
    await page.getByRole("button", { name: "7", exact: true }).click();
    await expect(page.getByRole("button", { name: "Log ankle pain" })).toContainText("7");
  });

  test("Run form: fill + save reaches a success state", async () => {
    await page.goto("/log");
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Run" })).toBeVisible();

    await page.getByLabel("Distance (mi)").fill("3.1");
    await page.getByLabel("Duration (mm:ss)").fill("28:30");
    await page.getByRole("button", { name: "Save run" }).click();

    // Success = the screen actually transitions back to Focus (onSaveRun only
    // does this on res.ok) — a real success signal, not just "no error shown".
    await expect(page.getByRole("heading", { name: "What are you training?" })).toBeVisible();
    await expect(page.getByText("Could not save")).toHaveCount(0);
  });

  test("Sign-out clears the session; /today then redirects to /login", async () => {
    // No sign-out UI exists yet (route is POST-only, unlinked from any page) —
    // hit it directly; page.request shares this context's session cookies.
    const res = await page.request.post("/auth/signout");
    expect(res.ok()).toBeTruthy();

    await page.goto("/today");
    await page.waitForURL("**/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
