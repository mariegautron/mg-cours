import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Partir d'un projet existant : le cadre est repris, jamais les notes ni les groupes.
test("partir d'un projet existant : brief et évaluations repris, contexte client vidé", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  const suffix = Date.now();
  async function newModule(name: string) {
    await page.goto("/modules/new");
    await page.getByLabel("Nom du module").fill(name);
    await page.getByLabel("Année").fill("2026");
    await page.getByLabel("Nombre d’heures total").fill("21");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
    return page.url();
  }
  const first = await newModule(`Source ${suffix}`);
  await page.goto(`${first}/project`);
  await page.getByLabel("Titre du projet").fill(`SantaConnect ${suffix}`);
  await page.getByRole("button", { name: /Page blanche/ }).click();
  await page.getByLabel("Titre de la section 1").fill("Phases du projet");
  await page.getByLabel("Texte de la section 1").fill("1. Cadrage\n2. Réalisation");
  await page.getByLabel("Contexte client (Markdown)").fill("Client fictif SantaConnect");
  await page.getByRole("button", { name: "Créer le projet" }).click();
  await expect(page.getByLabel(/^Titre de l’évaluation \d$/)).toHaveCount(3);
  await page.getByRole("button", { name: "Créer 3 évaluations" }).click();
  await expect(page.getByText(/Évaluations du projet \(3\)/)).toBeVisible();

  const second = await newModule(`Reprise ${suffix}`);
  await page.goto(`${second}/project`);
  await page.getByText("Partir d’un projet existant").click();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  const option = page.locator("#sourceProjectId option", { hasText: `SantaConnect ${suffix}` });
  await page
    .getByLabel("Projet à reprendre")
    .selectOption({ value: (await option.getAttribute("value"))! });
  await page.getByRole("button", { name: "Créer le projet à partir de celui-ci" }).click();
  await expect(page.getByText(/Évaluations du projet \(3\)/)).toBeVisible();
  await expect(page.getByLabel("Titre du projet")).toHaveValue(`SantaConnect ${suffix}`);
  await expect(page.getByLabel("Titre de la section 1")).toHaveValue("Phases du projet");
  await expect(page.getByLabel("Contexte client (Markdown)")).toHaveValue("");
});
