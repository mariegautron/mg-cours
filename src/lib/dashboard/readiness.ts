/**
 * E20 / US-123 : « Prêt pour aujourd'hui ? ». Fonction pure : la checklist d'une séance du jour
 * à partir de ce qui est déjà en base, avec pour chaque point non prêt un lien pour le compléter.
 */
export interface ReadinessInput {
  moduleId: string;
  courseId: string;
  prepStatus: string;
  resources: { status: "progress" | "ready" }[];
  groupCount: number;
  students: { total: number; withPhoto: number };
}

export interface ReadinessItem {
  key: "outline" | "resources" | "groups" | "photos";
  ok: boolean;
  title: string;
  detail?: string;
  action?: { label: string; href: string };
}

export interface Readiness {
  items: ReadinessItem[];
  /** Nombre de points prêts. */
  readyCount: number;
  allReady: boolean;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

export function sessionReadiness(i: ReadinessInput): Readiness {
  const edit = `/modules/${i.moduleId}/courses/${i.courseId}/edit`;
  const toBuild = i.resources.filter((r) => r.status !== "ready").length;
  const items: ReadinessItem[] = [];

  items.push(
    i.prepStatus === "ready"
      ? { key: "outline", ok: true, title: "Déroulé prêt" }
      : {
          key: "outline",
          ok: false,
          title: "Déroulé à finaliser",
          detail: "La séance n’est pas encore marquée prête.",
          action: { label: "Finaliser la séance", href: edit },
        },
  );

  if (i.resources.length === 0) {
    items.push({
      key: "resources",
      ok: false,
      title: "Aucune ressource attachée",
      detail: "Rien ne sera projeté.",
      action: { label: "Attacher des ressources", href: edit },
    });
  } else if (toBuild > 0) {
    items.push({
      key: "resources",
      ok: false,
      title: `${i.resources.length - toBuild} ressource${i.resources.length - toBuild > 1 ? "s" : ""} prête${i.resources.length - toBuild > 1 ? "s" : ""} sur ${i.resources.length}`,
      detail: `${plural(toBuild, "ressource")} à construire : elle${toBuild > 1 ? "s ne seront" : " ne sera"} pas projetée${toBuild > 1 ? "s" : ""}.`,
      action: { label: "Les compléter", href: edit },
    });
  } else {
    items.push({
      key: "resources",
      ok: true,
      title: `${plural(i.resources.length, "ressource")} prête${i.resources.length > 1 ? "s" : ""}`,
    });
  }

  items.push(
    i.groupCount > 0
      ? {
          key: "groups",
          ok: true,
          title: `${plural(i.groupCount, "groupe")} constitué${i.groupCount > 1 ? "s" : ""}`,
        }
      : {
          key: "groups",
          ok: false,
          title: "Pas encore de groupes",
          action: { label: "Constituer les groupes", href: `/modules/${i.moduleId}/groups/new` },
        },
  );

  const { total, withPhoto } = i.students;
  if (total === 0) {
    items.push({
      key: "photos",
      ok: false,
      title: "Aucun·e étudiant·e dans les groupes",
      detail: "Le trombinoscope et les notes ont besoin d’une liste.",
      action: { label: "Voir les étudiant·es", href: "/students" },
    });
  } else if (withPhoto < total) {
    items.push({
      key: "photos",
      ok: false,
      title: `${plural(total - withPhoto, "photo")} manquante${total - withPhoto > 1 ? "s" : ""} sur ${total}`,
      detail: "Le trombinoscope aide à retrouver les prénoms.",
      action: { label: "Importer le trombinoscope", href: "/students/photos" },
    });
  } else {
    items.push({ key: "photos", ok: true, title: "Trombinoscope prêt" });
  }

  const readyCount = items.filter((x) => x.ok).length;
  return { items, readyCount, allReady: readyCount === items.length };
}
