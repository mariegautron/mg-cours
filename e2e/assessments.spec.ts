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

test("grille, groupe, évaluation notée et compteur de notes", async ({ page }) => {
  await login(page);
  const suffix = Date.now();

  // Grille de correction.
  await page.goto("/assessments/grids/new");
  const gridName = `Grille Oral ${suffix}`;
  await page.getByLabel("Nom de la grille").fill(gridName);
  await page.getByLabel("Libellé du critère 1").fill("Présentation");
  await page.getByLabel("Points").first().fill("4");
  await page.getByRole("button", { name: "Ajouter un critère" }).click();
  await page.getByLabel("Libellé du critère 2").fill("Contenu");
  await page.getByLabel("Points").last().fill("6");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: gridName })).toBeVisible();

  // Un·e étudiant·e et un groupe sur le module exemple.
  await page.goto("/students/new");
  await page.getByLabel("Prénom").fill("Nora");
  await page.getByLabel("Nom", { exact: true }).fill(`Benali${suffix}`);
  await page.getByRole("button", { name: "Enregistrer" }).click();

  // Module neuf (21 h → 3 notes requises) pour un compteur isolé d'un run à l'autre.
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Éval ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  await page.getByRole("link", { name: "Ajouter un groupe" }).click();
  const groupName = `Groupe Éval ${suffix}`;
  await page.getByLabel("Nom du groupe").fill(groupName);
  await page.getByRole("button", { name: "Créer le groupe" }).click();
  await page
    .getByRole("listitem")
    .filter({ hasText: `Nora Benali${suffix}` })
    .getByRole("button", { name: /Ajouter/ })
    .click();

  // Évaluation individuelle avec grille, sur ce groupe.
  await page.goto(`${moduleUrl}/assessments/new`);
  await page.getByLabel("Titre").fill(`Oral ${suffix}`);
  await page.getByRole("checkbox", { name: groupName }).check();
  await page.getByLabel("Grille de correction (optionnel)").selectOption({ label: gridName });
  await page.getByRole("button", { name: "Enregistrer" }).click();

  // Noter l'étudiant·e via la grille.
  await expect(page.getByText(`Nora Benali${suffix}`)).toBeVisible();
  await page.getByLabel("Présentation (/4)").fill("3");
  await page.getByLabel("Contenu (/6)").fill("5");
  await page.getByRole("button", { name: "Enregistrer la note" }).click();
  await expect(page.getByText("Note enregistrée.")).toBeVisible();
  await expect(page.getByText("Note actuelle : 8 / 10 (16/20)")).toBeVisible();

  // Export PDF des résultats + envoi e-mail (non configuré en local).
  const pdfUrl = `${moduleUrl.replace("/modules/", "/api/modules/")}/assessments/${page.url().split("/").pop()}/results`;
  const pdf = await page.request.get(pdfUrl);
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
  await page.getByRole("button", { name: "Envoyer par e-mail" }).click();
  await expect(page.getByText(/Envoi d’e-mails non configuré/)).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // Le compteur de notes du module reflète l'évaluation notée.
  await page.goto(`${moduleUrl}/assessments`);
  await expect(page.getByText(/1\/3 notes? requises?/)).toBeVisible();
  await expect(page.getByRole("cell", { name: `Nora Benali${suffix}` })).toBeVisible();
  // 8/10 ramené sur 20.
  await expect(page.getByRole("cell", { name: "16.00" })).toBeVisible();
});

test("une évaluation sur plusieurs groupes compte pour une seule note", async ({ page }) => {
  await login(page);
  const suffix = Date.now();

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Multi ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  const groupNames = [`Projet A ${suffix}`, `Projet B ${suffix}`];
  for (const name of groupNames) {
    await page.goto(moduleUrl);
    await page.getByRole("link", { name: "Ajouter un groupe" }).click();
    await page.getByLabel("Nom du groupe").fill(name);
    await page.getByRole("button", { name: "Créer le groupe" }).click();
    await expect(page.getByRole("button", { name: "Créer le groupe" })).toBeHidden();
  }

  // Note de groupe sur les deux groupes : un formulaire par groupe.
  await page.goto(`${moduleUrl}/assessments/new`);
  await page.getByLabel("Titre").fill(`TP projet ${suffix}`);
  for (const name of groupNames) await page.getByRole("checkbox", { name }).check();
  await page.getByLabel(/Note de groupe/).check();
  await page.getByRole("button", { name: "Enregistrer" }).click();

  for (const [i, name] of groupNames.entries()) {
    const form = page.getByRole("form", { name: `Note du groupe « ${name} »` });
    await form.getByLabel("Note (/20)", { exact: true }).fill(String(12 + i));
    await form.getByRole("button", { name: "Enregistrer la note" }).click();
    await expect(form.getByText("Note enregistrée.")).toBeVisible();
  }

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // Deux groupes notés, une seule évaluation : 1 note YNOV.
  await page.goto(`${moduleUrl}/assessments`);
  await expect(page.getByText(/1\/3 notes? requises?/)).toBeVisible();
  await expect(page.getByText(groupNames.join(", "))).toBeVisible();
});
