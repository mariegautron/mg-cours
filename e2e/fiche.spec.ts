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

test("préremplit le formulaire module depuis une fiche pédagogique PDF", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  await page.goto("/modules/new");
  await page.waitForLoadState("networkidle");
  // YCODE unique par année : un code différent à chaque exécution.
  const ycode = `A2627_${String(Date.now()).slice(-5)}`;

  await page.getByLabel(/Fiche pédagogique \(PDF/).setInputFiles({
    name: "fiche.pdf",
    mimeType: "application/pdf",
    buffer: await fichePdf([
      "FICHE PEDAGOGIQUE",
      "YNOV Campus Nantes",
      "Intitule du module : Architecture Web",
      `Code module : ${ycode}`,
      "Bachelor 3",
      "Volume horaire total : 24 h",
      "FFP : 12 h",
      "TDP : 12 h",
    ]),
  });

  await expect(page.getByText("Lue", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Nom du module")).toHaveValue("Architecture Web");
  await expect(page.getByLabel("YCODE")).toHaveValue(ycode);
  await expect(page.getByLabel("Année")).toHaveValue("2026");
  await expect(page.getByLabel("Nombre d’heures total")).toHaveValue("24");

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // Le formulaire prérempli s'enregistre.
  await page.getByRole("button", { name: "Enregistrer" }).click();
  // Cette fiche n'a pas d'objectifs lisibles : elle est conservée, ses attendus sont « à relire ».
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}\?fiche=review$/);
  await expect(page.getByRole("heading", { name: "Architecture Web", level: 1 })).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "attendus sont à relire" }),
  ).toBeVisible();
});

test("E18 : la fiche importée à la création est conservée, avec ses attendus", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  await page.goto("/modules/new");
  await page.waitForLoadState("networkidle");
  const ycode = `B2627_${String(Date.now()).slice(-5)}`;

  await page.getByLabel(/Fiche pédagogique \(PDF/).setInputFiles({
    name: "fiche-conservee.pdf",
    mimeType: "application/pdf",
    buffer: await fichePdf([
      "FICHE PEDAGOGIQUE",
      "YNOV Campus Nantes",
      "Intitule du module : Conception Web",
      `Code module : ${ycode}`,
      "Bachelor 3",
      "Volume horaire total : 24 h",
      "FFP : 12 h",
      "TDP : 12 h",
      "Objectifs pedagogiques",
      "- Recueillir un besoin client",
      "- Evaluer la faisabilite technique",
      "Unites pedagogiques",
      "1 FFP 3h Cadrage du besoin",
      "2 TDP 4h Etude de faisabilite",
    ]),
  });
  await expect(page.getByText("Fiche conservée dans le module")).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}\?fiche=read$/);
  await expect(page.getByRole("status").filter({ hasText: "attendus sont lus" })).toBeVisible();

  // On rouvre le module : attendus présents et PDF téléchargeable.
  const moduleUrl = page.url().split("?")[0];
  await page.goto(moduleUrl);

  // Parcours « Où j'en suis » : fiche et attendus faits, on passe au rapprochement.
  const journey = page.getByRole("region", { name: "Où j’en suis" });
  await expect(journey.locator("[aria-current=step]")).toContainText("Rapprocher les ressources");
  await expect(page.getByRole("link", { name: "Rapprocher mes ressources →" })).toBeVisible();
  await expect(journey.getByText(/4 attendus/)).toBeVisible();
  await openTab(page, "Progression");
  await expect(page.getByText("2 objectifs pédagogiques · 2 unités")).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await openTab(page, "Administratif");
  const link = page.getByRole("link", { name: /Télécharger fiche-conservee\.pdf/ });
  await expect(link).toBeVisible();
  const response = await page.request.get((await link.getAttribute("href"))!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/pdf");

  await page.goto(`${moduleUrl}/expectations`);
  await expect(page.getByLabel("Objectif 1", { exact: true })).toHaveValue(
    "Recueillir un besoin client",
  );
});

test("signale un PDF sans texte exploitable", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  await page.goto("/modules/new");
  await page.waitForLoadState("networkidle");
  await page.getByLabel(/Fiche pédagogique \(PDF/).setInputFiles({
    name: "vide.pdf",
    mimeType: "application/pdf",
    buffer: await fichePdf(["Bonjour, un texte sans aucun rapport avec un module."]),
  });
  await expect(page.getByRole("alert").filter({ hasText: "Rien d’exploitable" })).toBeVisible();
});
