import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
}

test("affiche un tableau Markdown, défilable au clavier, sans violation d'accessibilité", async ({
  page,
}) => {
  await login(page);

  await page.goto("/resources/new");
  const title = `Ressource Tableau ${Date.now()}`;
  await page.getByLabel("Titre").fill(title);
  await page.getByLabel("Type").selectOption("course");
  await page
    .getByLabel(/Contenu/)
    .fill(
      "| Critère | Points |\n| :--- | ---: |\n| Présentation | 4 |\n| Contenu | 6 |\n\n" +
        "- [ ] À relire\n- [x] Fait\n\n---\n\n<aside>\n**Important** : relire avant envoi.\n</aside>",
    );
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();

  const region = page.getByRole("region", { name: "Tableau" });
  await expect(region.getByRole("table")).toBeVisible();
  await expect(region.getByRole("columnheader", { name: "Points" })).toBeVisible();
  await expect(region.getByRole("cell", { name: "4" })).toBeVisible();

  // Défilement horizontal accessible au clavier : la région est focusable.
  await region.focus();
  await expect(region).toBeFocused();

  // Case à cocher en lecture seule (texte accessible, pas de case interactive).
  await expect(page.getByText("fait :")).toBeVisible();
  await expect(page.getByText("à faire :")).toBeVisible();

  // Encadré <aside> rendu comme du Markdown imbriqué.
  await expect(page.getByText("Important")).toBeVisible();
  await expect(page.getByText("relire avant envoi.")).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});
