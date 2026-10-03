import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { loginLight } from "./grading-setup";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
const axe = (page: import("@playwright/test").Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

test("projet fil rouge : squelette depuis les notes exigées, compteur juste", async ({ page }) => {
  test.setTimeout(120_000);
  await loginLight(page);
  const suffix = Date.now();

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Projet ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  await page.goto(`${moduleUrl}/project`);
  await page.getByLabel("Titre du projet").fill("Refonte accessible");
  await page.getByRole("button", { name: /Page blanche/ }).click();
  await page.getByLabel("Titre de la section 1").fill("Objectif");
  await page.getByLabel("Texte de la section 1").fill("Concevoir un site accessible.");
  await page.getByRole("button", { name: "Ajouter une section" }).click();
  await page.getByLabel("Titre de la section 2").fill("Phases");
  await page.getByRole("button", { name: "Monter la section « Phases »" }).click();
  await expect(page.getByLabel("Titre de la section 1")).toHaveValue("Phases");
  await page.getByLabel("Contexte client (Markdown)").fill("Une mutuelle fictive.");
  await page.getByRole("button", { name: "Créer le projet" }).click();
  await expect(page.getByRole("heading", { name: "Objectif" })).toBeVisible();

  // 21 h : 3 notes exigées → 1 jalon de groupe + oral + individuelle.
  await expect(page.getByLabel(/^Titre de l’évaluation \d$/)).toHaveCount(3);
  await expect(page.getByRole("status").filter({ hasText: "notes YNOV exigées" })).toContainText(
    "3/3 notes YNOV exigées (2 de groupe, 1 individuelle)",
  );

  // Retirer une évaluation : le compteur signale ce qui manque.
  await page.getByRole("button", { name: /^Retirer l’évaluation 1/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "notes YNOV exigées" })).toContainText(
    "Il manque 1 évaluation",
  );
  await page.getByRole("button", { name: "Ajouter une évaluation" }).click();
  await page.getByLabel(/^Titre de l’évaluation 3$/).fill("Jalon 1");
  await expect(page.getByRole("status").filter({ hasText: "notes YNOV exigées" })).toContainText(
    "3/3",
  );

  expect((await axe(page)).violations).toEqual([]);

  await page.getByRole("button", { name: "Créer 3 évaluations" }).click();
  await expect(page.getByText("3 évaluations créées.")).toBeVisible();
  const list = page.getByRole("region", { name: /Évaluations du projet/ });
  await expect(list.getByRole("link")).toHaveCount(3);
  await expect(list.getByText("Jalon 1")).toBeVisible();

  // Aucune proposition restante ; le compteur reste juste.
  await page.reload();
  await expect(page.getByText(/Toutes les évaluations du squelette existent déjà/)).toBeVisible();
  await page.goto(`${moduleUrl}/assessments`);
  await expect(page.getByText("0/3 note")).toBeVisible();
  expect((await axe(page)).violations).toEqual([]);
});
