import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
// PNG 1×1 transparent.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

test("dépose une image et un PDF sur une ressource, affiche l’image dans le contenu", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/resources/new");
  const title = `Ressource fichiers ${Date.now()}`;
  await page.getByLabel("Titre").fill(title);
  await page.getByLabel("Contenu (Markdown)").fill("## Schéma\n\n![Logo de test](logo.png)\n");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/resources\/[0-9a-f-]{36}$/);
  await page.waitForLoadState("networkidle");

  for (const file of [
    { name: "logo.png", mimeType: "image/png", buffer: PNG },
    {
      name: "cours.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"),
    },
  ]) {
    await page.getByLabel("Déposer un fichier").setInputFiles(file);
    await page.getByRole("button", { name: "Déposer", exact: true }).click();
    await expect(page.getByRole("link", { name: `Télécharger ${file.name}` })).toBeVisible();
  }

  // L'image du contenu passe par la route qui redirige vers un lien signé.
  await page.reload();
  const img = page.getByRole("img", { name: "Logo de test" });
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth))
    .toBe(1);

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: /Télécharger cours\.pdf/ }).click();
  expect((await download).suggestedFilename()).toBe("cours.pdf");

  await page.getByRole("button", { name: /Supprimer cours\.pdf/ }).click();
  await expect(page.getByRole("link", { name: "Télécharger cours.pdf" })).toHaveCount(0);
});
