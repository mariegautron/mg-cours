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
}

const axe = (page: import("@playwright/test").Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

test("carnet de séance : observation en direct, clôture, journal de la fiche étudiant·e", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await login(page);
  const suffix = Date.now();
  const student = `Zoé Carnet${suffix}`;

  await page.goto("/students/new");
  await page.getByLabel("Prénom").fill("Zoé");
  await page.getByLabel("Nom", { exact: true }).fill(`Carnet${suffix}`);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: student })).toBeVisible();

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Carnet ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  await openTab(page, /Groupes/);
  await page.getByRole("link", { name: "Ajouter un groupe" }).click();
  await page.getByLabel("Nom du groupe").fill(`Groupe Carnet ${suffix}`);
  await page.getByRole("button", { name: "Créer le groupe" }).click();
  await page
    .getByRole("listitem")
    .filter({ hasText: student })
    .getByRole("button", { name: /Ajouter/ })
    .click();
  await expect(page.getByText("Membres (1)")).toBeVisible();

  await page.goto(moduleUrl);
  await openTab(page, /Séances/);
  await page.getByRole("link", { name: "Ajouter une séance" }).click();
  await page.getByLabel("Titre de la séance").fill(`Séance carnet ${suffix}`);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await openTab(page, /Séances/);
  await page.getByRole("link", { name: `Carnet de séance : Séance carnet ${suffix}` }).click();
  await expect(
    page.getByRole("heading", { name: `Carnet — Séance carnet ${suffix}` }),
  ).toBeVisible();

  // Carnet utilisé debout, au téléphone : chaque action fait au moins 44 px de haut.
  for (const target of [
    page.getByRole("link", { name: /Ouvrir la présentation/ }),
    page.getByRole("button", { name: "Enregistrer la clôture" }),
  ]) {
    expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }

  // Observation : filtre par nom, un appui ouvre le formulaire, un appui sur l'étiquette enregistre.
  await page.getByLabel("Filtrer par nom").fill("zoe carnet");
  await page.getByRole("button", { name: `${student} : ajouter une observation` }).click();
  await page.getByLabel("Note (facultatif)").fill("Très bonne question sur le backlog");
  expect((await axe(page)).violations).toEqual([]);
  await page.getByRole("button", { name: "Question pertinente" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Observation ajoutée" })).toHaveText(
    `Observation ajoutée pour ${student} — Question pertinente.`,
  );
  await expect(page.getByText("Notées pendant cette séance (1)")).toBeVisible();

  // US-135 : au clavier. Début du nom, Entrée ouvre, 2 choisit l'étiquette (hors du champ), Entrée
  // enregistre, et le focus revient à la liste.
  const filter = page.getByLabel("Filtrer par nom");
  await filter.fill("zoe");
  await filter.press("Enter");
  const note = page.getByLabel("Note (facultatif)");
  await expect(note).toBeFocused();
  await note.fill("Revoir l’estimation");
  await note.press("Alt+2");
  await note.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "Observation ajoutée" })).toHaveText(
    `Observation ajoutée pour ${student} — Participation.`,
  );
  await expect(
    page.getByRole("button", { name: `${student} : ajouter une observation` }),
  ).toBeFocused();
  await page.getByRole("button", { name: `${student} : ajouter une observation` }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Note (facultatif)")).toHaveCount(0);
  await expect(page.getByText("Notées pendant cette séance (2)")).toBeVisible();
  await expect(page.getByText("Très bonne question sur le backlog")).toBeVisible();

  // Clôture.
  await page.getByLabel("Partiellement faite").check();
  await page.getByLabel("Points non traités, à reporter").fill("Estimation en points");
  await page.getByLabel("À faire pour la prochaine fois").fill("Lire le Scrum Guide");
  await page.getByLabel("Retour d’expérience (privé)").fill("Trop dense, couper la partie 2");
  await page.getByRole("button", { name: "Enregistrer la clôture" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Clôture enregistrée." })).toBeVisible();
  expect((await axe(page)).violations).toEqual([]);

  // Badge de statut sur la liste des séances.
  await page.goto(moduleUrl);
  await openTab(page, /Séances/);
  await expect(page.getByText("Partiellement faite", { exact: true })).toBeVisible();

  // Rien du carnet dans la présentation.
  await page.goto(moduleUrl);
  await openTab(page, /Séances/);
  const present = await page
    .getByRole("link", { name: `Faire cours : Séance carnet ${suffix}` })
    .getAttribute("href");
  const html = await (await page.request.get(present!)).text();
  for (const secret of [
    "Très bonne question",
    "Estimation en points",
    "Scrum Guide",
    "Trop dense",
  ]) {
    expect(html).not.toContain(secret);
  }

  // Journal sur la fiche étudiant·e.
  await page.goto("/students");
  await page.getByLabel("Recherche").fill(`Carnet${suffix}`);
  await page.getByRole("link", { name: student }).click();
  await expect(page.getByRole("heading", { name: student, level: 1 })).toBeVisible();
  const journal = page.getByRole("region", { name: "Journal d’observations" });
  await expect(
    journal.getByText(`Module Carnet ${suffix} · Séance carnet ${suffix}`).first(),
  ).toBeVisible();
  await expect(journal.getByText("Question pertinente")).toBeVisible();
  await expect(journal.getByText("Très bonne question sur le backlog")).toBeVisible();
  expect((await axe(page)).violations).toEqual([]);
});
