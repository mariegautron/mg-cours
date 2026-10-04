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

test("US-59 : planning saisi en tableau et collé → séances créées, y compris sur un module existant", async ({
  page,
}) => {
  await login(page);

  await page.goto("/modules/new");
  const moduleName = `Planning ${Date.now()}`;
  await page.getByLabel("Nom du module").fill(moduleName);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("6");

  await page.getByRole("button", { name: /Continuer/ }).click();
  await page.getByText("Ajouter ou saisir des créneaux à la main").click();
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
  await expect(page.getByRole("heading", { name: /3 séances proposées/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /3.*26\/10\/2026.*10:00–12:00/ })).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.getByRole("button", { name: /^Créer le module/ }).click();
  await expect(page.getByRole("heading", { name: moduleName, level: 1 })).toBeVisible();
  const moduleUrl = page.url();
  await expect(page.getByText(/Échéance/).first()).toBeVisible();

  await openTab(page, /Séances/);
  for (const n of [1, 2, 3]) await expect(page.getByText(`Séance ${n}`).first()).toBeVisible();
  await expect(page.getByText("À préparer").first()).toBeVisible();

  // US-60 : 3 créneaux de 2 h sur 6 h annoncées → cohérent ; une séance raccourcie → avertissement.
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/6 h sur 6 h/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("À vérifier")).toHaveCount(0);
  await page.getByRole("link", { name: /^Modifier la séance 1/ }).click();
  await expect(page.getByLabel("Début")).toHaveValue("10:00");
  await page.getByLabel("Fin").fill("09:00");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("La fin doit être après le début.")).toBeVisible();
  await page.getByLabel("Fin").fill("11:00");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await openTab(page, /Séances/);
  await expect(page.getByText(/5 h sur 6 h/)).toBeVisible();
  await expect(page.getByText(/Il manque 1 h par rapport aux 6 h du module/)).toBeVisible();

  // Module existant : la numérotation continue.
  await page.goto(`${moduleUrl}/schedule`);
  await page.getByRole("button", { name: "Ajouter une ligne" }).click();
  await page.getByLabel("Date du créneau 1").fill("2026-11-02");
  await page.getByLabel("Début du créneau 1").fill("10:00");
  await page.getByLabel("Fin du créneau 1").fill("12:00");
  await expect(page.getByText(/Séance 4/)).toBeVisible();
  await page.getByRole("button", { name: "Créer les séances" }).click();
  await page.waitForURL(/\/courses(\/[0-9a-f-]{36})?$/);
  await openTab(page, /Séances/);
  await expect(page.getByText("Séance 4").first()).toBeVisible();
});
