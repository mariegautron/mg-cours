import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openTab } from "./helpers";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
}

test("génère la progression pédagogique PDF, la télécharge et la marque envoyée", async ({
  page,
}) => {
  await login(page);
  const suffix = Date.now();

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Progression ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByLabel("Date de la 1re séance").fill("2026-12-01");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();
  const moduleId = moduleUrl.split("/").pop()!;

  await openTab(page, /Séances/);
  await page.getByRole("link", { name: "Ajouter une séance" }).click();
  await page.getByLabel("Titre de la séance").fill("Introduction à l’Agilité");
  await page.getByLabel("Objectifs pédagogiques").fill("Valeurs et principes\nRôles Scrum");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Séance 1")).toBeVisible();

  // Pas de PDF avant génération.
  const before = await page.request.get(`/api/modules/${moduleId}/outline`);
  expect(before.status()).toBe(404);

  await openTab(page, "Progression");
  await page.getByRole("button", { name: "Générer la progression" }).click();
  await expect(page.getByText(/Générée le/)).toBeVisible();

  const pdf = await page.request.get(`/api/modules/${moduleId}/outline`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  const body = await pdf.body();
  expect(body.subarray(0, 4).toString()).toBe("%PDF");

  // Geste qui ne se défait pas : un dialogue court demande confirmation (« Pas encore » l'annule).
  await page.getByRole("button", { name: "Marquer comme envoyée" }).click();
  await expect(
    page.getByRole("alertdialog", { name: "Tu as bien envoyé la progression à l’école ?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pas encore" }).click();
  await expect(page.getByRole("button", { name: "Marquer comme envoyée" })).toBeVisible();
  await page.getByRole("button", { name: "Marquer comme envoyée" }).click();
  await page.getByRole("button", { name: "Oui, je l’ai envoyée" }).click();
  await expect(page.getByText(/envoyée le/)).toBeVisible();
  // Jalon célébré, sobrement.
  await expect(page.getByText("Progression envoyée. Les rappels s’arrêtent")).toBeVisible();
  await expect(page.getByText("Progression pédagogique envoyée.")).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});
