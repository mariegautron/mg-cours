"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { copyAssessmentFiles } from "@/lib/assessments/copy-files";
import { readModuleDates } from "@/lib/modules/hyperplanning";
import { planAssessmentCopy } from "@/lib/modules/duplicate-evaluations";
import { parseResourceFiles } from "@/lib/resources/files";
import { planSessions, readScheduleRows, type ScheduleRow } from "@/lib/modules/schedule-parser";
import { importFicheForModule } from "@/lib/modules/fiche-document";
import { readPendingFiche, type FicheImportStatus } from "@/lib/modules/fiche-import";
import { readModuleForm } from "@/lib/modules/schema";
import { createClient } from "@/lib/supabase/server";
import { REQUIRED_ADMIN_DOCS } from "@/lib/ynov/invoice";
import type { Tables } from "@/types/db";

export interface ModuleFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function flatten(fieldErrors: Record<string, string[] | undefined>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(([, v]) => v && v.length) as [string, string[]][],
  );
}

function toRow(input: ReturnType<typeof readModuleForm>["data"]) {
  if (!input) return null;
  return {
    name: input.name,
    school_id: input.schoolId,
    level: input.level || null,
    year: input.year,
    ycode: input.ycode || null,
    total_hours: input.totalHours,
    hourly_rate: input.hourlyRate,
    hours_lecture: input.hoursLecture,
    hours_td: input.hoursTd,
    hours_tp: input.hoursTp,
    start_date: input.startDate,
    first_session_date: input.firstSessionDate,
    end_date: input.endDate,
    purchase_order_ref: input.purchaseOrderRef || null,
    slides_url: input.slidesUrl || null,
    student_intro: input.studentIntro?.trim() || null,
  };
}

const SCHEDULE_ERROR = "Le planning est illisible. Vérifiez les dates et les horaires.";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Crée les séances vides d'un planning, à la suite de celles qui existent déjà. */
async function insertScheduleCourses(
  supabase: Supabase,
  moduleId: string,
  rows: ScheduleRow[],
  existingCount: number,
) {
  const plan = planSessions(rows, existingCount);
  const { error } = await supabase.from("course").insert(
    plan.sessions.map((s) => ({
      module_id: moduleId,
      title: s.title,
      position: s.number,
      session_date: s.date,
      start_time: s.startTime,
      end_time: s.endTime,
      prep_status: "todo",
    })),
  );
  return { plan, error };
}

export async function createModule(
  _prev: ModuleFormState,
  formData: FormData,
): Promise<ModuleFormState> {
  const parsed = readModuleForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };
  const scheduleRows = readScheduleRows(String(formData.get("scheduleJson") ?? ""));
  if (!scheduleRows) return { error: SCHEDULE_ERROR };

  const row = toRow(parsed.data)!;
  // La 1re séance du planning donne la date de référence de l'échéance (J-15).
  const firstSessionDate = planSessions(scheduleRows).firstSessionDate;
  if (firstSessionDate) row.first_session_date = firstSessionDate;

  const supabase = await createClient();
  const { data, error } = await supabase.from("module").insert(row).select("id").single();
  if (error) return { error: "Enregistrement impossible. Réessayez." };

  if (scheduleRows.length) {
    const { error: coursesError } = await insertScheduleCourses(supabase, data.id, scheduleRows, 0);
    if (coursesError) {
      // Pas de module à moitié créé : on retire le module et on laisse la saisie en place.
      await supabase.from("module").delete().eq("id", data.id);
      return { error: "Les séances n’ont pas pu être créées. Réessayez." };
    }
  }

  // Fiche YNOV importée pendant la saisie : conservée avec ses attendus, jamais perdue en silence.
  const ficheRaw = String(formData.get("ficheDoc") ?? "");
  let ficheStatus: FicheImportStatus | null = null;
  if (ficheRaw) {
    const { data: auth } = await supabase.auth.getUser();
    const fiche = auth.user ? readPendingFiche(ficheRaw, auth.user.id) : null;
    ficheStatus =
      fiche && auth.user
        ? await importFicheForModule(supabase, auth.user.id, data.id, fiche)
        : "failed";
  }

  revalidatePath("/modules");
  redirect(`/modules/${data.id}${ficheStatus ? `?fiche=${ficheStatus}` : ""}`);
}

/** Ajoute des séances vides à un module existant à partir d'un planning. */
export async function addScheduleToModule(
  moduleId: string,
  _prev: ModuleFormState,
  formData: FormData,
): Promise<ModuleFormState> {
  const rows = readScheduleRows(String(formData.get("scheduleJson") ?? ""));
  if (!rows) return { error: SCHEDULE_ERROR };
  // Dates d'un import Hyperplanning confirmé (aperçu et écarts déjà montrés à l'écran).
  const confirmedDates = readModuleDates(String(formData.get("datesJson") ?? ""));
  if (confirmedDates === null) return { error: SCHEDULE_ERROR };
  if (!rows.length) return { error: "Ajoutez au moins un créneau." };

  const supabase = await createClient();
  // Le module doit appartenir à l'utilisatrice connectée : la RLS ne renvoie rien sinon.
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Session expirée." };
  const { data: mod } = await supabase
    .from("module")
    .select("id, owner_id, first_session_date")
    .eq("id", moduleId)
    .maybeSingle();
  if (!mod || mod.owner_id !== auth.user.id) return { error: "Module introuvable." };

  const { count } = await supabase
    .from("course")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId);

  const { plan, error } = await insertScheduleCourses(supabase, moduleId, rows, count ?? 0);
  if (error) return { error: "Les séances n’ont pas pu être créées. Réessayez." };

  if (confirmedDates) {
    await supabase
      .from("module")
      .update({
        start_date: confirmedDates.startDate,
        first_session_date: confirmedDates.firstSessionDate,
        end_date: confirmedDates.endDate,
      })
      .eq("id", moduleId);
  } else if (
    plan.firstSessionDate &&
    (!mod.first_session_date || plan.firstSessionDate < mod.first_session_date)
  ) {
    await supabase
      .from("module")
      .update({ first_session_date: plan.firstSessionDate })
      .eq("id", moduleId);
  }

  revalidatePath("/modules");
  revalidatePath(`/modules/${moduleId}`);
  revalidatePath("/dashboard");
  redirect(`/modules/${moduleId}#courses`);
}

export async function updateModule(
  id: string,
  _prev: ModuleFormState,
  formData: FormData,
): Promise<ModuleFormState> {
  const parsed = readModuleForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const supabase = await createClient();
  const { error } = await supabase.from("module").update(toRow(parsed.data)!).eq("id", id);
  if (error) return { error: "Enregistrement impossible. Réessayez." };

  revalidatePath("/modules");
  revalidatePath(`/modules/${id}`);
  redirect(`/modules/${id}`);
}

export async function deleteModule(id: string) {
  "use server";
  const supabase = await createClient();
  const { error } = await supabase.from("module").delete().eq("id", id);
  if (error) return;
  revalidatePath("/modules");
  redirect("/modules");
}

async function setModuleArchived(id: string, archived: boolean) {
  const supabase = await createClient();
  await supabase
    .from("module")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  revalidatePath("/modules");
  revalidatePath(`/modules/${id}`);
  revalidatePath("/billing");
  revalidatePath("/dashboard");
}

export async function archiveModule(id: string) {
  "use server";
  await setModuleArchived(id, true);
}

export async function unarchiveModule(id: string) {
  "use server";
  await setModuleArchived(id, false);
}

export interface AdminDocState {
  error?: string;
  saved?: boolean;
}

export async function setAdminDoc(id: string, key: string, value: boolean): Promise<AdminDocState> {
  if (!REQUIRED_ADMIN_DOCS.some((d) => d.key === key)) return { error: "Document inconnu." };
  const supabase = await createClient();
  const { data: mod } = await supabase.from("module").select("admin_docs").eq("id", id).single();
  if (!mod) return { error: "Module introuvable." };
  const adminDocs = { ...((mod.admin_docs as Record<string, boolean>) ?? {}), [key]: value };
  const { error } = await supabase.from("module").update({ admin_docs: adminDocs }).eq("id", id);
  if (error) return { error: "Enregistrement impossible. Réessayez." };
  revalidatePath(`/modules/${id}`);
  revalidatePath(`/modules/${id}/billing`);
  revalidatePath("/billing");
  return { saved: true };
}

export interface DuplicateState {
  error?: string;
}

/** Duplique un module (+ ses cours et leurs ressources liées) vers une nouvelle année. */
export async function duplicateModule(
  sourceId: string,
  _prev: DuplicateState,
  formData: FormData,
): Promise<DuplicateState> {
  const year = Number(formData.get("year"));
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return { error: "Année invalide." };
  }

  const supabase = await createClient();
  const { data: source } = await supabase.from("module").select("*").eq("id", sourceId).single();
  if (!source) return { error: "Module introuvable." };

  const { data: newModule, error: moduleError } = await supabase
    .from("module")
    .insert({
      name: source.name,
      school_id: source.school_id,
      level: source.level,
      year,
      ycode: source.ycode,
      total_hours: source.total_hours,
      hourly_rate: source.hourly_rate,
      slides_url: source.slides_url,
      student_intro: source.student_intro,
      hours_lecture: source.hours_lecture,
      hours_td: source.hours_td,
      hours_tp: source.hours_tp,
      // Dates et statut administratif repartent à zéro pour la nouvelle année.
    })
    .select("id")
    .single();

  if (moduleError || !newModule) return { error: "Duplication impossible. Réessayez." };

  const { data: courses } = await supabase
    .from("course")
    .select("*, course_resource(resource_id, role)")
    .eq("module_id", sourceId)
    .order("position");

  const courseIds = new Map<string, string>();
  for (const c of (courses ?? []) as (Tables<"course"> & {
    course_resource: { resource_id: string; role: string }[];
  })[]) {
    const { data: newCourse } = await supabase
      .from("course")
      .insert({
        module_id: newModule.id,
        title: c.title,
        position: c.position,
        session_date: c.session_date,
        start_time: c.start_time,
        end_time: c.end_time,
        type: c.type,
        learning_objectives: c.learning_objectives,
        animation_notes: c.animation_notes,
        assessment_notes: c.assessment_notes,
        material: c.material,
        prep_status: c.prep_status,
      })
      .select("id")
      .single();

    if (newCourse) courseIds.set(c.id, newCourse.id);
    if (newCourse && c.course_resource.length) {
      await supabase.from("course_resource").insert(
        c.course_resource.map((cr) => ({
          course_id: newCourse.id,
          resource_id: cr.resource_id,
          role: cr.role as "primary" | "secondary",
        })),
      );
    }
  }

  // Les ressources retenues suivent le module dupliqué (US-55).
  const { data: retained } = await supabase
    .from("module_resource")
    .select("resource_id")
    .eq("module_id", sourceId);
  if (retained?.length) {
    await supabase
      .from("module_resource")
      .insert(retained.map((r) => ({ module_id: newModule.id, resource_id: r.resource_id })));
  }

  await duplicateEvaluations(supabase, sourceId, newModule.id, courseIds);

  revalidatePath("/modules");
  redirect(`/modules/${newModule.id}`);
}

/**
 * Projet fil rouge, thèmes, évaluations (sujet, grille, coefficient, fichiers) : sans notes, sans
 * dates, sans groupes ni affectations (US-98). Les grilles sont référencées, pas dupliquées.
 */
async function duplicateEvaluations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sourceId: string,
  targetId: string,
  courseIds: ReadonlyMap<string, string>,
) {
  const { data: auth } = await supabase.auth.getUser();
  const ownerId = auth.user?.id;

  let projectId: string | null = null;
  const { data: project } = await supabase
    .from("module_project")
    .select("*")
    .eq("module_id", sourceId)
    .maybeSingle();
  if (project) {
    const { data: newProject } = await supabase
      .from("module_project")
      .insert({
        module_id: targetId,
        title: project.title,
        brief_md: project.brief_md,
        client_context_md: project.client_context_md,
      })
      .select("id")
      .single();
    projectId = newProject?.id ?? null;
    if (projectId) {
      const { data: themes } = await supabase
        .from("project_theme")
        .select("*")
        .eq("project_id", project.id)
        .order("position");
      if (themes?.length) {
        await supabase.from("project_theme").insert(
          themes.map((t) => ({
            project_id: projectId!,
            title: t.title,
            description_md: t.description_md,
            position: t.position,
          })),
        );
      }
    }
  }

  const { data: assessments } = await supabase
    .from("assessment")
    .select("*")
    .eq("module_id", sourceId)
    .order("created_at");

  for (const a of assessments ?? []) {
    const { data: created } = await supabase
      .from("assessment")
      .insert(planAssessmentCopy(a, { moduleId: targetId, courseIds, projectId }))
      .select("id")
      .single();
    if (!created || !ownerId) continue;

    // Copie réelle dans le stockage : supprimer l'ancien module ne doit jamais casser le nouveau.
    const { copied } = await copyAssessmentFiles(
      supabase,
      ownerId,
      parseResourceFiles(a.files),
      created.id,
    );
    if (copied.length)
      await supabase.from("assessment").update({ files: copied }).eq("id", created.id);
  }
}
