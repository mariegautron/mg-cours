import { describe, expect, it } from "vitest";

import { parseGrid, parseRubricTables } from "../lib/parsers.mts";

import { splitLevels } from "./complements-fonctions.mts";

// Extraits des grilles Notion de Marie (grille individuelle et grille d'oral, B2 2025-26).
const INDIVIDUELLE = `## 📊 Évaluation
### 1️⃣ Structure & navigation sémantique — **/6**
> Utilisation de balises pertinentes et navigation accessible au clavier
☐ **6 pts**
Structure sémantique correcte (header/nav/main, vrais liens).
☐ **4 pts**
Structure globalement correcte, quelques oublis.
☐ **2 pts**
Tentative de structure, navigation encore problématique.
☐ **0 pt**
Structure non corrigée.
**Commentaires :**
…
---
### 2️⃣ Formulaire : labels et champs — **/8**
☐ **8 pts**
Tous les champs ont un label associé.
☐ **6 pts**
Association partielle.
☐ **4 pts**
Labels incorrects.
☐ **2 pts**
Tentative très partielle.
☐ **0 pt**
Formulaire non corrigé.
---
### 3️⃣ Bouton d’action — **/2**
☐ **2 pts**
Bouton correct.
☐ **1 pt**
Choix discutable.
☐ **0 pt**
Toujours un div cliquable.
---
### 4️⃣ Justification & impacts utilisateurs — **/4**
☐ **4 pts**
Impacts clairs.
☐ **2 pts**
Impacts vagues.
☐ **0 pt**
Aucune justification.
---
`;

const ORAL = `### 3️⃣ Qualité des corrections techniques — **/4**
☐ **4 pts**
Corrections propres, sémantiques, proportionnées.
☐ **3 pts**
Globalement correctes.
☐ **2 pts**
Maladroites ou incomplètes.
☐ **0–1 pt**
Incorrectes ou non fonctionnelles.
---
### 1️⃣ Choix et pertinence — **/6**
☐ **6 pts**
Bien choisies.
☐ **4 pts**
Pertinentes.
☐ **2 pts**
Peu pertinentes.
☐ **0 pt**
Hors audit.
---
`;

function levelsOf(body: string) {
  return parseGrid(body).criteria.map((c) => ({
    label: c.label,
    weight: c.weight,
    levels: splitLevels(c.description).levels.map((l) => l.points),
  }));
}

describe("grille individuelle (paliers propres à chaque critère)", () => {
  const criteria = levelsOf(INDIVIDUELLE);

  it("6/4/2/0, 8/6/4/2/0, 2/1/0 et 4/2/0", () => {
    expect(criteria.map((c) => c.levels)).toEqual([
      [6, 4, 2, 0],
      [8, 6, 4, 2, 0],
      [2, 1, 0],
      [4, 2, 0],
    ]);
  });

  it("le palier le plus haut est le barème et le total fait 20", () => {
    for (const c of criteria) expect(Math.max(...c.levels)).toBe(c.weight);
    expect(criteria.reduce((s, c) => s + c.weight, 0)).toBe(20);
  });
});

describe("grille d'oral : palier en fourchette « 0–1 pt »", () => {
  it("donne un palier 1 et un palier 0 avec le même texte, sans perdre le palier bas", () => {
    const { levels } = splitLevels(parseGrid(ORAL).criteria[0].description);
    expect(levels.map((l) => l.points)).toEqual([4, 3, 2, 1, 0]);
    expect(levels[3].description).toBe(levels[4].description);
    expect(levels[3].description).toContain("Incorrectes");
  });

  it("un critère sans fourchette est inchangé", () => {
    expect(levelsOf(ORAL)[1].levels).toEqual([6, 4, 2, 0]);
  });

  it("garde le texte d'introduction du critère", () => {
    const { lead } = splitLevels("> Les corrections sont-elles propres ?\n☐ **4 pts**\nOui.");
    expect(lead).toContain("propres");
  });

  it("les valeurs décimales ne sont pas éclatées", () => {
    expect(splitLevels("**0,5 pt** Un peu.").levels.map((l) => l.points)).toEqual([0.5]);
  });
});

describe("grille du projet fil rouge (axes, références RGAA, bonus)", () => {
  const BODY = `### 1. 🧱 Structuration et contenus accessibles (8 points)
| Critère | Critères évalués | Référence RGAA | Barème | Commentaires |
| --- | --- | --- | --- | --- |
| Header/footer sémantiques | Présence de header et footer | 1.3.1 | /0.5 | |
| Lien d’évitement | Lien en début de page | 12.6.1 à 12.6.3 | /1 | |

### 5. 🚀 CI/CD, déploiement et éco-conception (3 points + bonus)
| Critère | Critères évalués | Barème | Commentaires |
| --- | --- | --- | --- |
| Site en ligne | Lien fonctionnel | /0.5 | |
| Bonus : EcoIndex > 70 | Bonus performance | +0.5 | |
`;
  const rows = parseRubricTables(BODY);

  it("porte l'axe, la référence et le barème de chaque critère", () => {
    expect(rows[0]).toMatchObject({
      section: "Structuration et contenus accessibles",
      label: "Header/footer sémantiques",
      reference: "1.3.1",
      weight: 0.5,
      bonus: false,
    });
    expect(rows[1].reference).toBe("12.6.1 à 12.6.3");
  });

  it("repère le bonus hors barème et l'axe sans référence", () => {
    expect(rows[3]).toMatchObject({ bonus: true, weight: 0.5, reference: "" });
    expect(rows[2].section).toBe("CI/CD, déploiement et éco-conception");
  });
});
