import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { createAssessment, createSimpleGrid, loginLight } from "./grading-setup";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
for (const groupGrade of [false, true]) {
  test(`commentaire structuré (${groupGrade ? "note de groupe" : "note individuelle"}) : critère, points forts, progrès, libre`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await loginLight(page);
    const suffix = `${Date.now()}${groupGrade ? "g" : "i"}`;
    const gridName = `Grille Bilan ${suffix}`;
    await createSimpleGrid(page, gridName, [
      ["Structure", 4],
      ["Contenu", 6],
    ]);
    const setup = await createAssessment(page, gridName, suffix, { groupGrade });

    await page.getByLabel("Structure (/4)").fill("3");
    await page.getByLabel("Contenu (/6)").fill("5");
    await page
      .getByLabel("Commentaire — Structure", { exact: true })
      .fill("Le header est bien posé.");
    await page.getByLabel("Commentaire — Contenu", { exact: true }).fill("Manque un exemple.");
    await page.getByLabel("Points forts", { exact: true }).fill("Code propre et lisible.");
    await page.getByLabel("Progrès", { exact: true }).fill("Tester davantage.");
    await page.getByLabel("Commentaire libre", { exact: true }).fill("Continuez ainsi.");

    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(axe.violations).toEqual([]);

    await page.getByRole("button", { name: "Enregistrer la note" }).click();
    await expect(page.getByText("Note enregistrée.")).toBeVisible();

    // Rechargement : chaque zone est restituée.
    await page.goto(setup.assessmentUrl);
    await expect(page.getByLabel("Commentaire — Structure", { exact: true })).toHaveValue(
      "Le header est bien posé.",
    );
    await expect(page.getByLabel("Commentaire — Contenu", { exact: true })).toHaveValue(
      "Manque un exemple.",
    );
    await expect(page.getByLabel("Points forts", { exact: true })).toHaveValue(
      "Code propre et lisible.",
    );
    await expect(page.getByLabel("Progrès", { exact: true })).toHaveValue("Tester davantage.");
    await expect(page.getByLabel("Commentaire libre", { exact: true })).toHaveValue(
      "Continuez ainsi.",
    );

    // Le PDF de résultats se génère pour cette note (une fiche pour tout le groupe, ou pour l'étudiant·e).
    const path = new URL(page.url()).pathname.replace("/modules/", "/api/modules/");
    const res = await page.request.get(`${path}/results`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("pdf");
  });
}
