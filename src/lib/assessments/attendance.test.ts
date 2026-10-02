import { describe, expect, it } from "vitest";

import {
  excusedGroupHint,
  groupMemberValue,
  individualValueFor,
  isAttendance,
  isDefaultOverride,
  readMemberOverrides,
} from "./attendance";

describe("individualValueFor", () => {
  it("non prévenu·e = 0 automatique, excusé·e = pas de note, présent·e = la note saisie", () => {
    expect(individualValueFor("absent_unexcused", 14)).toBe(0);
    expect(individualValueFor("absent_unexcused", null)).toBe(0);
    expect(individualValueFor("absent_excused", 14)).toBeNull();
    expect(individualValueFor("present", 14)).toBe(14);
    expect(individualValueFor("present", null)).toBeNull();
  });
});

describe("groupMemberValue — note finale selon présence, règle de l'école et note de groupe", () => {
  const present = { attendance: "present" } as const;
  const excused = { attendance: "absent_excused" } as const;
  const unexcused = { attendance: "absent_unexcused" } as const;

  it("présent·e : la note du groupe, sans ajustement ni retrait", () => {
    expect(groupMemberValue(16, 20)).toBe(16);
    expect(groupMemberValue(16, 20, present)).toBe(16);
    expect(groupMemberValue(null, 20, present)).toBeNull();
  });

  it("non prévenu·e : 0, quelle que soit la règle et même sans note de groupe", () => {
    expect(groupMemberValue(16, 20, unexcused, "keep_group_grade")).toBe(0);
    expect(groupMemberValue(16, 20, unexcused, "makeup")).toBe(0);
    expect(groupMemberValue(null, 20, unexcused)).toBe(0);
  });

  it("excusé·e : garde la note du groupe par défaut", () => {
    expect(groupMemberValue(15.5, 20, excused)).toBe(15.5);
    expect(groupMemberValue(15.5, 20, excused, "keep_group_grade")).toBe(15.5);
    expect(groupMemberValue(null, 20, excused, "keep_group_grade")).toBeNull();
  });

  it("excusé·e : rattrapage selon la règle de l'école (pas de note)", () => {
    expect(groupMemberValue(15.5, 20, excused, "makeup")).toBeNull();
  });

  it("jamais de retrait de points : l'ancienne pondération stockée est ignorée", () => {
    const legacy = { attendance: "present", factor: 0.5, justification: "x" } as const;
    expect(groupMemberValue(16, 20, legacy)).toBe(16);
  });

  it("note plafonnée au barème (total plafonné à 20)", () => {
    expect(groupMemberValue(21, 20, present)).toBe(20);
    expect(groupMemberValue(21, 20, excused)).toBe(20);
    expect(groupMemberValue(24, 24, present)).toBe(24);
    expect(groupMemberValue(20, 20, present)).toBe(20);
  });

  it("note de groupe nulle : 0 reste 0", () => {
    expect(groupMemberValue(0, 20, present)).toBe(0);
    expect(groupMemberValue(0, 20, excused)).toBe(0);
  });
});

describe("excusedGroupHint", () => {
  it("dit ce que la règle de l'école fait", () => {
    expect(excusedGroupHint("keep_group_grade")).toContain("Garde la note du groupe");
    expect(excusedGroupHint("makeup")).toContain("rattrapage");
  });
});

describe("isDefaultOverride / isAttendance", () => {
  it("reconnaît l'absence de particularité (un mot compte)", () => {
    expect(isDefaultOverride({ attendance: "present", factor: 1, justification: null })).toBe(true);
    expect(
      isDefaultOverride({ attendance: "absent_excused", factor: 1, justification: null }),
    ).toBe(false);
    expect(isDefaultOverride({ attendance: "present", factor: 1, justification: "Bravo." })).toBe(
      false,
    );
    // Une ancienne pondération seule ne compte plus.
    expect(isDefaultOverride({ attendance: "present", factor: 0.8, justification: null })).toBe(
      true,
    );
    expect(isAttendance("present")).toBe(true);
    expect(isAttendance("autre")).toBe(false);
  });
});

describe("readMemberOverrides", () => {
  const members = [
    { id: "m1", name: "Lea Test" },
    { id: "m2", name: "Noa Test" },
    { id: "m3", name: "Ali Test" },
  ];
  const form = (entries: Record<string, string>) => {
    const data = new FormData();
    for (const [k, v] of Object.entries(entries)) data.set(k, v);
    return data;
  };

  it("lit absences et mots, omet les membres sans particularité, ne lit aucune pondération", () => {
    const result = readMemberOverrides(
      form({
        member_m1_attendance: "absent_unexcused",
        member_m2_attendance: "present",
        member_m2_factor: "80",
        member_m2_justification: "  Très investi sur les tests. ",
        member_m3_attendance: "present",
        member_m3_factor: "100",
      }),
      members,
    );
    expect("overrides" in result).toBe(true);
    if (!("overrides" in result)) return;
    expect([...result.overrides.keys()]).toEqual(["m1", "m2"]);
    expect(result.overrides.get("m1")).toEqual({
      attendance: "absent_unexcused",
      factor: 1,
      justification: null,
    });
    expect(result.overrides.get("m2")).toEqual({
      attendance: "present",
      factor: 1,
      justification: "Très investi sur les tests.",
    });
  });

  it("aucune erreur de justification : le mot est facultatif", () => {
    const result = readMemberOverrides(
      form({ member_m2_attendance: "present", member_m2_factor: "80" }),
      members,
    );
    expect("overrides" in result && result.overrides.size).toBe(0);
  });

  it("ignore les inconnus, borne la longueur du mot", () => {
    const result = readMemberOverrides(
      form({
        member_zzz_attendance: "absent_unexcused",
        member_m1_attendance: "absent_excused",
        member_m2_attendance: "present",
        member_m2_justification: "x".repeat(2000),
      }),
      members,
    );
    expect("overrides" in result && [...result.overrides.keys()]).toEqual(["m1", "m2"]);
    expect("overrides" in result && result.overrides.get("m2")?.justification?.length).toBe(1000);
  });
});
