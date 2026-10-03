import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Création de ressource en une page : collage nettoyé, diapos à côté, brouillon annoncé et repris.
test("collage nettoyé, aperçu des diapos, brouillon local annoncé puis repris, axe", async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/resources/new");
  await page.getByLabel("Titre", { exact: true }).fill("Collage Word");
  const content = page.getByLabel("Contenu (Markdown)");
  await content.focus();
  await page.evaluate(() =>
    navigator.clipboard.writeText("## Intro\n\n• Un\n• Deux\n\n1) Premier\n2) Second"),
  );
  await page.keyboard.press("Control+v");
  await expect(content).toHaveValue(/- Un\n- Deux\n\n1\. Premier\n2\. Second/);
  await expect(page.getByText(/Collage nettoyé/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Diapositives \(\d+\)/ })).toBeVisible();
  await expect(page.getByRole("complementary").getByText("Intro")).toBeVisible();
  await expect(page.getByText(/Brouillon enregistré sur cet appareil à/)).toBeVisible();

  const res = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(res.violations).toEqual([]);

  // Le garde « modifications non enregistrées » ouvre une confirmation avant de recharger.
  page.on("dialog", (d) => void d.accept());
  await page.reload();
  await expect(page.getByText("Un brouillon plus récent existe sur cet appareil.")).toBeVisible();
  await page.getByRole("button", { name: "Reprendre le brouillon" }).click();
  await expect(page.getByLabel("Contenu (Markdown)")).toHaveValue(/- Un/);
});
