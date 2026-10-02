import { expect, test } from "@playwright/test";

// Lecture seule : menu latéral à cinq entrées, entrée courante marquée, pages hors menu joignables.
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
}

const ENTRIES = [
  ["Aujourd’hui", "/dashboard"],
  ["Modules", "/modules"],
  ["Étudiant·es", "/students"],
  ["Bibliothèque", "/resources"],
  ["Réglages", "/settings"],
] as const;

test("le menu a cinq entrées, l’entrée courante est marquée, cibles de 44 px", async ({ page }) => {
  await login(page);
  const menu = page.locator("[data-sidebar=menu]");
  await expect(menu.getByRole("link")).toHaveCount(5);
  for (const [label, href] of ENTRIES) {
    const link = menu.getByRole("link", { name: label });
    await expect(link).toHaveAttribute("href", href);
    const box = await link.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  await expect(menu.getByRole("link", { name: "Aujourd’hui" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await menu.getByRole("link", { name: "Bibliothèque" }).click();
  await page.waitForURL("**/resources");
  await expect(menu.getByRole("link", { name: "Bibliothèque" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(menu.getByRole("link", { name: "Aujourd’hui" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("les pages sorties du menu restent joignables par un lien visible", async ({ page }) => {
  await login(page);
  await page.goto("/modules");
  await page.getByRole("link", { name: "Facturation" }).click();
  await page.waitForURL("**/billing");
  await page.goto("/modules");
  await page.getByRole("link", { name: "Évaluations" }).click();
  await page.waitForURL("**/assessments");
  await page.goto("/resources");
  for (const [name, url] of [
    ["Questions", "**/questions"],
    ["Grilles", "**/assessments/grids"],
    ["Phrases", "**/assessments/comments"],
  ] as const) {
    await page.goto("/resources");
    await page.getByRole("link", { name, exact: true }).click();
    await page.waitForURL(url);
  }
});
