import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser } from "@playwright/test";

import { localEnv } from "./env";
import { createAssessment, createSimpleGrid, loginLight } from "./grading-setup";
import { createAndPublishQuiz, importBank, prepareLinks } from "./quiz-setup";

// Nécessite Supabase local. Parcours critique et public : QR de classe, choix du nom, nom pris, libération.
let ip = 150;
async function studentPage(browser: Browser) {
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-real-ip": `10.30.${++ip}.${Math.floor(Math.random() * 200) + 1}` },
    baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}`,
  });
  return { context, page: await context.newPage() };
}

test("QR de classe : choix du nom, nom pris disparu, libération, accès fermé à l'anonyme", async ({
  page,
  browser,
}) => {
  test.setTimeout(420_000);
  await loginLight(page);
  const suffix = Date.now();
  await importBank(page, suffix);
  await createSimpleGrid(page, `Grille QR ${suffix}`, [["Structure", 4]]);
  const setup = await createAssessment(page, `Grille QR ${suffix}`, suffix, {
    firstNames: ["Ana", "Zoé"],
  });
  const [ana, zoe] = setup.studentNames;
  await createAndPublishQuiz(page, setup.assessmentUrl, suffix);
  await prepareLinks(page);

  await page.goto(`${setup.assessmentUrl}/quiz/links`);
  await page.getByRole("button", { name: "Créer le QR code" }).click();
  const link = page.getByRole("link", { name: /\/q\/classe\// });
  await expect(link).toBeVisible();
  const classPath = new URL((await link.getAttribute("href"))!).pathname;
  await expect(page.getByRole("img", { name: /QR code/ })).toBeVisible();

  // Étudiant·e 1 : voit les deux noms, choisit le sien.
  const s1 = await studentPage(browser);
  await s1.page.goto(classPath);
  if (process.env.CAPTURE) {
    await s1.page.setViewportSize({ width: 1280, height: 800 });
    await s1.page.screenshot({ path: "docs/captures/qcm-choisir.png" });
  }
  await expect(s1.page.getByRole("button", { name: ana })).toBeVisible();
  await expect(s1.page.getByRole("button", { name: zoe })).toBeVisible();
  const axe = await new AxeBuilder({ page: s1.page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await s1.page.getByRole("button", { name: ana }).click();
  await s1.page.waitForURL(/\/q\/[A-Za-z0-9_-]{43}$/);
  await expect(s1.page.getByRole("heading", { level: 1 })).toBeVisible();

  // Étudiant·e 2 : le nom pris n'est plus proposé.
  const s2 = await studentPage(browser);
  await s2.page.goto(classPath);
  await expect(s2.page.getByRole("button", { name: zoe })).toBeVisible();
  await expect(s2.page.getByRole("button", { name: ana })).toHaveCount(0);

  // Marie libère le nom : il revient.
  await page.goto(`${setup.assessmentUrl}/quiz/links`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: `Libérer le nom ${ana}` })).toBeVisible();
  // Écran projeté : plein écran, sans menu, aucun nom d'étudiant·e.
  const projected = await page.context().newPage();
  await projected.goto(`${setup.assessmentUrl.replace("/modules/", "/present/modules/")}/quiz`);
  await expect(
    projected.getByRole("heading", { name: "Scannez pour passer le QCM" }),
  ).toBeVisible();
  await expect(projected.getByRole("navigation")).toHaveCount(0);
  expect(await projected.content()).not.toContain(ana);
  await expect(projected.getByRole("status")).toContainText("1 personne");
  if (process.env.CAPTURE) {
    await projected.setViewportSize({ width: 1280, height: 720 });
    await projected.screenshot({ path: "docs/captures/qcm-qr-projete.png" });
  }
  await projected.close();
  await page.getByRole("button", { name: `Libérer le nom ${ana}` }).click();
  await expect(page.getByRole("button", { name: `Libérer le nom ${ana}` })).toHaveCount(0);
  await s2.page.reload();
  await expect(s2.page.getByRole("button", { name: ana })).toBeVisible();

  // Lien invalide : message neutre, aucun nom.
  await s2.page.goto("/q/classe/" + "a".repeat(43));
  await expect(s2.page.getByRole("heading", { name: "Ce lien ne fonctionne pas" })).toBeVisible();

  // L'anonyme ne lit aucune table (REST direct).
  const env = localEnv();
  for (const table of ["quiz_class_link", "quiz_claim"]) {
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
    });
    const body = await res.json().catch(() => null);
    expect(
      res.status === 401 || res.status === 403 || (Array.isArray(body) && body.length === 0),
    ).toBe(true);
    expect(Array.isArray(body) && body.length > 0).toBe(false);
  }
  await s1.context.close();
  await s2.context.close();
});
