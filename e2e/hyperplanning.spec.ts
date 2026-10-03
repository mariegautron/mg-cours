import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { openTab } from "./helpers";
import { PDFDocument, StandardFonts } from "pdf-lib";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
const AGILE = [
  "NANTES YNOV CAMPUS",
  "Methodologies Agile & Scrum",
  "Nantes | DEVFLSTK MAST1 21h00",
  "Nantes | DEVFLSTK MAST1 21h00",
  "3h00 lun. 12/10/2026 08h00",
  "1h00 lun. 12/10/2026 11h00",
  "3h00 lun. 12/10/2026 13h00",
  "3h00 lun. 02/11/2026 08h00",
  "1h00 lun. 02/11/2026 11h00",
  "3h00 lun. 02/11/2026 13h00",
  "4h00 mar. 03/11/2026 08h00",
  "3h00 mar. 03/11/2026 13h00",
  "Cadrage de projet",
  "Nantes | DEVFLSTK MAST2 10h00",
  "2h30 mer. 14/10/2026 09h00",
  "2h30 jeu. 15/10/2026 09h00",
  "2h30 ven. 16/10/2026 09h00",
  "2h30 sam. 17/10/2026 09h00",
];

async function hyperplanningPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  AGILE.forEach((line, i) => page.drawText(line, { x: 40, y: 800 - i * 20, size: 11, font }));
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

async function dropPdf(page: Page) {
  await page.getByLabel(/Export Hyperplanning \(PDF/).setInputFiles({
    name: "services.pdf",
    mimeType: "application/pdf",
    buffer: await hyperplanningPdf(),
  });
}

test("crée un module depuis l'export Hyperplanning : aperçu, confirmation, 6 séances et 3 dates", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await login(page);
  await page.goto("/modules/new");
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Nom du module").fill("Méthodologies Agile & Scrum");
  // Année unique : évite le YCODE en double entre exécutions (aucun YCODE ici).
  await dropPdf(page);

  await expect(
    page.getByRole("heading", { name: /Matière trouvée : Methodologies Agile/ }),
  ).toBeVisible();
  await expect(page.getByLabel("Nombre d’heures total")).toHaveValue("21");

  // Étape 2 : séances déduites, dates et échéance ; rien n'est créé avant l'accord.
  await page.getByRole("button", { name: /Continuer/ }).click();
  const preview = page.getByRole("table", { name: /6 séances/ });
  await expect(preview).toBeVisible();
  await expect(preview.getByRole("row")).toHaveCount(7);
  await expect(page.getByText("Total : 21 h sur 21 h du module")).toBeVisible();
  await expect(page.getByText("Le compte est bon")).toBeVisible();
  await expect(page.getByLabel("Date de la 1re séance")).toHaveValue("2026-10-12");
  await expect(page.getByLabel("Début", { exact: true })).toHaveValue("2026-10-12");
  await expect(page.getByLabel("Fin", { exact: true })).toHaveValue("2026-11-03");
  await expect(page.getByRole("heading", { name: "Échéance de la progression" })).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // Sans fusion : un créneau = une séance (8 créneaux).
  await page.getByLabel("Fusionner les créneaux qui se suivent").click();
  await expect(page.getByRole("table", { name: /8 séances/ })).toBeVisible();
  await page.getByLabel("Fusionner les créneaux qui se suivent").click();
  await expect(page.getByRole("table", { name: /6 séances/ })).toBeVisible();

  await page.getByRole("button", { name: "Créer le module et ses 6 séances" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const url = page.url();
  await openTab(page, /Séances/);
  await expect(page.getByText("Séance 6").first()).toBeVisible();

  await page.goto(`${url}/edit`);
  await expect(page.getByLabel("Date de la 1re séance")).toHaveValue("2026-10-12");
  await expect(page.getByLabel("Date de début")).toHaveValue("2026-10-12");
  await expect(page.getByLabel("Date de fin")).toHaveValue("2026-11-03");
});

test("sur un module existant : liste au choix si le nom ne correspond pas, écart de date montré", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await login(page);
  await page.goto("/modules/new");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Nom du module").fill("Module sans rapport");
  await page.getByRole("button", { name: /Continuer/ }).click();
  await page.getByLabel("Date de la 1re séance").fill("2026-10-05");
  await page.getByRole("button", { name: /^Créer le module/ }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const id = page.url().split("/").pop();

  await page.goto(`/modules/${id}/schedule`);
  await page.waitForLoadState("networkidle");
  await dropPdf(page);

  await expect(page.getByRole("heading", { name: /Aucune matière ne porte le nom/ })).toBeVisible();
  await page.getByRole("radio", { name: /Methodologies Agile & Scrum/ }).check();
  await expect(
    page.getByText("La 1re séance passerait du 05/10/2026 au 12/10/2026."),
  ).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.getByRole("button", { name: "Utiliser ces séances et ces dates" }).click();
  await page.getByRole("button", { name: "Créer les séances" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}\/courses/);

  await page.goto(`/modules/${id}/edit`);
  await expect(page.getByLabel("Date de la 1re séance")).toHaveValue("2026-10-12");
  await expect(page.getByLabel("Date de fin")).toHaveValue("2026-11-03");
});

test("signale un PDF sans créneau Hyperplanning", async ({ page }) => {
  await login(page);
  await page.goto("/modules/new");
  await page.waitForLoadState("networkidle");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc
    .addPage()
    .drawText("Un texte sans aucun rapport avec un planning.", { x: 40, y: 700, size: 12, font });
  await page.getByLabel(/Export Hyperplanning \(PDF/).setInputFiles({
    name: "autre.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await doc.save()),
  });
  await expect(page.getByRole("alert").filter({ hasText: "Aucun créneau reconnu" })).toBeVisible();
});
