import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("la page de connexion se charge et est accessible", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Bienvenue", level: 1 })).toBeVisible();
  await expect(page.getByText("MG COURS").first()).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("une route protégée redirige vers /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
