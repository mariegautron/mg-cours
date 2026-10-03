import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("US-72 : « Prochaine étape » sur le module et raisons du blocage sur la facturation", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  const name = `Étape ${Date.now()}`;
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(name);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);

  // E18 : le badge de l'en-tête reprend l'étape courante du parcours « Où j'en suis ».
  await expect(page.getByText("Prochaine étape · 1 sur 10")).toBeVisible();
  await expect(page.getByRole("link", { name: "Lire les attendus de la fiche →" })).toBeVisible();
  const journey = page.getByRole("region", { name: "Où j’en suis" });
  await expect(journey.getByRole("link", { name: /Fiche de l’école et attendus/ })).toBeVisible();
  await expect(journey.getByRole("listitem")).toHaveCount(10);
  await expect(journey.locator("[aria-current=step]")).toContainText(
    "Fiche de l’école et attendus",
  );
  await expect(journey.getByText("Fait", { exact: true })).toHaveCount(0);

  await page.goto("/billing");
  const item = page.getByRole("listitem").filter({ hasText: name });
  await expect(
    item.getByText("Prochaine étape : envoyer la progression pédagogique"),
  ).toBeVisible();
  await expect(item.getByText("La progression pédagogique n’a pas été envoyée.")).toBeVisible();
  await expect(item.getByText(/Document manquant : Fiche de positionnement/)).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});
