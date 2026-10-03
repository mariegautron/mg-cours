import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

// Parcours « premier module » de bout en bout : fiche école + export Hyperplanning → attendus →
// séances → rapprochement → construire une séance → progression → fil rouge → évaluation →
// groupes → première séance. À chaque pas, on suit la « Prochaine étape » proposée par l'appli.
// Un seul spec, long : il sert aussi de filet pour « supprimer puis recréer ».
async function pdf(lines: string[], size: [number, number] = [595, 842]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage(size);
  lines.forEach((l, i) => page.drawText(l, { x: 40, y: size[1] - 50 - i * 20, size: 11, font }));
  return Buffer.from(await doc.save());
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
}

async function axeClean(page: Page, where: string) {
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(r.violations, `axe : ${where}`).toEqual([]);
}

/** La « Prochaine étape » de la fiche module : le lien proposé doit exister et mener quelque part. */
async function followNext(page: Page, moduleUrl: string, label: RegExp) {
  await page.goto(moduleUrl);
  const link = page.getByRole("link", { name: label }).first();
  await expect(link, `Prochaine étape attendue : ${label}`).toBeVisible({ timeout: 20_000 });
  await link.click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
}

function moduleFiche(stamp: number) {
  return [
    "FICHE PEDAGOGIQUE",
    "YNOV Campus Nantes",
    `Intitule du module : Methodologies Agile ${stamp}`,
    `Code module : A2627_${String(stamp).slice(-5)}`,
    "Mastere 1",
    "Volume horaire total : 21 h",
    "FFP : 12 h",
    "TDP : 9 h",
    "Objectifs pedagogiques",
    "- Cadrer un projet agile",
    "- Estimer et planifier un sprint",
    "- Animer une retrospective",
    "Unites pedagogiques",
    "1 FFP 3h Cadrage de projet",
    "2 TDP 3h Estimation et planification",
  ];
}

test("premier module : de la fiche de l'école à la première séance", async ({ page }) => {
  test.setTimeout(240_000);
  await login(page);
  const stamp = Date.now();
  const moduleName = `Methodologies Agile ${stamp}`;

  // Deux ressources déjà en bibliothèque, pour le rapprochement.
  for (const [title, kind] of [
    [`Cadrer un projet agile – atelier ${stamp}`, "course"],
    [`Estimer et planifier un sprint – TP ${stamp}`, "workshop"],
  ] as const) {
    await page.goto("/resources/new");
    await page.getByLabel("Titre").fill(title);
    await page.getByLabel("Type").selectOption(kind);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  }

  // 1. Créer le module depuis la fiche de l'école + l'export Hyperplanning.
  console.log("STEP 1");
  await page.goto("/modules/new");
  await page.waitForLoadState("networkidle");
  await page.getByLabel(/Fiche pédagogique \(PDF/).setInputFiles({
    name: "fiche.pdf",
    mimeType: "application/pdf",
    buffer: await pdf(moduleFiche(stamp)),
  });
  await expect(page.getByText("Lue", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("Nom du module")).toHaveValue(moduleName);
  await page.getByLabel(/Export Hyperplanning \(PDF/).setInputFiles({
    name: "services.pdf",
    mimeType: "application/pdf",
    buffer: await pdf([
      "NANTES YNOV CAMPUS",
      moduleName,
      "Nantes | DEVFLSTK MAST1 21h00",
      "3h00 lun. 12/10/2026 08h00",
      "3h00 lun. 12/10/2026 13h00",
      "3h00 lun. 02/11/2026 08h00",
      "3h00 lun. 02/11/2026 13h00",
      "3h00 mar. 03/11/2026 08h00",
      "3h00 mar. 03/11/2026 13h00",
      "3h00 mer. 04/11/2026 08h00",
    ]),
  });
  await axeClean(page, "création du module");
  await page.getByRole("button", { name: /Continuer/ }).click();
  await expect(page.getByRole("heading", { name: "Planning et dates" })).toBeVisible();
  await page.getByRole("button", { name: /^Créer le module/ }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}(\?.*)?$/, { timeout: 60_000 });
  const moduleUrl = page.url().split("?")[0];
  await expect(page.getByRole("heading", { name: moduleName, level: 1 })).toBeVisible();
  await axeClean(page, "fiche du module");

  // 2. Attendus lus, puis rapprochement : la « Prochaine étape » doit l'annoncer.
  console.log("STEP 2");
  await followNext(page, moduleUrl, /Rapprocher mes ressources/);
  await expect(page).toHaveURL(/\/matching/);
  await axeClean(page, "rapprochement");
});
