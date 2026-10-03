import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { localEnv } from "./env";
import { loginLight } from "./grading-setup";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("frise du module : projetée, lien étudiant·es (créé, lu sans connexion, révoqué), cadre projeté", async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000);
  const env = localEnv();
  await loginLight(page);
  const stamp = Date.now();
  const axe = (p = page) =>
    new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

  // Un module de 3 séances, un projet et ses 3 évaluations.
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Frise ${stamp}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: /Continuer/ }).click();
  await page.getByText("Ajouter ou saisir des créneaux à la main").click();
  for (const [i, d] of ["2026-12-01", "2026-12-08", "2026-12-15"].entries()) {
    await page.getByRole("button", { name: "Ajouter une ligne" }).click();
    await page.getByLabel(`Date du créneau ${i + 1}`).fill(d);
    await page.getByLabel(`Début du créneau ${i + 1}`).fill(i === 1 ? "14:00" : "09:00");
    await page.getByLabel(`Fin du créneau ${i + 1}`).fill("12:00");
  }
  await page.getByRole("button", { name: /^Créer le module/ }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();
  const moduleId = moduleUrl.split("/").pop()!;
  await page.waitForLoadState("networkidle");
  await page.goto(`${moduleUrl}/project`);
  await page.getByLabel("Titre du projet").fill(`Projet ${stamp}`);
  await page.getByRole("button", { name: "Créer le projet" }).click();
  await page.getByRole("button", { name: /Créer 3 évaluations/ }).click();
  await page.getByText("3 évaluations créées.").waitFor();

  // Rattache les évaluations aux séances ; le jalon est prêt, avec son cadre.
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
  const base = env.NEXT_PUBLIC_SUPABASE_URL;
  const courses = await (
    await page.request.get(
      `${base}/rest/v1/course?module_id=eq.${moduleId}&select=id&order=position`,
      { headers },
    )
  ).json();
  const evaluations = await (
    await page.request.get(
      `${base}/rest/v1/assessment?module_id=eq.${moduleId}&select=id,project_role`,
      { headers },
    )
  ).json();
  let milestoneId = "";
  for (const a of evaluations) {
    const index = a.project_role === "milestone" ? 1 : 2;
    const patch =
      a.project_role === "milestone"
        ? {
            course_id: courses[index].id,
            prep_status: "ready",
            objective: "Constituer et prioriser le backlog du client",
            deliverable_md: "- Un backlog priorisé (PDF ou lien)\n- Vos estimations",
          }
        : { course_id: courses[index].id, deliverable_md: "Secret : sujet encore en construction" };
    if (a.project_role === "milestone") milestoneId = a.id;
    await page.request.patch(`${base}/rest/v1/assessment?id=eq.${a.id}`, { headers, data: patch });
  }

  // La page de la frise : aperçu projeté, aperçu étudiant·e, partage.
  await page.goto(`${moduleUrl}/frise`);
  await expect(page.getByRole("heading", { name: "La frise du module" })).toBeVisible();
  await expect(page.getByRole("heading", { name: `Frise ${stamp}`, level: 2 })).toBeVisible();
  await expect(page.getByRole("list", { name: "Séances" }).first()).toBeVisible();
  await expect(page.getByText("Lancement du projet")).toBeVisible();
  expect((await axe()).violations).toEqual([]);

  // Projetée : sans menu, en grand.
  await page.getByRole("link", { name: "Projeter la frise" }).click();
  await page.waitForURL(/\/present\/modules\/.+\/frise/);
  await expect(page.getByText("Ce module en un coup d’œil").first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Menu principal" })).toHaveCount(0);

  // Le lien étudiant·es : créé, visible une fois, lisible sans connexion, noindex, sans secret.
  await page.goto(`${moduleUrl}/frise`);
  await page.getByRole("button", { name: "Créer le lien" }).click();
  const url = await page.getByLabel(/Lien à donner/).inputValue();
  expect(url).toMatch(/\/module\/[A-Za-z0-9_-]{20,}/);
  const guest = await browser.newContext({
    viewport: { width: 390, height: 800 },
    baseURL: new URL(page.url()).origin,
  });
  const visitor = await guest.newPage();
  const sharePath = new URL(url).pathname;
  await visitor.goto(sharePath);
  await expect(visitor.getByRole("heading", { name: `Frise ${stamp}`, level: 1 })).toBeVisible();
  await expect(visitor.getByText("Espace étudiant·e")).toBeVisible();
  await expect(visitor.getByText("Prochain rendu").first()).toBeVisible();
  await expect(visitor.getByRole("link", { name: "Voir mon prochain rendu" })).toBeVisible();
  await expect(visitor.getByText("Un backlog priorisé (PDF ou lien)")).toBeVisible();
  await expect(visitor.getByText("Secret")).toHaveCount(0);
  await expect(visitor.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect((await axe(visitor)).violations).toEqual([]);
  expect(
    await visitor.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(0);

  // Révoqué : le lien ne montre plus rien.
  await page.getByRole("button", { name: "Révoquer le lien" }).click();
  await expect(page.getByText("Lien révoqué.")).toBeVisible();
  await visitor.goto(sharePath);
  await expect(visitor.getByRole("heading", { name: "Lien invalide" })).toBeVisible();
  await guest.close();

  // Le cadre de l'évaluation, projeté : quand, avec qui, rendu, notation, puis la grille.
  await page.goto(`/present/modules/${moduleId}/assessments/${milestoneId}`);
  await expect(page.getByText("Ce que vous devez faire").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Constituer et prioriser le backlog du client" }),
  ).toBeVisible();
  await expect(page.getByText("Quand", { exact: true })).toBeVisible();
  await expect(page.getByText("Ce que vous rendez")).toBeVisible();
  await expect(page.getByText("Un backlog priorisé (PDF ou lien) · Vos estimations")).toBeVisible();
  await expect(page.getByText("En groupe")).toBeVisible();
});
