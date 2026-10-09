"use server";

import { revalidatePath } from "next/cache";

import { Resend } from "resend";

import { clientEnv, serverEnv } from "@/lib/env";
import { studentLinkEmail, tokenFromSpaceUrl } from "@/lib/modules/student-mail";
import { getTeacherName } from "@/lib/outline/queries";
import { studentSpaceUrl } from "@/lib/modules/espace";
import { EMAIL_NOT_ENABLED, failure, NOT_FOUND } from "@/lib/messages";
import { notebookStudents } from "@/lib/notebook/notebook";
import { generateToken, hashToken } from "@/lib/quiz/token";
import { createClient } from "@/lib/supabase/server";
import { listModuleGroups } from "@/lib/students/queries";

export interface StudentLinksState {
  error?: string;
  /** Liens créés : les jetons ne sont jamais relisibles ensuite (seul le haché est gardé). */
  links?: { studentId: string; name: string; url: string }[];
}

/**
 * Crée les liens personnels de l'espace étudiant·e. `onlyMissing` : seulement pour les personnes
 * sans lien actif ; sinon tous les liens sont renouvelés (les anciens cessent de fonctionner).
 */
export async function createStudentLinks(
  moduleId: string,
  onlyMissing: boolean,
): Promise<StudentLinksState> {
  const supabase = await createClient();
  const probe = await supabase.from("module_student_link").select("id").limit(1);
  if (probe.error) {
    return {
      error: "Les liens personnels seront disponibles après la mise à jour de la base de données.",
    };
  }
  const students = notebookStudents(await listModuleGroups(moduleId));
  if (students.length === 0) {
    return { error: "Aucun·e étudiant·e dans ce module : crée d’abord les groupes." };
  }

  const { data: active } = await supabase
    .from("module_student_link")
    .select("student_id")
    .eq("module_id", moduleId)
    .is("revoked_at", null);
  const has = new Set((active ?? []).map((l) => l.student_id));
  const targets = onlyMissing ? students.filter((s) => !has.has(s.id)) : students;
  if (targets.length === 0) return { links: [] };

  const revoke = await supabase
    .from("module_student_link")
    .update({ revoked_at: new Date().toISOString() })
    .eq("module_id", moduleId)
    .in(
      "student_id",
      targets.map((s) => s.id),
    )
    .is("revoked_at", null);
  if (revoke.error) return { error: failure("créer les liens") };

  const created = targets.map((s) => ({ student: s, token: generateToken() }));
  const { error } = await supabase.from("module_student_link").insert(
    created.map(({ student, token }) => ({
      module_id: moduleId,
      student_id: student.id,
      token_hash: hashToken(token),
    })),
  );
  if (error) return { error: failure("créer les liens") };
  revalidatePath(`/modules/${moduleId}/frise`);
  return {
    links: created.map(({ student, token }) => ({
      studentId: student.id,
      name: `${student.first_name} ${student.last_name}`,
      url: studentSpaceUrl(clientEnv.NEXT_PUBLIC_APP_URL, token),
    })),
  };
}

/** Révoque tous les liens personnels du module. */
export async function revokeStudentLinks(moduleId: string): Promise<StudentLinksState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("module_student_link")
    .update({ revoked_at: new Date().toISOString() })
    .eq("module_id", moduleId)
    .is("revoked_at", null);
  if (error) return { error: failure("révoquer les liens") };
  revalidatePath(`/modules/${moduleId}/frise`);
  return { links: [] };
}

export interface SendResult {
  studentId: string;
  name: string;
  status: "sent" | "failed" | "no_email";
  message?: string;
}

export interface SendLinksState {
  error?: string;
  results?: SendResult[];
}

/**
 * Envoie à chaque étudiant·e son lien personnel par e-mail. Le lien ne vient jamais du navigateur :
 * on reçoit le jeton, on vérifie qu'il correspond (haché) à un lien ACTIF de cette personne dans ce
 * module, puis on reconstruit l'adresse. L'adresse e-mail vient de la base. Un échec n'arrête pas
 * les autres ; l'état (envoyé le …, cause d'échec) est retenu par personne.
 */
export async function sendStudentLinksEmail(
  moduleId: string,
  items: { studentId: string; url: string }[],
): Promise<SendLinksState> {
  const { RESEND_API_KEY, RESEND_FROM } = serverEnv();
  if (!RESEND_API_KEY || !RESEND_FROM) {
    console.error("[e-mail] envoi désactivé : RESEND_API_KEY ou RESEND_FROM manquant");
    return { error: EMAIL_NOT_ENABLED };
  }
  if (items.length === 0 || items.length > 200) return { error: "Aucun lien à envoyer." };

  const supabase = await createClient();
  const [{ data: mod }, { data: links }, { data: students }, teacherName] = await Promise.all([
    supabase.from("module").select("name").eq("id", moduleId).maybeSingle(),
    supabase
      .from("module_student_link")
      .select("student_id, token_hash")
      .eq("module_id", moduleId)
      .is("revoked_at", null)
      .in(
        "student_id",
        items.map((i) => i.studentId),
      ),
    supabase
      .from("student")
      .select("id, first_name, last_name, email")
      .in(
        "id",
        items.map((i) => i.studentId),
      ),
    getTeacherName(),
  ]);
  if (!mod) return { error: NOT_FOUND.module };
  const hashOf = new Map((links ?? []).map((l) => [l.student_id, l.token_hash]));
  const studentOf = new Map((students ?? []).map((s) => [s.id, s]));

  const resend = new Resend(RESEND_API_KEY);
  const results: SendResult[] = [];
  const remember = async (
    studentId: string,
    patch: { sent_at: string | null; send_error: string | null },
  ) => {
    // Colonnes ajoutées par une migration récente : si elles manquent, l'état n'est pas retenu.
    await supabase
      .from("module_student_link")
      .update(patch)
      .eq("module_id", moduleId)
      .eq("student_id", studentId)
      .is("revoked_at", null);
  };

  for (const item of items) {
    const student = studentOf.get(item.studentId);
    if (!student) continue;
    const name = `${student.first_name} ${student.last_name}`;
    const token = tokenFromSpaceUrl(item.url);
    if (!token || hashOf.get(item.studentId) !== hashToken(token)) {
      results.push({
        studentId: item.studentId,
        name,
        status: "failed",
        message: "Lien invalide ou renouvelé entre-temps.",
      });
      continue;
    }
    if (!student.email?.trim()) {
      results.push({
        studentId: item.studentId,
        name,
        status: "no_email",
        message: "Pas d’adresse e-mail.",
      });
      continue;
    }
    const mail = studentLinkEmail({
      firstName: student.first_name,
      moduleName: mod.name,
      url: studentSpaceUrl(clientEnv.NEXT_PUBLIC_APP_URL, token),
      teacherName,
    });
    try {
      const { error } = await resend.emails.send({
        from: RESEND_FROM,
        to: [student.email.trim()],
        subject: mail.subject,
        text: mail.text,
      });
      if (error) throw new Error(error.message);
      await remember(item.studentId, { sent_at: new Date().toISOString(), send_error: null });
      results.push({ studentId: item.studentId, name, status: "sent" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Envoi impossible.";
      console.error(`[e-mail] échec de l’envoi du lien à ${name}`, message);
      await remember(item.studentId, { sent_at: null, send_error: message.slice(0, 300) });
      results.push({
        studentId: item.studentId,
        name,
        status: "failed",
        message: message.slice(0, 200),
      });
    }
  }
  revalidatePath(`/modules/${moduleId}/frise`);
  return { results };
}
