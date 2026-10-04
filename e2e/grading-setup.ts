import type { Page } from "@playwright/test";

/** Thème clair : le contraste de la barre latérale en thème dark est vérifié dans design.spec.ts. */
export async function loginLight(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem("theme", "light"));
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
}

/** Crée une grille à critères numériques simples (`[libellé, points]`). */
export async function createSimpleGrid(
  page: Page,
  name: string,
  criteria: [string, number][],
  reminders?: string,
) {
  await page.goto("/assessments/grids/new");
  await page.getByLabel("Nom de la grille").fill(name);
  if (reminders)
    await page.getByLabel("Rappels pédagogiques et consignes générales").fill(reminders);
  for (const [i, [label, points]] of criteria.entries()) {
    if (i > 0) await page.getByRole("button", { name: "Ajouter un critère" }).click();
    await page.getByLabel(`Libellé du critère ${i + 1}`).fill(label);
    await page.getByLabel("Points", { exact: true }).nth(i).fill(String(points));
  }
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("heading", { name }).waitFor();
}

export interface AssessmentSetup {
  moduleName: string;
  moduleUrl: string;
  /** Nom complet du premier étudiant (compatibilité), et de tous les étudiants créés. */
  studentName: string;
  studentNames: string[];
  assessmentUrl: string;
  /** Page de correction plein écran de l'évaluation. */
  correctUrl: string;
}

/**
 * Crée un·e étudiant·e, un module neuf (21 h), un groupe et une évaluation sur `gridName`, puis ouvre la
 * page de correction. `options.groupGrade` : note de groupe au lieu d'une note individuelle.
 */
export async function createAssessment(
  page: Page,
  gridName: string,
  suffix: number | string,
  options: { groupGrade?: boolean; firstNames?: string[] } = {},
): Promise<AssessmentSetup> {
  const firstNames = options.firstNames ?? ["Yanis"];
  const studentNames = firstNames.map((first) => `${first} Setup${suffix}`);
  const studentName = studentNames[0];
  for (const first of firstNames) {
    await page.goto("/students/new");
    await page.getByLabel("Prénom").fill(first);
    await page.getByLabel("Nom", { exact: true }).fill(`Setup${suffix}`);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForURL((url) => url.pathname === "/students");
  }

  const moduleName = `Module Setup ${suffix}`;
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(moduleName);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  await page.goto(`${moduleUrl}/groups/new`);
  const groupName = `Groupe Setup ${suffix}`;
  await page.getByLabel("Nom du groupe").fill(groupName);
  await page.getByRole("button", { name: "Créer le groupe" }).click();
  for (const name of studentNames) {
    await page
      .getByRole("listitem")
      .filter({ hasText: name })
      .getByRole("button", { name: /Ajouter/ })
      .click();
    await page.getByText(name).first().waitFor();
  }

  await page.goto(`${moduleUrl}/assessments/new`);
  await page.getByLabel("Titre").fill(`Évaluation ${suffix}`);
  await page.getByRole("checkbox", { name: groupName }).check();
  await page.getByLabel("Grille de correction (optionnel)").selectOption({ label: gridName });
  if (options.groupGrade) await page.getByLabel(/Note de groupe/).check();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("heading", { name: `Évaluation ${suffix}` }).waitFor();

  // La correction a sa propre page : on y arrive directement, et `assessmentUrl` y mène.
  const overviewUrl = page.url();
  await page.goto(`${overviewUrl}/correct`);
  await page.getByRole("heading", { name: /^Corriger/, level: 1 }).waitFor();
  await page.waitForLoadState("networkidle");
  return {
    moduleName,
    moduleUrl,
    studentName,
    studentNames,
    assessmentUrl: overviewUrl,
    correctUrl: `${overviewUrl}/correct`,
  };
}
