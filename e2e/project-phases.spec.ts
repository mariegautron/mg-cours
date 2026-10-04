import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// « Les phases » du brief : lesquelles sont notées, et « Noter la phase » crée l'évaluation.
test("phases du projet : noter une phase crée l'évaluation et la relie", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module phases ${Date.now()}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  await page.goto(`${moduleUrl}/project`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Titre du projet").fill("Projet à phases");
  await page
    .getByRole("button", { name: /Brief client en jeu de rôle|Jeu de rôle client/ })
    .click();
  await page.getByRole("button", { name: "Créer le projet" }).click();

  await expect(page.getByRole("heading", { name: "Les phases", level: 2 })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Sans note").first()).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.getByRole("button", { name: /^Noter la phase 1/ }).click();
  await expect(page.getByText(/est maintenant une évaluation du projet/)).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("link", { name: /^Ouvrir l’évaluation/ }).first()).toBeVisible({
    timeout: 20_000,
  });
  await page.goto(`${moduleUrl}/assessments`);
  await expect(page.getByText("Cadrage").first()).toBeVisible();
});

test("phases du projet : « Ne plus noter cette phase » supprime l'évaluation créée par erreur", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module phases annulées ${Date.now()}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  await page.goto(`${moduleUrl}/project`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Titre du projet").fill("Projet à phases");
  await page
    .getByRole("button", { name: /Brief client en jeu de rôle|Jeu de rôle client/ })
    .click();
  await page.getByRole("button", { name: "Créer le projet" }).click();
  await expect(page.getByRole("heading", { name: "Les phases", level: 2 })).toBeVisible({
    timeout: 20_000,
  });

  // Noter la phase 1 « par erreur », puis ne plus la noter (aucune note : confirmation simple).
  await page.getByRole("button", { name: /^Noter la phase 1/ }).click();
  await expect(page.getByText("Notée au projet").first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /^Ne plus noter la phase 1/ }).click();
  await expect(page.getByText("Cette évaluation et ses notes seront supprimées.")).toBeVisible();
  await page.getByRole("button", { name: "Supprimer l’évaluation" }).click();
  await expect(page.getByRole("button", { name: /^Noter la phase 1/ })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Notée au projet")).toHaveCount(0);

  // « Annuler » (10 s) la recrée.
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByText("Notée au projet").first()).toBeVisible({ timeout: 20_000 });
});
