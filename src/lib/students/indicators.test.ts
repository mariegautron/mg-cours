import { describe, expect, it } from "vitest";

import { pendingByStudent, readView, studentIndicators } from "./indicators";

describe("studentIndicators", () => {
  const base = { modules: 2, appreciated: 2, toGrade: 0, appreciationsAvailable: true };
  it("appréciation écrite quand tous les modules en ont une", () => {
    expect(studentIndicators(base).map((i) => i.key)).toEqual(["appreciation_written"]);
  });
  it("à écrire quand il en manque, rien sans module ni sans table", () => {
    expect(studentIndicators({ ...base, appreciated: 1 })[0].key).toBe("appreciation_missing");
    expect(studentIndicators({ ...base, modules: 0, appreciated: 0 })).toEqual([]);
    expect(studentIndicators({ ...base, appreciationsAvailable: false })).toEqual([]);
  });
  it("rendus à corriger, au singulier et au pluriel", () => {
    expect(studentIndicators({ ...base, toGrade: 1 })[1].label).toBe("1 rendu à corriger");
    expect(studentIndicators({ ...base, toGrade: 3 })[1].label).toBe("3 rendus à corriger");
  });
});

describe("pendingByStudent", () => {
  const members = new Map([["g1", ["a", "b"]]]);
  it("rendu individuel sans note → en attente ; noté → non", () => {
    const p = pendingByStudent([{ assessmentId: "x", studentId: "a", groupId: null }], [], members);
    expect([...(p.get("a") ?? [])]).toEqual(["x"]);
    const q = pendingByStudent(
      [{ assessmentId: "x", studentId: "a", groupId: null }],
      [{ assessmentId: "x", studentId: "a", groupId: null, value: 12 }],
      members,
    );
    expect(q.size).toBe(0);
  });
  it("rendu de groupe : tous les membres, sauf si le groupe ou la personne est noté·e", () => {
    const subs = [{ assessmentId: "x", studentId: null, groupId: "g1" }];
    expect([...pendingByStudent(subs, [], members).keys()].sort()).toEqual(["a", "b"]);
    expect(
      pendingByStudent(
        subs,
        [{ assessmentId: "x", studentId: null, groupId: "g1", value: 10 }],
        members,
      ).size,
    ).toBe(0);
    const partial = pendingByStudent(
      subs,
      [{ assessmentId: "x", studentId: "a", groupId: null, value: 10 }],
      members,
    );
    expect([...partial.keys()]).toEqual(["b"]);
  });
  it("une note vide ne compte pas comme note", () => {
    const p = pendingByStudent(
      [{ assessmentId: "x", studentId: "a", groupId: null }],
      [{ assessmentId: "x", studentId: "a", groupId: null, value: null }],
      members,
    );
    expect(p.has("a")).toBe(true);
  });
});

describe("readView", () => {
  it("liste par défaut, trombinoscope sur demande", () => {
    expect(readView("tiles")).toBe("tiles");
    expect(readView("x")).toBe("list");
    expect(readView(undefined)).toBe("list");
  });
});
