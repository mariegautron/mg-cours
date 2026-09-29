import { expect, test } from "@playwright/test";
import { openTab } from "./helpers";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("exporte les cours d’un module en un PDF et en zip", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/resources/new");
  const resourceTitle = `Ressource export ${Date.now()}`;
  await page.getByLabel("Titre").fill(resourceTitle);
  await page.getByLabel("Type").selectOption("course");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: resourceTitle, level: 1 })).toBeVisible();

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Export ${Date.now()}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  await openTab(page, /Séances/);
  await expect(page.getByRole("button", { name: "Un seul PDF" })).toHaveCount(0);

  await openTab(page, /Séances/);
  await page.getByRole("link", { name: "Ajouter une séance" }).click();
  await page.getByLabel("Titre de la séance").fill("Introduction à l’Agilité");
  await page.getByLabel(resourceTitle).check();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Séance 1")).toBeVisible();

  const pdf = page.waitForEvent("download");
  await openTab(page, /Séances/);
  await page.getByRole("button", { name: "Un seul PDF" }).click();
  const pdfDownload = await pdf;
  expect(pdfDownload.suggestedFilename()).toMatch(/^cours-.*\.pdf$/);

  const zip = page.waitForEvent("download");
  await openTab(page, /Séances/);
  await page.getByRole("button", { name: /Un PDF par séance/ }).click();
  expect((await zip).suggestedFilename()).toMatch(/^cours-.*\.zip$/);
});
