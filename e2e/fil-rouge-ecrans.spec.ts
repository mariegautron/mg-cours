import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { loginLight } from "./grading-setup";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("fil rouge : vue d'ensemble des évaluations, brief en sections, reprise ; axe et 320 px", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await loginLight(page);
  const stamp = Date.now();
  const axe = () =>
    new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const overflow = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

  // Un module de 21 h avec 3 séances saisies à la main.
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Fil rouge ${stamp}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: /Continuer/ }).click();
  await page.getByText("Ajouter ou saisir des créneaux à la main").click();
  for (const [i, d] of ["2026-12-01", "2026-12-08", "2026-12-15"].entries()) {
    await page.getByRole("button", { name: "Ajouter une ligne" }).click();
    await page.getByLabel(`Date du créneau ${i + 1}`).fill(d);
    await page.getByLabel(`Début du créneau ${i + 1}`).fill("08:00");
    await page.getByLabel(`Fin du créneau ${i + 1}`).fill("12:00");
  }
  await page.getByRole("button", { name: /^Créer le module/ }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();
  await page.waitForLoadState("networkidle");

  // Sans projet : l'écran guide.
  await page.goto(`${moduleUrl}/assessments`);
  await expect(page.getByRole("heading", { name: "Pas encore de projet fil rouge" })).toBeVisible();

  // Le projet : modèle de départ, brief section par section.
  await page.goto(`${moduleUrl}/project`);
  await page.getByLabel("Titre du projet").fill(`Projet ${stamp}`);
  await page.getByRole("button", { name: /Brief client|Jeu de rôle client/ }).click();
  await expect(page.getByText("Modèle « Jeu de rôle client » appliqué.")).toBeVisible();
  await expect(page.getByText("À rédiger").first()).toBeVisible();
  await page.getByRole("button", { name: "Créer le projet" }).click();
  await expect(page.getByRole("heading", { name: /Évaluations du projet/ })).toBeVisible();
  await page.getByRole("button", { name: /Créer 3 évaluations/ }).click();
  await expect(page.getByText("3 évaluations créées.")).toBeVisible();

  // Vue d'ensemble : frise des séances, une carte par évaluation.
  await page.goto(`${moduleUrl}/assessments`);
  await expect(page.getByRole("heading", { name: /^Projet : Projet/ })).toBeVisible();
  await expect(
    page.getByRole("region", { name: /Frise des séances et des évaluations/ }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /Évaluations \(3\)/ })).toBeVisible();
  await expect(page.getByText("Cadre pour les étudiant·es").first()).toBeVisible();
  await expect(page.getByText("À créer").first()).toBeVisible();

  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["assessments", "project"]) {
      await page.goto(`${moduleUrl}/${path}`);
      await page.waitForLoadState("networkidle");
      expect((await axe()).violations, `${path} @${width}`).toEqual([]);
      expect(await overflow(), `${path} débordement @${width}`).toBeLessThanOrEqual(0);
    }
  }

  // Un autre module peut partir de ce projet.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Autre ${stamp}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: /Enregistrer/ }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  await page.goto(`${page.url()}/project/reuse`);
  await expect(page.getByRole("heading", { name: "Partir d’un projet existant" })).toBeVisible();
  expect((await axe()).violations).toEqual([]);
});
