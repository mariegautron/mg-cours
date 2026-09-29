import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openTab } from "./helpers";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("E10-05 : fiche module en onglets, clavier ARIA et ancres qui ouvrent le bon onglet", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Onglets ${Date.now()}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  // Motif ARIA tabs : un seul onglet dans l'ordre de tabulation, sélection et panneau reliés.
  const tablist = page.getByRole("tablist", { name: "Sections du module" });
  const tabs = tablist.getByRole("tab");
  await expect(tabs).toHaveCount(4);
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
  await expect(tabs.nth(1)).toHaveAttribute("tabindex", "-1");
  const panelId = await tabs.nth(0).getAttribute("aria-controls");
  await expect(page.locator(`#${panelId}`)).toHaveAttribute("role", "tabpanel");

  await tabs.nth(0).focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(tabs.nth(1)).toBeFocused();
  await page.keyboard.press("End");
  await expect(tabs.nth(3)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");

  // Les ancres existantes ouvrent l'onglet qui contient la section.
  await page.goto(`${moduleUrl}#courses`);
  await expect(page.getByRole("tab", { name: /Séances/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: /^Séances/ })).toBeVisible();

  await page.goto(`${moduleUrl}#billing`);
  await expect(page.getByRole("tab", { name: "Administratif" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("heading", { name: /Facturation/ })).toBeInViewport();

  // L'onglet choisi se retrouve dans l'URL et survit au rechargement.
  await openTab(page, /Groupes/);
  await expect(page).toHaveURL(/#groups-evaluations$/);
  await page.reload();
  await expect(page.getByRole("tab", { name: /Groupes/ })).toHaveAttribute("aria-selected", "true");

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});
