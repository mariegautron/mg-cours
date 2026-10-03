import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { createAssessment, createSimpleGrid, loginLight } from "./grading-setup";

// US-147 : résultats publiés par lien personnel, page publique sans connexion, suivi, révocation.
test("publier les résultats : lien personnel, rien des autres, suivi, révocation", async ({
  page,
  context,
  browser,
  baseURL,
}) => {
  test.setTimeout(150_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await loginLight(page);
  const suffix = Date.now();
  const gridName = `Grille Liens ${suffix}`;
  await createSimpleGrid(page, gridName, [["Structure", 4]]);
  const setup = await createAssessment(page, gridName, suffix, { firstNames: ["Ana", "Zoé"] });
  const [ana, zoe] = setup.studentNames;

  for (const [name, points] of [
    [ana, "3"],
    [zoe, "2"],
  ] as const) {
    const form = page.getByRole("form", { name });
    await form.getByLabel("Structure (/4)").fill(points);
    await form
      .getByLabel("Commentaire — Structure", { exact: true })
      .fill(`Mot pour ${name.split(" ")[0]}`);
    await form.getByRole("button", { name: "Enregistrer la note" }).click();
    await expect(form.getByText("Note enregistrée.")).toBeVisible();
  }
  await page.waitForLoadState("networkidle");
  await page.reload();

  await page.getByRole("button", { name: "Publier les résultats" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Publier", exact: true }).click();
  await expect(page.getByText("Copie ces liens maintenant")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Tout copier" }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const links = Object.fromEntries(
    copied.split("\n").map((l) => {
      const [name, ...rest] = l.split(" : ");
      return [name, new URL(rest.join(" : ")).pathname];
    }),
  );
  expect(Object.keys(links)).toHaveLength(2);
  expect(links[ana]).toMatch(/^\/resultats\/[A-Za-z0-9_-]{43}$/);

  // Page publique : autre contexte, sans connexion ni cookie.
  const anon = await browser.newContext({ baseURL });
  const pub = await anon.newPage();
  await pub.goto(links[ana]);
  await expect(
    pub.getByRole("heading", { name: new RegExp(`Évaluation ${suffix}`), level: 1 }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(pub.getByText(ana)).toBeVisible();
  await expect(pub.getByText("3 / 4").first()).toBeVisible();
  await expect(pub.getByText(`Mot pour ${ana.split(" ")[0]}`)).toBeVisible();
  // Rien de l'autre étudiant·e, aucune navigation vers l'appli.
  const html = await pub.content();
  expect(html).not.toContain(zoe);
  expect(html).not.toContain(`Mot pour ${zoe.split(" ")[0]}`);
  await expect(pub.getByRole("navigation")).toHaveCount(0);
  expect(await pub.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");
  const axe = await new AxeBuilder({ page: pub })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // PDF personnel.
  const [download] = await Promise.all([
    pub.waitForEvent("download"),
    pub.getByRole("link", { name: "Télécharger mon PDF" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("mes-resultats.pdf");

  // Jeton inconnu : message neutre.
  await pub.goto("/resultats/" + "A".repeat(43));
  await expect(pub.getByRole("heading", { name: "Lien invalide ou expiré" })).toBeVisible();

  // Suivi côté Marie : consulté pour Ana, pas pour Zoé.
  await page.reload();
  const row = (name: string) =>
    page
      .getByRole("listitem")
      .filter({ hasText: name })
      .filter({ hasText: /Publié|Pas publié/ });
  await expect(row(ana)).toContainText(/Consulté le/);
  await expect(row(zoe)).toContainText("Pas encore consulté");

  // Révocation : le lien n'affiche plus rien.
  await row(ana)
    .getByRole("button", { name: /Révoquer/ })
    .click();
  await expect(page.getByText(`Lien de ${ana} révoqué.`)).toBeVisible();
  await pub.goto(links[ana]);
  await expect(pub.getByRole("heading", { name: "Lien invalide ou expiré" })).toBeVisible();
  await anon.close();
});
