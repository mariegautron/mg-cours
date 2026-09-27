import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
// Pour un module déjà réalisé, la progression déposée en PDF fait foi : la génération depuis les
// séances reste possible mais ne doit jamais se présenter comme la version envoyée.
test("une progression déposée en PDF fait foi et débloque la facturation", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Progression Déposée ${Date.now()}`);
  await page.getByLabel("Année").fill("2025");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  await page.waitForLoadState("networkidle");

  // Une séance, pour que la génération produise un vrai PDF.
  await page.getByRole("link", { name: "Ajouter une séance" }).click();
  await page.getByLabel("Titre de la séance").fill("Introduction");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Séance 1")).toBeVisible();

  // Avant tout dépôt : le bouton porte encore le libellé « Générer la progression ».
  await expect(page.getByRole("button", { name: "Générer la progression" })).toBeVisible();

  // Dépôt de la progression réellement envoyée à l'école (module déjà réalisé).
  await page.getByLabel(/Déposer un fichier \(progression/i).setInputFiles({
    name: "trame-envoyee.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"),
  });
  await expect(page.getByText("trame-envoyee.pdf").first()).toBeVisible();

  const trameSection = page.getByRole("region", {
    name: "Progression pédagogique",
    exact: true,
  });
  await expect(trameSection.getByText(/Progression envoyée \(PDF déposé le/)).toBeVisible();
  await expect(trameSection.getByRole("link", { name: "Télécharger" })).toBeVisible();
  await expect(trameSection.locator('a[href*="?inline=1"]')).toBeVisible();
  // Le bouton de génération se reformule, et n'écrase pas le badge « envoyée ».
  await expect(
    trameSection.getByRole("button", { name: "Générer une progression depuis les séances" }),
  ).toBeVisible();
  await expect(
    trameSection.getByText("La progression déposée reste la version envoyée à l’école."),
  ).toBeVisible();
  // Pas de bouton « Marquer comme envoyée » : la progression déposée est déjà la version envoyée.
  await expect(trameSection.getByRole("button", { name: "Marquer comme envoyée" })).toHaveCount(0);

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // Générer quand même une progression depuis les séances (utile pour la déposer ailleurs, ex. Moodle) :
  // le badge « envoyée » reste affiché, la progression générée apparaît seulement en secondaire.
  await trameSection
    .getByRole("button", { name: "Générer une progression depuis les séances" })
    .click();
  await expect(trameSection.getByText(/Progression générée depuis les séances le/)).toBeVisible();
  await expect(trameSection.getByText(/\(brouillon, non envoyée\)/)).toBeVisible();
  await expect(trameSection.getByText(/Progression envoyée \(PDF déposé le/)).toBeVisible();

  // Le document déposé est toujours présent dans la carte Documents.
  await expect(page.getByText("trame-envoyee.pdf").first()).toBeVisible();

  // US-70 : le dépôt vaut envoi, la condition de facturation est remplie.
  await page.goto(`${page.url()}/billing`);
  await expect(
    page.getByRole("listitem").filter({ hasText: "Progression pédagogique envoyée : fait" }),
  ).toBeVisible();
});
