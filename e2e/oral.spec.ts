import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { createSimpleGrid, loginLight } from "./grading-setup";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
const axe = (page: import("@playwright/test").Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

test("oral : ordre de passage, chronomètre, grille sur le groupe qui passe, groupe suivant", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await loginLight(page);
  const suffix = Date.now();
  const gridName = `Grille Oral ${suffix}`;
  await createSimpleGrid(page, gridName, [["Structure", 4]]);

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Oral ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  const names = ["Alpha", "Beta", "Gamma"].map((n) => `${n} ${suffix}`);
  for (const name of names) {
    await page.goto(`${moduleUrl}/groups/new`);
    await page.getByLabel("Nom du groupe").fill(name);
    await page.getByRole("button", { name: "Créer le groupe" }).click();
    await page.getByText(name).first().waitFor();
  }

  await page.goto(`${moduleUrl}/assessments/new`);
  await page.getByLabel("Titre", { exact: true }).fill("Oral de fin de projet");
  await page.getByLabel("Type", { exact: true }).fill("oral");
  await page.getByLabel("Durée (minutes)").fill("10");
  for (const name of names) await page.getByRole("checkbox", { name }).check();
  await page.getByLabel("Grille de correction (optionnel)").selectOption({ label: gridName });
  await page.getByLabel(/Note de groupe/).check();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("heading", { name: "Oral de fin de projet" }).waitFor();

  await page.getByRole("link", { name: "Faire passer l’oral" }).click();
  await expect(page.getByRole("heading", { name: /Faire passer l’oral/ })).toBeVisible();

  // Ordre : Gamma est volontaire (rang 1), les autres sont tirés.
  await page.getByLabel(`Rang de ${names[2]}`).fill("1");
  await page.getByRole("button", { name: "Établir l’ordre de passage" }).click();
  await expect(page.getByText(/Ordre établi pour 3 groupes \(graine/)).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: `1. ${names[2]}` })).toContainText(
    "volontaire",
  );

  await page.getByLabel("Heure de début").fill("09:00");
  await page.getByRole("button", { name: "Enregistrer les horaires" }).click();
  await expect(page.getByText("Horaires enregistrés.")).toBeVisible();
  await expect(page.getByText("09:00–09:10 · 10 min")).toBeVisible();

  // Durée propre au premier créneau.
  await page.getByLabel(`Durée de ${names[2]} (min)`).fill("5");
  await page.getByLabel(`Durée de ${names[2]} (min)`).blur();
  await expect(page.getByText("09:00–09:05 · 5 min")).toBeVisible();
  await page.getByLabel(`Durée de ${names[2]} (min)`).fill("10");
  await page.getByLabel(`Durée de ${names[2]} (min)`).blur();
  await expect(page.getByText("09:00–09:10 · 10 min")).toBeVisible();

  // Passage 1 : le groupe volontaire, seule sa grille est visible.
  await expect(page.getByRole("heading", { name: `Passage 1 sur 3 — ${names[2]}` })).toBeVisible();
  await expect(page.getByRole("timer")).toHaveText("10:00");
  await expect(page.getByRole("form", { name: `Note du groupe « ${names[2]} »` })).toBeVisible();
  await expect(page.getByRole("form", { name: `Note du groupe « ${names[0]} »` })).toBeHidden();
  expect((await axe(page)).violations).toEqual([]);

  // Chronomètre : annonce et alerte à 1 minute (horloge simulée).
  await page.clock.install();
  await page.reload();
  await page.getByRole("button", { name: "Démarrer" }).click();
  await expect(page.getByText("Chronomètre lancé : 10 minutes.")).toBeAttached();
  await page.clock.fastForward(9 * 60_000 + 5_000);
  await expect(page.getByRole("alert").filter({ hasText: "Il reste une minute." })).toBeAttached();
  await expect(page.getByText("Dernière minute.")).toBeVisible();
  expect((await axe(page)).violations).toEqual([]);
  await page.clock.fastForward(60_000);
  await expect(page.getByText("Temps écoulé.").first()).toBeVisible();

  // Saisie sur le premier groupe, sans attendre l'enregistrement, puis groupe suivant.
  await page
    .getByRole("form", { name: `Note du groupe « ${names[2]} »` })
    .getByLabel("Structure (/4)")
    .fill("3");
  await page.getByRole("button", { name: "Groupe suivant" }).click();
  await expect(page.getByRole("heading", { name: /^Passage 2 sur 3/ })).toBeVisible();
  await expect(page.getByRole("timer")).toHaveText("10:00");
  await expect(page.getByRole("form", { name: `Note du groupe « ${names[2]} »` })).toBeHidden();

  // La note du groupe précédent n'est pas perdue.
  await page.getByRole("button", { name: "Groupe précédent" }).click();
  await expect(
    page.getByRole("form", { name: `Note du groupe « ${names[2]} »` }).getByLabel("Structure (/4)"),
  ).toHaveValue("3");
  await expect(page.getByText("Tout est enregistré")).toBeVisible({ timeout: 10_000 });

  // Refaire l'ordre : confirmation obligatoire.
  // Le bloc se replie dès qu'un groupe est passé : on le rouvre.
  await page.getByText("Ordre de passage et créneaux").click();
  await page.getByText("Refaire l’ordre de passage").click();
  await page.getByRole("button", { name: "Refaire l’ordre", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toContainText("seront remplacés");
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await page.getByRole("button", { name: "Refaire l’ordre", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Refaire l’ordre" }).click();
  await expect(page.getByText(/Ordre établi pour 3 groupes/)).toBeVisible();
});
