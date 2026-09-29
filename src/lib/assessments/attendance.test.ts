import { describe, expect, it } from "vitest";

import {
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

describe("groupMemberValue", () => {
  const base = { attendance: "present", factor: 1, justification: null } as const;

  it("sans ajustement : la note du groupe, jamais modifiée par les autres membres", () => {
    expect(groupMemberValue(16, 20)).toBe(16);
    expect(groupMemberValue(16, 20, base)).toBe(16);
    expect(groupMemberValue(null, 20)).toBeNull();
  });

  it("absent·e non prévenu·e : 0 individuel ; excusé·e : aucune note", () => {
    expect(groupMemberValue(16, 20, { ...base, attendance: "absent_unexcused" })).toBe(0);
    expect(groupMemberValue(16, 20, { ...base, attendance: "absent_excused" })).toBeNull();
    expect(groupMemberValue(null, 20, { ...base, attendance: "absent_unexcused" })).toBe(0);
  });

  it("pondération : multiplie la note du groupe et plafonne au barème", () => {
    expect(groupMemberValue(16, 20, { ...base, factor: 0.8, justification: "x" })).toBe(12.8);
    expect(groupMemberValue(18, 20, { ...base, factor: 1.2, justification: "x" })).toBe(20);
    expect(groupMemberValue(null, 20, { ...base, factor: 0.8, justification: "x" })).toBeNull();
  });
});

describe("isDefaultOverride / isAttendance", () => {
  it("reconnaît l'absence d'ajustement", () => {
    expect(isDefaultOverride({ attendance: "present", factor: 1, justification: null })).toBe(true);
    expect(
      isDefaultOverride({ attendance: "absent_excused", factor: 1, justification: null }),
    ).toBe(false);
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

  it("lit absences et pondérations, omet les membres sans ajustement", () => {
    const result = readMemberOverrides(
      form({
        member_m1_attendance: "absent_unexcused",
        member_m2_attendance: "present",
        member_m2_factor: "80",
        member_m2_justification: "  A peu contribué à l'oral. ",
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
      factor: 0.8,
      justification: "A peu contribué à l'oral.",
    });
  });

  it("exige une justification dès que la pondération diffère de 100 %", () => {
    const result = readMemberOverrides(
      form({ member_m2_attendance: "present", member_m2_factor: "80" }),
      members,
    );
    expect(result).toEqual({
      error: "Justification obligatoire pour la pondération de Noa Test.",
    });
  });

  it("refuse un pourcentage invalide ; ignore la pondération d'un·e absent·e et les inconnus", () => {
    expect(
      "error" in
        readMemberOverrides(
          form({ member_m1_attendance: "present", member_m1_factor: "abc" }),
          members,
        ),
    ).toBe(true);
    expect(
      "error" in
        readMemberOverrides(
          form({ member_m1_attendance: "present", member_m1_factor: "250" }),
          members,
        ),
    ).toBe(true);
    const absent = readMemberOverrides(
      form({
        member_m1_attendance: "absent_excused",
        member_m1_factor: "50",
        member_zzz_attendance: "absent_unexcused",
      }),
      members,
    );
    expect("overrides" in absent && [...absent.overrides.keys()]).toEqual(["m1"]);
    expect("overrides" in absent && absent.overrides.get("m1")?.factor).toBe(1);
  });
});
