import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Parcours « préparer un module » sur téléphone (320 px) et tablette (768 px) : pas de défilement
// horizontal, axe sans violation, cibles tactiles d'au moins 44 px. Zoom 400 % ≈ 320 px de large.
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
}

/** Éléments interactifs visibles plus petits que 44 × 44 px (hors liens dans une phrase). */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const nodes = document.querySelectorAll<HTMLElement>(
      'button, [role="button"], input:not([type="hidden"]):not(.sr-only), select, summary, a[class*="btn"], a[data-slot="button"], [role="tab"]',
    );
    for (const el of nodes) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || style.visibility === "hidden") continue;
      if (el.classList.contains("sr-only") || el.closest(".sr-only")) continue;
      // La poignée de bordure de la barre latérale est un raccourci souris : le bouton est ailleurs.
      if (el.getAttribute("data-sidebar") === "rail") continue;
      // Un interrupteur porte sa propre zone de toucher élargie (pseudo-élément) et son libellé.
      if (el.getAttribute("data-slot") === "switch") continue;
      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
        const label = el.closest("label");
        const lr = label?.getBoundingClientRect();
        if (lr && lr.width >= 44 && lr.height >= 44) continue;
      }
      if (r.width < 44 || r.height < 44) {
        out.push(
          `${el.tagName.toLowerCase()} « ${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 50)} » ${Math.round(r.width)}×${Math.round(r.height)}`,
        );
      }
    }
    return out;
  });
}

for (const [label, width, height] of [
  ["téléphone 320 px", 320, 700],
  ["tablette 768 px", 768, 1000],
] as const) {
  test(`parcours préparer un module : ${label}`, async ({ page }) => {
    test.setTimeout(300_000);
    await login(page);
    await page.setViewportSize({ width, height });
    const stamp = Date.now();

    await page.goto("/modules/new");
    await page.getByLabel("Nom du module").fill(`Module mobile ${stamp}`);
    await page.getByLabel("Année").fill("2026");
    await page.getByLabel("Nombre d’heures total").fill("21");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
    const moduleUrl = page.url();
    await page.goto(`${moduleUrl}/courses/new`);
    await page.getByLabel("Titre de la séance").fill("Séance mobile");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForURL(/\/courses(\/[0-9a-f-]{36})?$/);
    await page.goto(`${moduleUrl}/assessments/new`);
    await page.getByLabel("Titre", { exact: true }).fill(`Éval mobile ${stamp}`);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForURL(/\/assessments\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    const evalUrl = page.url();

    const pages: [string, string][] = [
      ["tableau de bord", "/dashboard"],
      ["liste des modules", "/modules"],
      ["création du module", "/modules/new"],
      ["fiche du module", moduleUrl],
      ["attendus", `${moduleUrl}/expectations`],
      ["rapprochement", `${moduleUrl}/matching`],
      ["séances", `${moduleUrl}/courses`],
      ["progression", `${moduleUrl}/outline`],
      ["fil rouge", `${moduleUrl}/project`],
      ["évaluations", `${moduleUrl}/assessments`],
      ["une évaluation", evalUrl],
      ["groupes", `${moduleUrl}/groups`],
      ["documents", `${moduleUrl}/documents`],
      ["bibliothèque", "/resources"],
      ["nouvelle ressource", "/resources/new"],
    ];
    const problems: string[] = [];
    for (const [name, url] of pages) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      if (overflow > 1) problems.push(`${name} : défilement horizontal de ${overflow} px`);
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      for (const v of axe.violations) problems.push(`${name} : axe ${v.id} (${v.nodes.length})`);
      for (const t of await smallTargets(page)) problems.push(`${name} : cible trop petite ${t}`);
    }
    if (process.env.RESPONSIVE_REPORT) console.log(`REPORT ${label}\n${problems.join("\n")}`);
    expect(problems).toEqual([]);
  });
}
