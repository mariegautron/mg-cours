import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

// Parcours « premier module » de bout en bout : fiche école + export Hyperplanning → attendus →
// séances → rapprochement → construire une séance → progression → fil rouge → évaluation →
// groupes → première séance. À chaque pas, on suit la « Prochaine étape » proposée par l'appli.
// Un seul spec, long : il sert aussi de filet pour « supprimer puis recréer ».
async function pdf(lines: string[], size: [number, number] = [595, 842]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage(size);
  lines.forEach((l, i) => page.drawText(l, { x: 40, y: size[1] - 50 - i * 20, size: 11, font }));
  return Buffer.from(await doc.save());
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
}

async function axeClean(page: Page, where: string) {
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(r.violations, `axe : ${where}`).toEqual([]);
}

/** La « Prochaine étape » de la fiche module : le lien proposé doit exister et mener quelque part. */
async function followNext(page: Page, moduleUrl: string, label: RegExp) {
  await page.goto(moduleUrl);
  const link = page.getByRole("link", { name: label }).first();
  await expect(link, `Prochaine étape attendue : ${label}`).toBeVisible({ timeout: 20_000 });
  await link.click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
}

function moduleFiche(stamp: number) {
  return [
    "FICHE PEDAGOGIQUE",
    "YNOV Campus Nantes",
    `Intitule du module : Methodologies Agile ${stamp}`,
    `Code module : A2627_${String(stamp).slice(-5)}`,
    "Mastere 1",
    "Volume horaire total : 21 h",
    "FFP : 12 h",
    "TDP : 9 h",
    "Objectifs pedagogiques",
    "- Cadrer un projet agile",
    "- Estimer et planifier un sprint",
    "- Animer une retrospective",
    "Unites pedagogiques",
    "1 FFP 3h Cadrage de projet",
    "2 TDP 3h Estimation et planification",
  ];
}

test("premier module : de la fiche de l'école à la première séance", async ({ page }) => {
  test.setTimeout(240_000);
  await login(page);
  const stamp = Date.now();
  const moduleName = `Methodologies Agile ${stamp}`;

  // Deux ressources déjà en bibliothèque, pour le rapprochement.
  for (const [title, kind] of [
    [`Cadrer un projet agile – atelier ${stamp}`, "course"],
    [`Estimer et planifier un sprint – TP ${stamp}`, "workshop"],
  ] as const) {
    await page.goto("/resources/new");
    await page.getByLabel("Titre").fill(title);
    await page.getByLabel("Type").selectOption(kind);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  }

  // 1. Créer le module depuis la fiche de l'école + l'export Hyperplanning.
  await page.goto("/modules/new");
  await page.waitForLoadState("networkidle");
  await page.getByLabel(/Fiche pédagogique \(PDF/).setInputFiles({
    name: "fiche.pdf",
    mimeType: "application/pdf",
    buffer: await pdf(moduleFiche(stamp)),
  });
  await expect(page.getByText("Lue", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("Nom du module")).toHaveValue(moduleName);
  await page.getByLabel(/Export Hyperplanning \(PDF/).setInputFiles({
    name: "services.pdf",
    mimeType: "application/pdf",
    buffer: await pdf([
      "NANTES YNOV CAMPUS",
      moduleName,
      "Nantes | DEVFLSTK MAST1 21h00",
      "3h00 lun. 12/10/2026 08h00",
      "3h00 lun. 12/10/2026 13h00",
      "3h00 lun. 02/11/2026 08h00",
      "3h00 lun. 02/11/2026 13h00",
      "3h00 mar. 03/11/2026 08h00",
      "3h00 mar. 03/11/2026 13h00",
      "3h00 mer. 04/11/2026 08h00",
    ]),
  });
  await axeClean(page, "création du module");
  await page.getByRole("button", { name: /Continuer/ }).click();
  await expect(page.getByRole("heading", { name: "Planning et dates" })).toBeVisible();
  await page.getByRole("button", { name: /^Créer le module/ }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}(\?.*)?$/, { timeout: 60_000 });
  const moduleUrl = page.url().split("?")[0];
  await expect(page.getByRole("heading", { name: moduleName, level: 1 })).toBeVisible();
  await axeClean(page, "fiche du module");

  // 2. Attendus lus, puis rapprochement : la « Prochaine étape » doit l'annoncer.
  await followNext(page, moduleUrl, /Rapprocher mes ressources/);
  await expect(page).toHaveURL(/\/matching/);
  await axeClean(page, "rapprochement");

  // 3. Rapprocher : associer les ressources trouvées, créer ce qui manque.
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("status").filter({ hasText: /couvert/ })).toBeVisible();
  // Comme Marie : on prend les attendus « sans ressource » un par un, on associe ou on crée.
  const summary = page.getByRole("status").filter({ hasText: /couvert/ });
  for (let i = 0; i < 6 && (await summary.innerText()).includes("sans ressource"); i++) {
    await page.getByText(/^Sans ressource · \d+/).click();
    await page.waitForTimeout(1500);
    const first = page.getByRole("link", { name: /Rien$/ }).first();
    const label = (await first.innerText()).replace(/\s*Rien\s*$/, "").trim();
    await first.click();
    await expect(page.getByRole("heading", { name: label, exact: true }).first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    const before = await summary.innerText();
    const associate = page
      .getByRole("button", { name: /^Associer .* à cet attendu$/ })
      .filter({ visible: true });
    if ((await associate.count()) > 0) await associate.first().click();
    else {
      await page
        .getByRole("button", { name: "Créer et retenir" })
        .filter({ visible: true })
        .click();
    }
    await expect(summary).not.toHaveText(before, { timeout: 30_000 });
  }
  const coverage = page.getByRole("status").filter({ hasText: /couvert/ });
  await expect(coverage).toContainText("à construire", { timeout: 20_000 });
  await expect(coverage).not.toContainText("sans ressource", { timeout: 20_000 });

  // 4. Construire les séances : la prochaine étape mène aux séances de ce module.
  await followNext(page, moduleUrl, /Préparer mes séances|Créer les séances/);
  await expect(page).toHaveURL(/\/courses/);
  await axeClean(page, "séances");

  // 5. Construire une séance : le déroulé, le livrable, « prête ».
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Séance 1", level: 1 })).toBeVisible();
  // Le déroulé se construit sur place : on ajoute deux ressources retenues, sans quitter la page.
  await page.getByText("Ajouter une ressource retenue", { exact: true }).click();
  const addButtons = page.getByRole("button", { name: /^Ajouter au déroulé/ });
  await addButtons.first().click();
  await expect(page.getByRole("list").filter({ hasText: "Retirer" }).first()).toBeVisible({
    timeout: 20_000,
  });
  await addButtons.first().click();
  await expect(page.getByText(/est ajoutée à la fin du déroulé/)).toBeAttached();
  // Déroulé structuré : durée, type, objectif ; le total se compare à la durée de la séance (3 h).
  await page
    .getByText(/^Détails de l’activité/)
    .first()
    .click();
  await page.getByLabel("Durée estimée (min)").first().fill("45");
  await page.getByLabel("Type", { exact: true }).first().selectOption("atelier");
  await page.getByLabel("Objectif pédagogique").first().selectOption("Analyser");
  await expect(page.getByText(/Déroulé : 45 min sur 3 h de séance, il reste 2 h 15/)).toBeVisible();
  await expect(page.getByText(/08:00 · 45 min · Atelier · Analyser/)).toBeVisible();
  await page.getByLabel("Statut de préparation").getByText("Prête").click();
  await expect(page.getByText(/1 sur 7 prêtes/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Enregistré à/)).toBeVisible({ timeout: 20_000 });
  await page.reload();
  await page
    .getByText(/^Détails de l’activité/)
    .first()
    .click();
  await expect(page.getByLabel("Durée estimée (min)").first()).toHaveValue("45");
  await axeClean(page, "séance (déroulé)");

  // La séance prête change la « Prochaine étape » : on passe aux évaluations et au fil rouge.
  await followNext(page, moduleUrl, /Prévoir mes évaluations/);
  await expect(page).toHaveURL(/\/assessments/);
  // 6. Fil rouge : le brief du projet, puis une évaluation, avant même que les étudiant·es soient là.
  await page.getByRole("link", { name: "Créer le projet" }).first().click();
  await page.waitForURL(/\/project$/);
  await page.getByLabel(/Titre du projet/).fill(`Projet fil rouge ${stamp}`);
  await page.getByRole("button", { name: "Créer le projet" }).click();
  await expect(
    page
      .getByRole("status")
      .or(page.getByRole("heading", { level: 1 }))
      .first(),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await axeClean(page, "projet fil rouge");

  await page.goto(`${moduleUrl}/assessments/new`);
  await page.getByLabel("Titre", { exact: true }).fill(`Rendu final ${stamp}`);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/assessments\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  const evalUrl = page.url();
  await expect(page.getByRole("heading", { name: `Rendu final ${stamp}`, level: 1 })).toBeVisible();
  // Attendus évalués : on coche deux attendus du module, le compte suit.
  await page.getByLabel("Cadrer un projet agile", { exact: true }).check();
  await page.getByLabel("Estimer et planifier un sprint", { exact: true }).check();
  await page.getByRole("button", { name: "Enregistrer les attendus" }).click();
  await expect(page.getByText("2 sur 5").first()).toBeVisible({ timeout: 20_000 });
  await axeClean(page, "évaluation sans groupe");
  // Une évaluation du module compte pour l'étape « Prévoir les évaluations », même hors séance.
  await page.goto(`${moduleUrl}/assessments`);
  await expect(page.getByText("2 sur 5").first()).toBeVisible();
  await page.goto(moduleUrl);
  await expect(page.getByText("1 / 3 notes prévues").first()).toBeVisible();
  await page.goto(evalUrl);

  // 7. Les étudiant·es arrivent (liste importée dans le module) : les groupes rejoignent l'évaluation.
  await page.goto("/students/import");
  await page
    .getByLabel("Module", { exact: true })
    .selectOption({ label: `${moduleName} (2026-2027)` });
  await page.getByLabel("un groupe du module (créé s’il n’existe pas)").check();
  const csv =
    "Nom,Prénom,Email,Groupe\n" +
    [1, 2, 3, 4]
      .map((n) => `Nom${n}${stamp},Prenom${n},p${n}.${stamp}@ynov.com,TP${n % 2 ? 1 : 2}`)
      .join("\n") +
    "\n";
  await page.setInputFiles("#file", {
    name: "etudiants.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv, "utf-8"),
  });
  await expect(page.getByText("4 à importer")).toBeVisible();
  await page.getByRole("button", { name: /Confirmer l’import \(4\)/ }).click();
  await expect(page.getByText(/appartenances aux groupes/)).toBeVisible({ timeout: 30_000 });
  await page.goto(evalUrl);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/TP1/).first()).toBeVisible();
  await axeClean(page, "évaluation avec groupes");

  // 8. Progression pédagogique : générer, voir le PDF, la marquer envoyée.
  await page.goto(moduleUrl);
  await page.getByRole("link", { name: /Passer à la progression/ }).click();
  await expect(page).toHaveURL(/\/outline/);
  await page.getByRole("button", { name: "Générer la progression" }).click();
  await expect(page.getByText(/Générée le/)).toBeVisible({ timeout: 30_000 });
  const moduleId = moduleUrl.split("/").pop()!;
  const pdfRes = await page.request.get(`/api/modules/${moduleId}/outline`);
  expect(pdfRes.status()).toBe(200);
  expect((await pdfRes.body()).subarray(0, 4).toString()).toBe("%PDF");
  await axeClean(page, "progression");
  await page.getByRole("button", { name: /J’ai envoyé la progression à l’école/ }).click();
  await page.getByRole("button", { name: "Oui, je l’ai envoyée" }).click();
  await expect(page.getByText(/envoyée le/)).toBeVisible({ timeout: 20_000 });

  // 9. Faire cours : « Avant de commencer » puis la fenêtre projetée.
  await page.goto(`${moduleUrl}/courses`);
  await page.waitForLoadState("networkidle");
  const startLink = page.getByRole("link", { name: /^Faire cours/ }).first();
  await expect(startLink).toBeVisible();
  await startLink.click();
  await page.waitForURL(/\/start$/, { timeout: 30_000 });
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Avant de commencer", level: 1 })).toBeVisible();
  await axeClean(page, "avant de commencer");
  const startUrl = page.url();
  const projected = await page
    .getByRole("link", { name: /Ouvrir la fenêtre projetée/ })
    .getAttribute("href");
  const privateView = await page
    .getByRole("link", { name: /Ouvrir ma vue privée/ })
    .getAttribute("href");

  // La fenêtre projetée ne montre jamais la vue privée, et la vue privée s'ouvre.
  await page.goto(projected!);
  await expect(page.getByRole("heading", { name: /Séance 1/ }).first()).toBeVisible();
  await expect(page.getByText("Vue privée : jamais projetée")).toHaveCount(0);
  await axeClean(page, "fenêtre projetée");
  await page.goto(privateView!);
  await expect(page.getByText("Vue privée : jamais projetée")).toBeVisible();
  await axeClean(page, "vue privée");

  // Clôturer la séance : le carnet se ferme, la suite est annoncée.
  await page.goto(startUrl.replace(/\/start$/, "/close"));
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: /Clôturer la séance 1/ }).click();
  await page.waitForURL(/\/closed$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /Séance 1 clôturée/ })).toBeVisible();

  // 10. Supprimer le module puis le recréer sous le même nom : rien ne reste, rien ne gêne.
  await page.goto(`${moduleUrl}/documents`);
  await page.getByRole("button", { name: "Supprimer le module" }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByLabel(/retape le nom/).fill(moduleName);
  await dialog.getByRole("button", { name: "Supprimer définitivement" }).click();
  await page.waitForURL(/\/modules\?deleted=/, { timeout: 60_000 });
  await expect(page.getByText(`Module « ${moduleName} » supprimé.`)).toBeVisible();
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(moduleName);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: moduleName, level: 1 })).toBeVisible();
});
