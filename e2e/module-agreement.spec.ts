import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Convention de formation : plusieurs fichiers, libellé, date, rattachement à un autre module,
// fichier conservé tant qu'un module le référence.
async function newModule(page: Page, name: string): Promise<string> {
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(name);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  return page.url();
}

test("convention de formation : dépôt, libellé, rattachement, suppression", async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  const stamp = Date.now();
  const nameA = `Module convention A ${stamp}`;
  const nameB = `Module convention B ${stamp}`;
  const urlA = await newModule(page, nameA);
  const urlB = await newModule(page, nameB);

  await page.goto(`${urlA}/finish`);
  await expect(page.getByText("Convention déposée")).toBeVisible();

  await page.goto(`${urlA}/documents`);
  const slot = page.getByRole("region", { name: /Convention de formation/ });
  await slot.getByLabel(/Libellé du prochain fichier/).fill("Convention de prestation");
  await slot.getByLabel(/Date de signature \(facultative\)/).fill("2025-05-19");
  await slot.locator('input[type="file"]').setInputFiles({
    name: "convention.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"),
  });
  await expect(slot.getByText("Document déposé.")).toBeVisible({ timeout: 30_000 });
  await expect(slot.getByText("Convention de prestation").first()).toBeVisible();

  // Libellé modifiable.
  await slot.getByLabel("Libellé", { exact: true }).fill("Avenant n° 1");
  await slot.getByRole("button", { name: "Enregistrer le libellé" }).click();
  await expect(slot.getByText("Libellé et date enregistrés.")).toBeVisible();

  // Rattachement à B : même fichier, rien n'est copié.
  await slot.getByText("Rattacher aussi à un autre module").click();
  await slot.getByLabel("Autre module").selectOption({ label: `${nameB} (2026-2027)` });
  await slot.getByRole("button", { name: "Rattacher", exact: true }).click();
  await expect(slot.getByText(/Rattaché aussi à/)).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.goto(`${urlA}/finish`);
  await expect(page.getByText("Convention de formation déposée")).toBeVisible();

  // Supprimé dans A : le fichier reste lisible depuis B.
  await page.goto(`${urlA}/documents`);
  await page
    .getByRole("button", { name: /Supprimer/ })
    .first()
    .click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(
    page.getByRole("region", { name: /Convention de formation/ }).getByText("Avenant n° 1"),
  ).toHaveCount(0);

  await page.goto(`${urlB}/documents`);
  const slotB = page.getByRole("region", { name: /Convention de formation/ });
  await expect(slotB.getByText("Avenant n° 1")).toBeVisible();
  const href = await slotB.getByRole("link", { name: /Télécharger/ }).getAttribute("href");
  const res = await page.request.get(href!);
  expect(res.status()).toBe(200);
});
