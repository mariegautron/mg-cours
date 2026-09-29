import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openTab } from "./helpers";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("US-61 : monter / descendre une séance au clavier, renumérotation, plus de champ Position", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Ordre ${Date.now()}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  for (const title of ["Alpha", "Bravo", "Charlie"]) {
    await page.goto(`${moduleUrl}/courses/new`);
    await expect(page.getByLabel("Position")).toHaveCount(0);
    await page.getByLabel("Titre de la séance").fill(title);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForURL(/#courses$/);
  }

  await openTab(page, /Séances/);
  const titles = page.getByRole("list").filter({ hasText: "Séance 1" }).getByRole("heading", {
    level: 3,
  });
  await expect(titles).toHaveText(["Alpha", "Bravo", "Charlie"]);
  await expect(page.getByRole("button", { name: /^Monter la séance 1/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /^Descendre la séance 3/ })).toBeDisabled();

  // Au clavier : Charlie monte deux fois, le focus le suit.
  const up = () => page.getByRole("button", { name: /^Monter la séance \d : Charlie/ });
  await up().focus();
  await page.keyboard.press("Enter");
  await expect(titles).toHaveText(["Alpha", "Charlie", "Bravo"]);
  await expect(page.getByRole("status").filter({ hasText: "séance 2 sur 3" })).toHaveCount(1);
  await expect(up()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(titles).toHaveText(["Charlie", "Alpha", "Bravo"]);
  // En haut de liste : le focus passe au bouton « Descendre ».
  await expect(
    page.getByRole("button", { name: /^Descendre la séance 1 : Charlie/ }),
  ).toBeFocused();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // L'ordre persiste et modifier une séance ne le change pas.
  await page.goto(`${moduleUrl}#courses`);
  await expect(titles).toHaveText(["Charlie", "Alpha", "Bravo"]);
  await page.getByRole("link", { name: "Modifier Alpha" }).click();
  await page.getByLabel("Titre de la séance").fill("Alpha 2");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/#courses$/);
  await expect(titles).toHaveText(["Charlie", "Alpha 2", "Bravo"]);
});
