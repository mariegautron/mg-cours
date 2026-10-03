import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Lecture seule : la bibliothèque en familles, filtres conservés, anciennes URL valables.
test("familles de la bibliothèque : onglets, filtre par famille, liens rattachés, axe", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  await page.goto("/resources");
  if (process.env.CAPTURE) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: "docs/captures/bibliotheque.png" });
  }
  const tabs = page.getByRole("navigation", { name: "Familles de la bibliothèque" });
  await expect(tabs.getByRole("link")).toHaveCount(5);
  await expect(tabs.getByRole("link", { name: /^Toutes/ })).toHaveAttribute("aria-current", "page");

  await tabs.getByRole("link", { name: /^Évaluations/ }).click();
  await page.waitForURL("**/resources?family=assessments");
  await expect(tabs.getByRole("link", { name: /^Évaluations/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(tabs.getByRole("link", { name: "Grilles" })).toBeVisible();
  await expect(tabs.getByRole("link", { name: "Phrases" })).toBeVisible();

  await tabs.getByRole("link", { name: /^QCM/ }).click();
  await expect(tabs.getByRole("link", { name: "Questions" })).toBeVisible();

  // Ancienne URL : le filtre par type fonctionne toujours.
  await page.goto("/resources?kind=course");
  await expect(page.getByRole("heading", { name: "Bibliothèque", level: 1 })).toBeVisible();

  const res = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(res.violations).toEqual([]);
});
