import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openTab } from "./helpers";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("dépose, télécharge et supprime les attendus de l’école d’un module", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Documents ${Date.now()}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByLabel("Lien des slides (Figma)").fill("https://www.figma.com/deck/abc123");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);

  await page.waitForLoadState("networkidle");
  await page.waitForLoadState("networkidle");
  await openTab(page, /Administratif/);
  await expect(page.getByRole("link", { name: /Ouvrir les slides/ })).toHaveAttribute(
    "href",
    "https://www.figma.com/deck/abc123",
  );
  await openTab(page, /Administratif/);
  await page.getByLabel(/Déposer un fichier \(attendus/).setInputFiles({
    name: "attendus-ecole.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"),
  });
  // Dépôt immédiat à la sélection du fichier (zone de dépôt).
  await expect(page.getByRole("link", { name: /Télécharger attendus-ecole\.pdf/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Aperçu attendus-ecole\.pdf/ })).toHaveAttribute(
    "href",
    /\?inline=1$/,
  );

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: /Télécharger attendus-ecole\.pdf/ }).click();
  expect((await download).suggestedFilename()).toBe("attendus-ecole.pdf");

  // Suppression confirmée : « Annuler » conserve le fichier, « Supprimer » l'efface.
  await page.getByRole("button", { name: /Supprimer attendus-ecole\.pdf/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByText("attendus-ecole.pdf").first()).toBeVisible();
  await page.getByRole("button", { name: /Supprimer attendus-ecole\.pdf/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByText("attendus-ecole.pdf")).toHaveCount(0);

  // Facture émise hors application : dépôt sur la page Facturation, puis module payé.
  await page.goto(`${page.url().split("#")[0]}/billing`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel(/Déposer un fichier \(ma facture/).setInputFiles({
    name: "facture-26-03-6.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"),
  });
  await expect(page.getByRole("link", { name: /Télécharger facture-26-03-6\.pdf/ })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Pas de facture déposée" })).toHaveCount(
    0,
  );
  // US-150 : deux cases, « Envoyée à l'école » puis « Payée ».
  await page.getByRole("checkbox", { name: "Envoyée à l’école" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "En attente de paiement" }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Payée" }).click();
  await expect(page.getByRole("status").filter({ hasText: /^Payée$/ })).toBeVisible();
  const axeBilling = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axeBilling.violations).toEqual([]);
});
