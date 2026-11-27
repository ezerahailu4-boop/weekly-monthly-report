import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "admin@yetaf-holding.com";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "TestAdmin123!";

test.describe("Authentication", () => {
  test("login page renders with YETAF branding and credentials form", async ({ page }) => {
    await page.goto("/login");

    await expect(page).toHaveTitle(/YETAF/);
    await expect(page.getByRole("heading", { name: /Clear direction/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Sign in/i })).toBeVisible();
    await expect(page.getByLabel(/Corporate email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Forgot access/i })).toBeVisible();
  });

  test("rejects invalid credentials and shows error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/Corporate email/i).fill("nonexistent@yetaf-holding.com");
    await page.getByLabel(/Password/i).fill("wrong-password");
    await page.getByRole("button", { name: /Sign in securely/i }).click();

    await expect(page.getByText(/Invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("signs in as admin and reaches dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/Corporate email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/Password/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /Sign in securely/i }).click();

    await expect(page).toHaveURL("/dashboard");
    await expect(
      page.getByRole("heading", {
        name: /Direction Follow-up|Report Follow-up Center|Welcome back/i,
      })
    ).toBeVisible();
  });
});

test.describe("Navigation & error pages", () => {
  test("unknown route shows not-found page", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByRole("heading", { name: /Page Not Found/i })).toBeVisible();
  });
});
