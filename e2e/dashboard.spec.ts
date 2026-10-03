import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openTab } from "./helpers";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
}

const isoIn = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

test("US-74 : « À faire » liste au plus trois choses, jamais « Tout est en ordre » à tort", async ({
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
  const todo = page.locator("section[aria-labelledby='todo']");
  await expect(todo).toBeVisible();
  // Trois choses au plus ; le tri et les niveaux d'urgence sont couverts par Vitest.
  expect(await todo.getByRole("listitem").count()).toBeLessThanOrEqual(3);
  await expect(page.getByText(/Tout est en ordre/)).toHaveCount(0);

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});

test("US-63 : la séance du jour est accessible en un clic depuis le tableau de bord", async ({
  page,
}) => {
  await login(page);
  const suffix = Date.now();
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Jour J ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);

  await openTab(page, /Séances/);
  await page.getByRole("link", { name: "Ajouter une séance" }).click();
  await page.getByLabel("Titre de la séance").fill(`Séance du jour ${suffix}`);
  await page.getByLabel("Date", { exact: true }).fill(today);
  await page.getByLabel("Début").fill("14:00");
  await page.getByLabel("Fin").fill("16:00");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText(`Séance du jour ${suffix}`).first()).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /^Aujourd’hui · /, level: 1 })).toBeVisible();
  // La séance est la grande carte (ou « Ensuite aujourd'hui » si d'autres séances sont plus tôt).
  await expect(page.getByText(`Séance du jour ${suffix}`).first()).toBeVisible();
  await expect(
    page.getByText(new RegExp(`14:00–16:00 · .*Module Jour J ${suffix}`, "i")).first(),
  ).toBeVisible();
  const start = page.getByRole("link", { name: /^Commencer le cours/ }).first();
  await expect(start).toHaveAttribute(
    "href",
    new RegExp(`^/present/modules/[0-9a-f-]{36}/courses/[0-9a-f-]{36}$`),
  );
  // Les trois cartes de la maquette.
  for (const name of [
    /Ce qu’on avait dit la dernière fois/,
    /Prêt pour aujourd’hui/,
    /Tes étudiant·es/,
  ]) {
    await expect(page.getByRole("region", { name }).first()).toBeVisible();
  }

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await start.click();
  await page.waitForURL(/\/present\/modules\/.+\/courses\//);
});

test("l'accueil dit toujours où on en est : séance du jour ou prochain cours", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Jamais de silence : le bouton de la séance du jour, ou la phrase « pas de cours aujourd'hui ».
  await expect(
    page.getByText(/pas de cours aujourd’hui|Commencer le cours/i).first(),
  ).toBeVisible();
});
