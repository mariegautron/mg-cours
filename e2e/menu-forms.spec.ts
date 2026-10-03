import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Lecture seule : trois formes de menu (US-118) — rail d'icônes en tablette, barre du bas au téléphone.
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
}

const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test("tablette : rail d’icônes, libellés accessibles, cibles de 44 px, recherche", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 900, height: 800 });
  await login(page);
  const menu = page.locator("[data-sidebar=menu]");
  await expect(menu.getByRole("link")).toHaveCount(5);
  for (const name of ["Aujourd’hui", "Modules", "Étudiant·es", "Bibliothèque", "Réglages"]) {
    const link = menu.getByRole("link", { name });
    await expect(link).toBeVisible();
    const box = await link.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  // Le menu se replie en rail après le montage (transition) : on attend sa largeur finale.
  await expect
    .poll(
      async () => (await page.locator("[data-slot=sidebar-container]").boundingBox())?.width ?? 999,
    )
    .toBeLessThanOrEqual(80);
  await expect(page.getByRole("button", { name: /Rechercher/ })).toHaveCount(1);
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  const res = await new AxeBuilder({ page }).withTags(axeTags).analyze();
  expect(res.violations).toEqual([]);
});

test("téléphone : barre du bas à quatre entrées + Plus, pas de défilement horizontal", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 640 });
  await login(page);
  const nav = page.getByRole("navigation", { name: "Menu principal" });
  await expect(nav.getByRole("link")).toHaveCount(4);
  await expect(nav.getByRole("link", { name: "Aujourd’hui" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  for (const link of await nav.getByRole("link").all()) {
    const box = await link.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const res = await new AxeBuilder({ page }).withTags(axeTags).analyze();
  expect(res.violations).toEqual([]);

  await nav.getByRole("button", { name: "Plus" }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("link", { name: "Réglages" })).toBeVisible();
  await expect(drawer.getByRole("button", { name: /Rechercher/ })).toBeVisible();
  await drawer.getByRole("link", { name: "Réglages" }).click();
  await page.waitForURL("**/settings");
  await expect(nav.getByRole("button", { name: "Plus" })).toBeVisible();
});

test("ordinateur : menu complet avec libellés visibles, barre du bas absente", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page);
  await expect(page.getByRole("link", { name: "Bibliothèque" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Plus" })).toHaveCount(0);
});
