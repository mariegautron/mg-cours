import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openTab } from "./helpers";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("US-58 : importer des séances d'un autre module sans dates ni statut", async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  const stamp = Date.now();

  const createModule = async (name: string) => {
    await page.goto("/modules/new");
    await page.getByLabel("Nom du module").fill(name);
    await page.getByLabel("Année").fill("2026");
    await page.getByLabel("Nombre d’heures total").fill("21");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
    return page.url();
  };

  // Une ressource, un module source avec deux séances datées et prêtes.
  const resource = `Support import ${stamp}`;
  await page.goto("/resources/new");
  await page.getByLabel("Titre").fill(resource);
  await page.getByLabel("Type").selectOption("course");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: resource, level: 1 })).toBeVisible();

  const sourceName = `Module source ${stamp}`;
  const sourceUrl = await createModule(sourceName);
  for (const title of ["Introduction", "Atelier"]) {
    await page.goto(`${sourceUrl}/courses/new`);
    await page.getByLabel("Titre de la séance").fill(title);
    await page
      .getByLabel("Modalité", { exact: true })
      .selectOption(title === "Atelier" ? "workshop" : "lecture");
    await page.getByLabel("Date", { exact: true }).fill("2026-10-12");
    await page.getByLabel("Début", { exact: true }).fill("09:00");
    await page.getByLabel("Fin", { exact: true }).fill("12:00");
    await page.getByLabel("Préparation", { exact: true }).selectOption("ready");
    await page.getByLabel("Objectifs pédagogiques").fill("Comprendre\nPratiquer");
    await page.getByLabel(resource).check();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForURL(/\/courses(\/[0-9a-f-]{36})?$/);
  }

  const targetUrl = await createModule(`Module cible ${stamp}`);
  await page.goto(`${targetUrl}/courses/new`);
  await page.getByLabel("Titre de la séance").fill("Déjà là");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/courses(\/[0-9a-f-]{36})?$/);

  await openTab(page, /Séances/);
  await page.getByRole("link", { name: "Depuis un autre module" }).click();
  await page
    .getByLabel("Module source", { exact: true })
    .selectOption({ label: `${sourceName} (2026) — 2 séances` });
  await page.getByRole("button", { name: "Voir les séances" }).click();

  await expect(page.getByRole("button", { name: /^Importer 0 séance/ })).toBeDisabled();
  await page.getByLabel(/Atelier/).check();
  await expect(page.getByRole("status")).toContainText(
    "1 séance sera ajoutée à la suite des 1 existante (séance 2).",
  );
  await page.getByLabel(/Introduction/).check();
  await expect(page.getByRole("status")).toContainText("séances 2 à 3");

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.getByRole("button", { name: "Importer 2 séances" }).click();
  await page.waitForURL(/\/courses(\/[0-9a-f-]{36})?$/);
  await openTab(page, /Séances/);
  // Ordre du module source : Introduction avant Atelier, après « Déjà là ».
  const list = page.getByRole("complementary", { name: /Les 3 séances/ }).getByRole("listitem");
  await expect(list).toHaveCount(3);
  await expect(list.nth(0)).toContainText("Déjà là");
  await expect(list.nth(1)).toContainText("Introduction");
  await expect(list.nth(2)).toContainText("Atelier");
  // Ni dates ni statut « Prête » repris : toutes à préparer, sans date.
  await expect(list.nth(1)).toContainText("Date à fixer");
  await expect(list.nth(1)).toContainText("À préparer");
  await expect(list.nth(2)).toContainText("À préparer");
});
