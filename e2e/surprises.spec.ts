import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Imprévus du client : planifiés sur une séance du jour, rappelés dans « Aujourd'hui », marqués envoyés.
test("imprévu du client : ajout, rappel du jour, copie, envoyé", async ({ page, context }) => {
  test.setTimeout(180_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  const suffix = Date.now();
  const today = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Imprévus ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  await page.goto(`${moduleUrl}/courses/new`);
  await page.getByLabel("Titre de la séance").fill(`Séance du jour ${suffix}`);
  await page.getByLabel("Date").first().fill(today);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/courses(\/[0-9a-f-]{36})?$/);

  await page.goto(`${moduleUrl}/project`);
  await page.getByLabel("Titre du projet").fill("Projet imprévus");
  await page.getByRole("button", { name: "Créer le projet" }).click();
  await expect(page.getByRole("heading", { name: /Imprévus du client \(0\)/ })).toBeVisible();

  await page.getByLabel("Titre", { exact: true }).last().fill("Budget réduit");
  await page
    .getByLabel("À envoyer pendant")
    .selectOption({ label: `Séance 1 : Séance du jour ${suffix}` });
  await page
    .getByLabel("Message prêt à copier")
    .last()
    .fill("Bonjour, le budget est réduit de moitié.");
  await page.getByRole("button", { name: "Ajouter l’imprévu" }).click();
  await expect(page.getByRole("heading", { name: /Imprévus du client \(1\)/ })).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.goto("/dashboard");
  await expect(page.getByText("Imprévu à envoyer : Budget réduit")).toBeVisible();
  await page.getByRole("button", { name: "Copier le message : Budget réduit" }).click();
  await expect(page.getByText("Message copié.")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "Bonjour, le budget est réduit de moitié.",
  );

  await page.goto(`${moduleUrl}/project`);
  await page.getByRole("button", { name: "Marquer comme envoyé : Budget réduit" }).click();
  await expect(page.getByText("Envoyé", { exact: true })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("Imprévu à envoyer : Budget réduit")).toHaveCount(0);
});
