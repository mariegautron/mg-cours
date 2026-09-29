import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

import { openTab } from "./helpers";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
async function fichePdf(lines: string[]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage();
  lines.forEach((line, i) => page.drawText(line, { x: 50, y: 780 - i * 20, size: 12, font }));
  return Buffer.from(await doc.save());
}

test("US-53 : attendus lus dans la fiche PDF, corrigés, enregistrés, squelette de séances", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/modules/new");
  const moduleName = `Attendus ${Date.now()}`;
  await page.getByLabel("Nom du module").fill(moduleName);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("28");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();
  await page.waitForLoadState("networkidle");

  // Sans fiche déposée : lecture par texte collé, une ligne = un attendu.
  await page.goto(`${moduleUrl}/expectations`);
  await expect(page.getByText("Aucune fiche déposée.")).toBeVisible();

  // Dépôt de la fiche (PDF d'origine) sur le module.
  await page.goto(moduleUrl);
  await openTab(page, "Administratif");
  await page.getByLabel(/Déposer un fichier \(attendus/).setInputFiles({
    name: "fiche-ynov.pdf",
    mimeType: "application/pdf",
    buffer: await fichePdf([
      "Objectifs pedagogiques",
      "- Recueillir un besoin client",
      "- Evaluer la faisabilite technique",
      "Unites pedagogiques",
      "1 FFP 3h Cadrage du besoin",
      "2 TDP 4h Etude de faisabilite",
    ]),
  });
  await expect(page.getByRole("link", { name: /Télécharger fiche-ynov\.pdf/ })).toBeVisible();

  await page.goto(`${moduleUrl}/expectations`);
  await expect(page.getByRole("link", { name: /Ouvrir le PDF d’origine/ })).toBeVisible();
  await page.getByRole("button", { name: /Lire « fiche-ynov\.pdf »/ }).click();
  await expect(page.getByText(/2 objectif\(s\) et 2 unité\(s\) lus/)).toBeVisible();
  await expect(page.getByLabel("Objectif 1", { exact: true })).toHaveValue(
    "Recueillir un besoin client",
  );
  await expect(page.getByLabel("Modalité de l’unité 2", { exact: true })).toHaveValue("TDP");
  await expect(page.getByLabel("Heures de l’unité 1", { exact: true })).toHaveValue("3");

  // Entièrement modifiable, sans alerte quand les unités s'écartent du module.
  await page
    .getByLabel("Objectif 2", { exact: true })
    .fill("Évaluer la faisabilité technique d'un projet");
  await page.getByLabel("Heures de l’unité 1", { exact: true }).fill("10");
  await expect(page.getByText(/à titre indicatif/)).toBeVisible();
  await expect(page.locator("p[role=alert]")).toHaveCount(0);

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.getByRole("button", { name: "Enregistrer les attendus" }).click();
  await expect(page.getByText("Attendus enregistrés.")).toBeVisible();
  await expect(page.getByLabel("Objectif 2", { exact: true })).toHaveValue(
    "Évaluer la faisabilité technique d'un projet",
  );

  // Résumé sur la fiche module.
  await page.goto(moduleUrl);
  await expect(page.getByText("2 objectifs pédagogiques · 2 unités")).toBeVisible();

  // Squelette : une séance vide par unité.
  await page.goto(`${moduleUrl}/expectations`);
  await page.getByRole("button", { name: /Proposer un squelette de séances/ }).click();
  await page.waitForURL(/#courses$/);
  await openTab(page, /Séances/);
  await expect(page.getByText("Cadrage du besoin").first()).toBeVisible();
  await expect(page.getByText("Etude de faisabilite").first()).toBeVisible();
});
