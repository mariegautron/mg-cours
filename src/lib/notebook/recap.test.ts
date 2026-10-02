import { describe, expect, it } from "vitest";

import { closureRecap, type RecapInput } from "./recap";

const base: RecapInput = {
  completion: "done",
  notCovered: null,
  nextTime: null,
  observedNames: [],
  hasRetro: false,
  nextNumber: 4,
};
const get = (i: RecapInput, key: string) => closureRecap(i).find((x) => x.key === key);

describe("closureRecap", () => {
  it("séance faite, rien à reporter, pas de consigne", () => {
    expect(get(base, "completion")).toMatchObject({ state: "done", title: "Séance faite" });
    expect(get(base, "carried")).toMatchObject({ state: "done", title: "Rien à reporter" });
    expect(get(base, "next")?.state).toBe("todo");
    expect(get(base, "observations")).toBeUndefined();
    expect(get(base, "retro")).toBeUndefined();
  });
  it("faite en partie : le point reporté est rappelé à la séance suivante", () => {
    const i = { ...base, completion: "partial" as const, notCovered: " Planning poker " };
    expect(get(i, "completion")).toMatchObject({ state: "partial", title: "Faite en partie" });
    expect(get(i, "carried")).toMatchObject({ state: "carried", title: "À reporter" });
    expect(get(i, "carried")?.detail).toBe("Planning poker Rappelé au début de la séance 4.");
  });
  it("non faite, ou statut absent : à faire, avec une explication", () => {
    expect(get({ ...base, completion: "not_done" }, "completion")).toMatchObject({
      state: "todo",
      title: "Non faite",
    });
    const none = get({ ...base, completion: null }, "completion")!;
    expect(none.state).toBe("todo");
    expect(none.detail).toContain("Choisis");
  });
  it("consigne : citée et projetée à l'ouverture (sans séance suivante : « la prochaine séance »)", () => {
    const i = { ...base, nextTime: "Lire le guide", nextNumber: null };
    expect(get(i, "next")).toMatchObject({ state: "done" });
    expect(get(i, "next")?.detail).toBe(
      "« Lire le guide » Projetée à l’ouverture de la prochaine séance.",
    );
  });
  it("observations : compte les observations, nomme chaque personne une fois", () => {
    const i = { ...base, observedNames: ["Camille R.", "Sami D.", "Camille R."] };
    expect(get(i, "observations")?.title).toBe("3 observations rangées dans les fiches");
    expect(get(i, "observations")?.detail).toBe("Camille R., Sami D. · Rien à recopier.");
    expect(get({ ...base, observedNames: ["Noa B."] }, "observations")?.title).toBe(
      "1 observation rangée dans les fiches",
    );
  });
  it("le retour personnel n'apparaît que par sa présence, jamais son texte", () => {
    const item = get({ ...base, hasRetro: true }, "retro")!;
    expect(JSON.stringify(item)).not.toMatch(/retro_note/);
    expect(item.title).toBe("Ton retour personnel est gardé");
  });
});
