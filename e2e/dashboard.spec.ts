import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
}

const isoIn = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

test("US-74 : une progression à J-15 est signalée, jamais « Tout est en ordre »", async ({
  page,
}) => {
  await login(page);
  const name = `Module J15 ${Date.now()}`;

  // 1re séance dans 25 jours → échéance de la progression dans 10 jours (niveau J-15).
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(name);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByLabel("Date de la 1re séance").fill(isoIn(25));
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);

  await page.goto("/dashboard");
  const card = page.getByRole("region", { name: "Progressions pédagogiques à envoyer" });
  // La carte n'affiche que les 5 plus pressantes : sur une base de test chargée, le module peut
  // être résumé dans « + N autre(s) ». Le tri et les niveaux sont couverts par Vitest.
  const item = card.getByRole("listitem").filter({ hasText: name });
  if (await item.count()) {
    await expect(item.getByText(/^À préparer · J-1[01]$/)).toBeVisible();
  } else {
    await expect(card.getByText(/autre\(s\)/)).toBeVisible();
  }
  await expect(page.getByText(/Tout est en ordre/)).toHaveCount(0);

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});
