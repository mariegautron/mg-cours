import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { createAssessment, createSimpleGrid, loginLight } from "./grading-setup";

// US-145 : rendus multiples (fichiers et liens) par personne, ajoutés par Marie.
test("rendus multiples : liens et fichiers, ouverture, suppression", async ({ page }) => {
  test.setTimeout(120_000);
  await loginLight(page);
  const suffix = Date.now();
  const gridName = `Grille Rendus ${suffix}`;
  await createSimpleGrid(page, gridName, [["Structure", 4]]);
  const setup = await createAssessment(page, gridName, suffix, { firstNames: ["Ana"] });
  const [ana] = setup.studentNames;
  await page.goto(setup.assessmentUrl);
  await expect(page.getByRole("heading", { name: "Rendus déposés" })).toBeVisible({
    timeout: 20_000,
  });
  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: ana, level: 3 }) });
  await expect(card.getByText("Aucun rendu")).toBeVisible();

  // Liens : pas de javascript:, https par défaut.
  await card.getByLabel(`Lien à ajouter (${ana})`).fill("javascript:alert(1)");
  await card.getByRole("button", { name: /Ajouter le lien/ }).click();
  await expect(page.getByText("Seuls les liens http et https sont acceptés.")).toBeVisible();
  await card.getByLabel(`Lien à ajouter (${ana})`).fill("github.com/ana/projet");
  await card.getByLabel("Étiquette (facultatif)").fill("Dépôt Git");
  await card.getByRole("button", { name: /Ajouter le lien/ }).click();
  await expect(card.getByText("1 élément")).toBeVisible();
  const open = card.getByRole("link", { name: /Ouvrir Dépôt Git/ });
  await expect(open).toHaveAttribute("href", "https://github.com/ana/projet");
  await expect(open).toHaveAttribute("target", "_blank");
  await expect(open).toHaveAttribute("rel", /noopener/);

  // Fichier.
  await card.getByLabel(/Ajouter un fichier/).setInputFiles({
    name: "rendu-ana.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"),
  });
  await expect(card.getByText("2 éléments")).toBeVisible({ timeout: 20_000 });
  await expect(card.getByRole("link", { name: /Ouvrir rendu-ana\.pdf/ })).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // US-146 : la bande « Rendu » de la copie montre les éléments, avec « Ouvrir ».
  await page.goto(setup.correctUrl);
  const copy = page.getByRole("form", { name: ana });
  await expect(copy.getByText("2 éléments")).toBeVisible({ timeout: 20_000 });
  const copyLink = copy.getByRole("link", { name: /Ouvrir Dépôt Git/ });
  await expect(copyLink).toHaveAttribute("target", "_blank");
  await expect(copyLink).toHaveAttribute("rel", /noopener/);
  await expect(copy.getByRole("link", { name: /Ouvrir rendu-ana\.pdf/ })).toBeVisible();

  // Suppression confirmée (page de l'évaluation).
  await page.goto(setup.assessmentUrl);
  await card.getByRole("button", { name: /Supprimer Dépôt Git/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(card.getByText("1 élément")).toBeVisible();
});
