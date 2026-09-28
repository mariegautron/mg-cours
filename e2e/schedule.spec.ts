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

test("US-59 : planning saisi en tableau et collé → séances créées, y compris sur un module existant", async ({
  page,
}) => {
  await login(page);

  await page.goto("/modules/new");
  const moduleName = `Planning ${Date.now()}`;
  await page.getByLabel("Nom du module").fill(moduleName);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("6");

  await page.getByRole("button", { name: "Ajouter une ligne" }).click();
  await page.getByLabel("Date du créneau 1").fill("2026-10-12");
  await page.getByLabel("Début du créneau 1").fill("10:00");
  await page.getByLabel("Fin du créneau 1").fill("12:00");
  await page.getByRole("button", { name: "Dupliquer le créneau 1 à + 7 jours" }).click();
  await expect(page.getByLabel("Date du créneau 2")).toHaveValue("2026-10-19");

  await page.getByLabel("Ou coller un planning").fill("26/10 10h-12h\nn'importe quoi");
  await page.getByRole("button", { name: "Ajouter ces créneaux au tableau" }).click();
  await expect(page.getByText("1 créneau reconnu, 1 ligne ignorée.")).toBeVisible();
  await expect(page.getByText("Ligne 2 : « n'importe quoi »")).toBeVisible();
  await expect(page.getByRole("heading", { name: /3 séances à créer/ })).toBeVisible();
  await expect(page.getByText(/Séance 3.*26 octobre 2026.*10:00–12:00/)).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: moduleName, level: 1 })).toBeVisible();
  const moduleUrl = page.url();
  await expect(page.getByText(/Échéance/).first()).toBeVisible();

  await page.getByRole("tab", { name: /Séances/ }).click();
  for (const n of [1, 2, 3]) await expect(page.getByText(`Séance ${n}`).first()).toBeVisible();
  await expect(page.getByText("À préparer").first()).toBeVisible();

  // Module existant : la numérotation continue.
  await page.goto(`${moduleUrl}/schedule`);
  await page.getByRole("button", { name: "Ajouter une ligne" }).click();
  await page.getByLabel("Date du créneau 1").fill("2026-11-02");
  await page.getByLabel("Début du créneau 1").fill("10:00");
  await page.getByLabel("Fin du créneau 1").fill("12:00");
  await expect(page.getByText(/Séance 4/)).toBeVisible();
  await page.getByRole("button", { name: "Créer les séances" }).click();
  await page.waitForURL(/#courses$/);
  await page.getByRole("tab", { name: /Séances/ }).click();
  await expect(page.getByText("Séance 4").first()).toBeVisible();
});
