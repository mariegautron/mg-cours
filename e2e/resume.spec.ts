import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { openTab } from "./helpers";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("US-68 : la consigne de la séance précédente ouvre la séance suivante, sans rien d'autre du carnet", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  const stamp = Date.now();

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Reprise ${stamp}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();
  await page.waitForLoadState("networkidle");

  for (const title of ["Première", "Seconde"]) {
    await page.goto(`${moduleUrl}/courses/new`);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Titre de la séance").fill(`${title} ${stamp}`);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForURL(/\/courses(\/[0-9a-f-]{36})?$/);
  }
  await openTab(page, /Séances/);
  const notebookHref = (title: string) =>
    page
      .getByRole("complementary", { name: /Les 2 séances/ })
      .getByRole("link", { name: new RegExp(`${title} ${stamp}`) })
      .getAttribute("href")
      .then((h) => `${h}/notebook`);
  const first = await notebookHref("Première");
  const second = await notebookHref("Seconde");

  // Clôture de la première séance.
  await page.goto(first!.replace("/notebook", "/close"));
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Partiellement faite").check();
  await page.getByLabel("Points non traités, à reporter").fill("Estimation en points");
  await page
    .getByLabel("À faire pour la prochaine fois")
    .fill("Lire le Scrum Guide\nPréparer trois questions");
  await page.getByLabel("Retour d’expérience (privé)").fill("Trop dense, couper la partie 2");
  await page.getByRole("button", { name: "Clôturer la séance 1" }).click();
  await page.waitForURL(/\/closed$/);

  // Vue privée de la séance suivante : points reportés et retour d'expérience.
  await page.goto(second!);
  const carried = page.getByRole("region", { name: "Reprise de la séance précédente" });
  await expect(carried.getByText("Estimation en points")).toBeVisible();
  await expect(carried.getByText("Trop dense, couper la partie 2")).toBeVisible();
  await expect(carried.getByText("Lire le Scrum Guide")).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // Projection : seule la consigne « à faire pour la prochaine fois » apparaît.
  const present = second!.replace("/notebook", "").replace("/modules/", "/present/modules/");
  await page.goto(present);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Diapositives" }).click();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", { name: "Pour aujourd’hui, vous deviez…" })).toBeVisible();
  await expect(page.getByText("Lire le Scrum Guide")).toBeVisible();
  await expect(page.getByText("Préparer trois questions")).toBeVisible();
  const html = await page.content();
  for (const secret of ["Estimation en points", "Trop dense", "Partiellement"]) {
    expect(html).not.toContain(secret);
  }

  // Première séance : aucune diapositive de reprise.
  await page.goto(first!.replace("/notebook", "").replace("/modules/", "/present/modules/"));
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Pour aujourd’hui, vous deviez…")).toHaveCount(0);

  // Duplication : le retour d'expérience est à relire, sans être copié.
  await page.goto(moduleUrl);
  await openTab(page, "Administratif");
  await expect(
    page.getByRole("heading", { name: "Retour d’expérience de cette année" }),
  ).toBeVisible();
  await expect(page.getByText("Trop dense, couper la partie 2").first()).toBeVisible();
});
