import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("créer le module : deux étapes, champs requis, retour sans perte, échéance, accessibilité", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/modules/new");
    await page.waitForLoadState("networkidle");

    const steps = page.getByRole("list", { name: "Étapes de la création" });
    await expect(steps.locator("[aria-current=step]")).toContainText("Les documents de l’école");
    await expect(page.getByRole("heading", { name: "Nouveau module", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Annuler" })).toBeVisible();
    const overflow = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
    expect(await overflow(), `étape 1 @${width}`).toBeLessThanOrEqual(0);
    let axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(axe.violations, `axe étape 1 @${width}`).toEqual([]);

    // Le nom est requis pour passer à la suite : on reste sur l'étape 1.
    await page.getByRole("button", { name: /Continuer/ }).click();
    await expect(page.getByRole("heading", { name: "Nouveau module", level: 1 })).toBeVisible();

    await page.getByLabel("Nom du module").fill(`Création ${Date.now()}`);
    await page.getByLabel("Nombre d’heures total").fill("6");
    await page.getByRole("button", { name: /Continuer/ }).click();
    await expect(page.getByRole("heading", { name: "Planning et dates", level: 1 })).toBeFocused();
    await expect(steps.locator("[aria-current=step]")).toContainText("Planning et dates");
    await expect(page.getByText("Aucune séance pour l’instant")).toBeVisible();
    await expect(page.getByRole("button", { name: "Créer le module", exact: true })).toBeVisible();

    // Une 1re séance passée : l'échéance J-15 est dépassée, sans bloquer.
    await page.getByLabel("Date de la 1re séance").fill("2020-01-20");
    await expect(page.getByText("05/01/2020")).toBeVisible();
    await expect(page.getByText(/Dépassée de \d+ jours/)).toBeVisible();

    // Saisie à la main : le total se compare aux heures du module.
    await page.getByText("Ajouter ou saisir des créneaux à la main").click();
    await page.getByRole("button", { name: "Ajouter une ligne" }).click();
    await page.getByLabel("Date du créneau 1").fill("2026-10-12");
    await page.getByLabel("Début du créneau 1").fill("10:00");
    await page.getByLabel("Fin du créneau 1").fill("12:00");
    await expect(page.getByRole("table", { name: /1 séance proposée/ })).toBeVisible();
    await expect(page.getByText("Saisie à la main")).toBeVisible();
    await expect(page.getByText("Il manque 4 h")).toBeVisible();
    await expect(page.getByRole("button", { name: "Créer le module et sa séance" })).toBeVisible();

    expect(await overflow(), `étape 2 @${width}`).toBeLessThanOrEqual(0);
    axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(axe.violations, `axe étape 2 @${width}`).toEqual([]);

    // Retour : l'étape 1 garde ce qui a été saisi.
    await page.getByRole("button", { name: "← Retour" }).click();
    await expect(page.getByRole("heading", { name: "Nouveau module", level: 1 })).toBeFocused();
    await expect(page.getByLabel("Nombre d’heures total")).toHaveValue("6");
  }
});
