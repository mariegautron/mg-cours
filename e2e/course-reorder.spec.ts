import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openTab } from "./helpers";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("US-61 : monter / descendre une séance au clavier depuis le menu « ⋯ », renumérotation, plus de champ Position", async ({
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
    await page.waitForURL(/\/courses$/);
  }

  await openTab(page, /Séances/);
  const titles = page.getByRole("list").filter({ hasText: "Séance 1" }).getByRole("heading", {
    level: 3,
  });
  await expect(titles).toHaveText(["Alpha", "Bravo", "Charlie"]);
  // Les actions secondaires vivent dans un menu « ⋯ » par séance (une seule action primaire visible).
  const actions = (title: string) =>
    page.getByRole("button", { name: new RegExp(`^Actions de la séance \\d : ${title}`) });
  await actions("Alpha").click();
  await expect(page.getByRole("menuitem", { name: /^Monter/ })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.keyboard.press("Escape");
  await actions("Charlie").click();
  await expect(page.getByRole("menuitem", { name: /^Descendre/ })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.keyboard.press("Escape");

  // Au clavier : Charlie monte deux fois, le focus revient sur le menu de la séance.
  await actions("Charlie").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem", { name: /^Monter/ })).toBeVisible();
  await page.getByRole("menuitem", { name: /^Monter/ }).focus();
  await page.keyboard.press("Enter");
  await expect(titles).toHaveText(["Alpha", "Charlie", "Bravo"]);
  await expect(page.getByRole("status").filter({ hasText: "séance 2 sur 3" })).toHaveCount(1);
  await expect(actions("Charlie")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem", { name: /^Monter/ })).toBeVisible();
  await page.getByRole("menuitem", { name: /^Monter/ }).focus();
  await page.keyboard.press("Enter");
  await expect(titles).toHaveText(["Charlie", "Alpha", "Bravo"]);
  await expect(actions("Charlie")).toBeFocused();

  // Supprimer demande confirmation en nommant la séance ; « Annuler » ne supprime rien.
  await actions("Bravo").click();
  await page.getByRole("menuitem", { name: /^Supprimer/ }).click();
  await expect(
    page.getByRole("alertdialog", { name: "Supprimer la séance « Bravo » ?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(titles).toHaveText(["Charlie", "Alpha", "Bravo"]);

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // L'ordre persiste et modifier une séance ne le change pas.
  await page.goto(`${moduleUrl}/courses`);
  await expect(titles).toHaveText(["Charlie", "Alpha", "Bravo"]);
  await actions("Alpha").click();
  await page.getByRole("menuitem", { name: /^Modifier/ }).click();
  await page.getByLabel("Titre de la séance").fill("Alpha 2");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/courses$/);
  await expect(titles).toHaveText(["Charlie", "Alpha 2", "Bravo"]);
});
