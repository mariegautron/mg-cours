import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { loginLight } from "./grading-setup";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
const axe = (page: import("@playwright/test").Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

test("sujet lié à la séance : préparation, fichier en téléchargement forcé, projection", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await loginLight(page);
  const suffix = Date.now();

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Sujet ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  await page.goto(`${moduleUrl}/courses/new`);
  await page.getByLabel("Titre de la séance").fill("Évaluation et restitution");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/courses(\/[0-9a-f-]{36})?$/);

  const groupName = `Groupe Sujet ${suffix}`;
  await page.goto(`${moduleUrl}/groups/new`);
  await page.getByLabel("Nom du groupe").fill(groupName);
  await page.getByRole("button", { name: "Créer le groupe" }).click();
  await page.getByText(groupName).first().waitFor();

  await page.goto(`${moduleUrl}/assessments/new`);
  await page.getByLabel("Titre", { exact: true }).fill("Correction ciblée");
  await page.getByRole("checkbox", { name: groupName }).check();
  await page.getByLabel("Objectif").fill("Corriger l’extrait HTML.");
  await page.getByLabel("Consigne (Markdown)").fill("Corrigez le code fourni puis répondez.");
  await page.getByLabel("Rendu attendu (Markdown)").fill("Votre version corrigée.");
  await page.getByLabel("Ce qui sera évalué (Markdown)").fill("La pertinence des corrections.");
  await page
    .getByLabel("Séance", { exact: true })
    .selectOption({ label: "Séance 1 — Évaluation et restitution" });
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("heading", { name: "Correction ciblée" }).waitFor();
  const assessmentUrl = page.url();

  // « À construire » : pas de projection.
  await expect(page.getByText("À construire")).toBeVisible();
  await expect(page.getByText("Séance 1 — Évaluation et restitution")).toBeVisible();
  await expect(page.getByRole("link", { name: /Présenter le sujet/ })).toHaveCount(0);
  const courseHref = `${moduleUrl.replace("/modules/", "/present/modules/")}/courses/`;
  await page.goto(`${moduleUrl}/courses`);
  const courseId = await page
    .locator('a[href*="/courses/"]', { hasText: /^Faire cours/ })
    .first()
    .getAttribute("href")
    .then((h) => h?.split("/courses/")[1]?.split(/[/?#]/)[0]);
  expect(courseId).toMatch(/^[0-9a-f-]{36}$/);
  await page.goto(`${courseHref}${courseId}`);
  await expect(page.getByText("Corrigez le code fourni")).toHaveCount(0);

  // Prête + fichier .html joint (téléchargement forcé).
  await page.goto(`${assessmentUrl}/edit`);
  await page.getByLabel("État de préparation").selectOption("ready");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("heading", { name: "Correction ciblée" }).waitFor();
  await page.goto(`${assessmentUrl}/edit`);
  await page.getByLabel(/Déposer un fichier/).setInputFiles({
    name: "extrait.html",
    mimeType: "text/html",
    buffer: Buffer.from("<script>window.pwned = true</script><p>Extrait à corriger</p>"),
  });
  const download = page.getByRole("link", { name: /Télécharger extrait\.html/ });
  await expect(download).toBeVisible();
  expect((await axe(page)).violations).toEqual([]);

  const response = await page.request.get((await download.getAttribute("href"))!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-disposition"]).toMatch(
    /^attachment; filename="extrait\.html"/,
  );
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["content-type"]).toBe("application/octet-stream");

  // Fiche : sujet complet, bouton « Présenter le sujet ».
  await page.goto(assessmentUrl);
  await expect(page.getByText("Prête", { exact: true })).toBeVisible();
  await expect(page.getByText("Votre version corrigée.").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Présenter le sujet/ })).toBeVisible();
  expect((await axe(page)).violations).toEqual([]);

  // Projeté depuis « Faire cours » : contenu étudiant·es seulement, ni fichier ni état.
  await page.goto(`${courseHref}${courseId}`);
  await expect(page.getByText("Corrigez le code fourni puis répondez.")).toBeVisible();
  await expect(page.getByText("La pertinence des corrections.")).toBeVisible();
  await expect(page.getByText("extrait.html")).toHaveCount(0);

  // Écran dédié du sujet.
  await page.goto(assessmentUrl);
  await page.getByRole("link", { name: /Présenter le sujet/ }).click();
  await page.waitForURL(/\/present\/modules\/.+\/assessments\//);
  await expect(page.getByText("Corrigez le code fourni puis répondez.")).toBeVisible();
});
