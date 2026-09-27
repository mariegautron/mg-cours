import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

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

  await expect(page.getByRole("status")).toContainText("Préremplis");
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
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Architecture Web", level: 1 })).toBeVisible();
});

test("signale un PDF sans texte exploitable", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/modules/new");
  await page.waitForLoadState("networkidle");
  await page.getByLabel(/Fiche pédagogique \(PDF/).setInputFiles({
    name: "vide.pdf",
    mimeType: "application/pdf",
    buffer: await fichePdf(["Bonjour, un texte sans aucun rapport avec un module."]),
  });
  await expect(page.locator("p[role=alert]")).toContainText("Rien d’exploitable");
});
