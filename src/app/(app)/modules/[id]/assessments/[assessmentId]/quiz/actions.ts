"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Resend } from "resend";

import { getAssessment } from "@/lib/assessments/queries";
import { gradingTargets } from "@/lib/assessments/targets";
import { clientEnv, serverEnv } from "@/lib/env";
import {
  parisLocalToIso,
  rulesFromJson,
  validateQuizConfig,
  RESULTS_MODES,
  type QuizConfig,
  type ResultsMode,
} from "@/lib/quiz/config";
import { drawQuiz, DrawError, quizTotalPoints, reuseNotice, shortages } from "@/lib/quiz/draw";
import { regradeAttempt } from "@/lib/quiz/grade-server";
import { inviteSubject, inviteText, type InviteContext } from "@/lib/quiz/links";
import { getQuizByAssessment, loadBank, passingStudents } from "@/lib/quiz/queries";
import { generateToken, hashToken, quizUrl } from "@/lib/quiz/token";
import type { DrawnQuestion } from "@/lib/quiz/types";
import { createClient } from "@/lib/supabase/server";

const path = (moduleId: string, assessmentId: string) =>
  `/modules/${moduleId}/assessments/${assessmentId}/quiz`;

function refresh(moduleId: string, assessmentId: string) {
  revalidatePath(path(moduleId, assessmentId));
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}`);
  revalidatePath(`/modules/${moduleId}/assessments`);
}

export interface QuizActionState {
  errors?: string[];
  saved?: boolean;
}

/** Crée le QCM d'une évaluation individuelle. */
export async function createQuiz(moduleId: string, assessmentId: string): Promise<void> {
  const assessment = await getAssessment(assessmentId);
  if (!assessment || assessment.module_id !== moduleId)
    redirect(`/modules/${moduleId}/assessments`);
  if (assessment.is_group_grade) {
    redirect(
      `${path(moduleId, assessmentId)}?error=${encodeURIComponent("Un QCM est une évaluation individuelle : cette évaluation est notée par groupe.")}`,
    );
  }
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("quiz")
    .select("id")
    .eq("assessment_id", assessmentId)
    .maybeSingle();
  if (!existing) {
    const { error } = await supabase
      .from("quiz")
      .insert({ assessment_id: assessmentId, title: assessment.title });
    if (error)
      redirect(
        `${path(moduleId, assessmentId)}?error=${encodeURIComponent(`Le QCM n’a pas pu être créé (${error.message}).`)}`,
      );
    if (!assessment.type)
      await supabase.from("assessment").update({ type: "QCM" }).eq("id", assessmentId);
  }
  refresh(moduleId, assessmentId);
  redirect(path(moduleId, assessmentId));
}

function readConfig(formData: FormData): QuizConfig {
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const duration = str("durationMinutes");
  const mode = str("showResults");
  return {
    title: str("title"),
    instructions: str("instructions"),
    durationMinutes: duration === "" ? null : Number(duration),
    opensAt: parisLocalToIso(str("opensAt")),
    closesAt: parisLocalToIso(str("closesAt")),
    showResults: (RESULTS_MODES as readonly string[]).includes(mode)
      ? (mode as ResultsMode)
      : "after_close",
    shuffleQuestions: formData.get("shuffleQuestions") === "on",
    shuffleChoices: formData.get("shuffleChoices") === "on",
    rules: rulesFromJson(str("rulesJson")),
  };
}

export async function saveQuizConfig(
  moduleId: string,
  assessmentId: string,
  _prev: QuizActionState,
  formData: FormData,
): Promise<QuizActionState> {
  const config = readConfig(formData);
  const errors = validateQuizConfig(config);
  if (errors.length) return { errors };

  const quiz = await getQuizByAssessment(assessmentId);
  if (!quiz) return { errors: ["Ce QCM n’existe plus."] };
  const supabase = await createClient();
  const draft = quiz.status === "draft";

  const { error } = await supabase
    .from("quiz")
    .update({
      title: config.title,
      instructions: config.instructions,
      duration_minutes: config.durationMinutes,
      opens_at: config.opensAt,
      closes_at: config.closesAt,
      show_results: config.showResults,
      shuffle_questions: config.shuffleQuestions,
      shuffle_choices: config.shuffleChoices,
    })
    .eq("id", quiz.id);
  if (error)
    return { errors: [`La configuration n’a pas pu être enregistrée (${error.message}).`] };

  // Les règles ne changent plus une fois le QCM publié : des tirages existent peut-être déjà.
  if (draft) {
    await supabase.from("quiz_draw_rule").delete().eq("quiz_id", quiz.id);
    const { error: ruleError } = await supabase.from("quiz_draw_rule").insert(
      config.rules.map((r, position) => ({
        quiz_id: quiz.id,
        position,
        category: r.category,
        tags: r.tags,
        types: r.types,
        count: r.count,
        points_each: r.pointsEach,
      })),
    );
    if (ruleError)
      return { errors: [`Les règles n’ont pas pu être enregistrées (${ruleError.message}).`] };
    // Barème = total des points du tirage, identique pour toutes et tous.
    await supabase
      .from("assessment")
      .update({ max_score: quizTotalPoints(config.rules) })
      .eq("id", assessmentId);
  }
  refresh(moduleId, assessmentId);
  return { saved: true };
}

/** Publie le QCM : la banque doit pouvoir honorer chaque règle. */
export async function publishQuiz(moduleId: string, assessmentId: string): Promise<void> {
  const quiz = await getQuizByAssessment(assessmentId);
  if (!quiz) redirect(path(moduleId, assessmentId));
  const problems = [
    ...validateQuizConfig({
      title: quiz.title,
      instructions: quiz.instructions,
      durationMinutes: quiz.duration_minutes,
      opensAt: quiz.opens_at,
      closesAt: quiz.closes_at,
      showResults: quiz.show_results,
      shuffleQuestions: quiz.shuffle_questions,
      shuffleChoices: quiz.shuffle_choices,
      rules: quiz.rules,
    }),
    ...shortages(await loadBank(), quiz.rules),
  ];
  if (problems.length)
    redirect(
      `${path(moduleId, assessmentId)}?error=${encodeURIComponent(`Publication impossible : ${problems.join(" ")}`)}`,
    );
  const supabase = await createClient();
  await supabase.from("quiz").update({ status: "published" }).eq("id", quiz.id);
  refresh(moduleId, assessmentId);
  redirect(path(moduleId, assessmentId));
}

/** Repasse un QCM publié en brouillon, tant que personne n'a commencé. */
export async function unpublishQuiz(moduleId: string, assessmentId: string): Promise<void> {
  const quiz = await getQuizByAssessment(assessmentId);
  if (!quiz) redirect(path(moduleId, assessmentId));
  const supabase = await createClient();
  const { count } = await supabase
    .from("quiz_attempt")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quiz.id)
    .neq("status", "ready");
  if (count)
    redirect(
      `${path(moduleId, assessmentId)}?error=${encodeURIComponent(`${count} copie${count > 1 ? "s sont" : " est"} déjà commencée${count > 1 ? "s" : ""} : le QCM ne peut plus repasser en brouillon.`)}`,
    );
  await supabase.from("quiz").update({ status: "draft" }).eq("id", quiz.id);
  refresh(moduleId, assessmentId);
  redirect(path(moduleId, assessmentId));
}

/**
 * Clôture : les copies encore en cours sont rendues telles qu'elles sont enregistrées (rien n'est perdu),
 * puis tout est corrigé. Le corrigé devient visible quand tout le monde a clôturé (rattrapages compris).
 */
export async function closeQuiz(moduleId: string, assessmentId: string): Promise<void> {
  const quiz = await getQuizByAssessment(assessmentId);
  if (!quiz) redirect(path(moduleId, assessmentId));
  const supabase = await createClient();
  await supabase
    .from("quiz_attempt")
    .update({ status: "submitted", submitted_at: new Date().toISOString(), submitted_late: false })
    .eq("quiz_id", quiz.id)
    .eq("status", "in_progress");
  const { data: attempts } = await supabase
    .from("quiz_attempt")
    .select("id")
    .eq("quiz_id", quiz.id)
    .eq("status", "submitted");
  for (const a of attempts ?? []) await regradeAttempt(supabase, a.id);
  await supabase.from("quiz").update({ status: "closed" }).eq("id", quiz.id);
  refresh(moduleId, assessmentId);
  redirect(path(moduleId, assessmentId));
}

// ── Liens personnels ────────────────────────────────────────────────────────

export interface GeneratedLink {
  attemptId: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  url: string;
  emailed: boolean;
}

export interface LinksState {
  errors?: string[];
  links?: GeneratedLink[];
  notices?: string[];
  emailReport?: string;
}

async function sendInvite(
  to: string,
  ctx: InviteContext,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { RESEND_API_KEY, RESEND_FROM } = serverEnv();
  if (!RESEND_API_KEY || !RESEND_FROM)
    return {
      ok: false,
      reason: "l’envoi d’e-mails n’est pas configuré (RESEND_API_KEY et RESEND_FROM manquent)",
    };
  const { error } = await new Resend(RESEND_API_KEY).emails.send({
    from: RESEND_FROM,
    to: [to],
    subject: inviteSubject(ctx.quizTitle),
    text: inviteText(ctx),
  });
  return error ? { ok: false, reason: error.message } : { ok: true };
}

/**
 * Prépare le tirage et le lien personnel de chaque étudiant·e qui n'en a pas encore. Le lien en clair
 * n'existe que dans la réponse (seul son haché est stocké) : Marie le télécharge en CSV ou l'envoie par
 * e-mail tout de suite ; pour un lien perdu, « Nouveau lien ».
 */
export async function prepareLinks(
  moduleId: string,
  assessmentId: string,
  _prev: LinksState,
  formData: FormData,
): Promise<LinksState> {
  const send = formData.get("send") === "on";
  const [quiz, assessment, bank] = await Promise.all([
    getQuizByAssessment(assessmentId),
    getAssessment(assessmentId),
    loadBank(),
  ]);
  if (!quiz || !assessment || assessment.module_id !== moduleId)
    return { errors: ["Ce QCM n’existe plus."] };
  if (quiz.rules.length === 0) return { errors: ["Ajoute d’abord au moins une règle de tirage."] };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { errors: ["Ta session a expiré : reconnecte-toi puis réessaie."] };

  const { eligible: students } = await passingStudents(
    assessmentId,
    gradingTargets(false, assessment.groups).flatMap((t) => t.students),
  );
  const { data: existing } = await supabase
    .from("quiz_attempt")
    .select("student_id")
    .eq("quiz_id", quiz.id);
  const have = new Set((existing ?? []).map((a) => a.student_id));
  const todo = students.filter((s) => !have.has(s.id));
  if (todo.length === 0)
    return {
      errors: [
        "Tout le monde a déjà un lien. Pour un lien perdu, utilise « Nouveau lien » sur sa ligne.",
      ],
    };

  // Rattrapage : questions déjà vues à la première passation, à éviter.
  const seenByStudent = new Map<string, Set<string>>();
  if (assessment.makeup_of_id) {
    const { data: origin } = await supabase
      .from("quiz")
      .select("id")
      .eq("assessment_id", assessment.makeup_of_id)
      .maybeSingle();
    if (origin) {
      const { data: prior } = await supabase
        .from("quiz_attempt")
        .select("student_id, drawn")
        .eq("quiz_id", origin.id);
      for (const p of prior ?? [])
        seenByStudent.set(
          p.student_id,
          new Set((p.drawn as unknown as DrawnQuestion[]).map((q) => q.question_id)),
        );
    }
  }

  // Tous les tirages d'abord (en mémoire) : si la banque est trop petite, rien n'est créé à moitié.
  const drafts = [];
  try {
    for (const s of todo) {
      const seed = randomUUID();
      const draw = drawQuiz({
        rules: quiz.rules,
        bank,
        seed,
        shuffleQuestions: quiz.shuffle_questions,
        shuffleChoices: quiz.shuffle_choices,
        seen: seenByStudent.get(s.id),
      });
      drafts.push({ student: s, seed, draw, token: generateToken() });
    }
  } catch (e) {
    if (e instanceof DrawError) return { errors: [`Tirage impossible : ${e.message}`] };
    throw e;
  }

  const base = clientEnv.NEXT_PUBLIC_APP_URL;
  const links: GeneratedLink[] = [];
  const errors: string[] = [];
  const notices: string[] = [];
  let emailed = 0;
  const notEmailed: string[] = [];

  for (const d of drafts) {
    const { data, error } = await supabase
      .from("quiz_attempt")
      .insert({
        quiz_id: quiz.id,
        student_id: d.student.id,
        token_hash: hashToken(d.token),
        drawn: d.draw.questions as never,
        draw_seed: d.seed,
        question_count: d.draw.questions.length,
        total_points: d.draw.totalPoints,
        reused_count: d.draw.reused,
      })
      .select("id")
      .single();
    const name = `${d.student.first_name} ${d.student.last_name}`;
    if (error || !data) {
      errors.push(`${name} : le lien n’a pas pu être créé (${error?.message}).`);
      continue;
    }
    const notice = reuseNotice(d.draw.reused, d.draw.questions.length);
    if (notice) notices.push(`${name} : ${notice}`);
    const url = quizUrl(base, d.token);
    let mailed = false;
    if (send && d.student.email) {
      const res = await sendInvite(d.student.email, {
        firstName: d.student.first_name,
        quizTitle: quiz.title,
        url,
        opensAt: quiz.opens_at,
        closesAt: quiz.closes_at,
        durationMinutes: quiz.duration_minutes,
      });
      if (res.ok) {
        mailed = true;
        emailed += 1;
        await supabase
          .from("quiz_attempt")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", data.id);
      } else notEmailed.push(`${name} (${res.reason})`);
    } else if (send) notEmailed.push(`${name} (pas d’adresse e-mail)`);
    links.push({
      attemptId: data.id,
      name,
      firstName: d.student.first_name,
      lastName: d.student.last_name,
      email: d.student.email,
      url,
      emailed: mailed,
    });
  }
  refresh(moduleId, assessmentId);
  return {
    errors: errors.length ? errors : undefined,
    links,
    notices,
    emailReport: send
      ? `${emailed} e-mail${emailed > 1 ? "s" : ""} envoyé${emailed > 1 ? "s" : ""}.${notEmailed.length ? ` Non envoyé : ${notEmailed.join(", ")}. Utilise le CSV pour ces personnes.` : ""}`
      : undefined,
  };
}

/** Nouveau lien pour une copie pas encore rendue (l'ancien est révoqué). */
export async function regenerateLink(
  moduleId: string,
  assessmentId: string,
  attemptId: string,
  _prev: LinksState,
  formData: FormData,
): Promise<LinksState> {
  const send = formData.get("send") === "on";
  const quiz = await getQuizByAssessment(assessmentId);
  const supabase = await createClient();
  const { data: attempt } = await supabase
    .from("quiz_attempt")
    .select("id, status, student:student_id(first_name, last_name, email)")
    .eq("id", attemptId)
    .maybeSingle();
  if (!quiz || !attempt) return { errors: ["Cette copie n’existe plus."] };
  if (attempt.status === "submitted")
    return {
      errors: [
        "Cette copie est déjà rendue : un nouveau lien n’aurait rien à ouvrir. Rouvre-la d’abord si besoin.",
      ],
    };

  const student = attempt.student as unknown as {
    first_name: string;
    last_name: string;
    email: string | null;
  };
  const token = generateToken();
  const { error } = await supabase
    .from("quiz_attempt")
    .update({ token_hash: hashToken(token), revoked_at: null, sent_at: null, used_at: null })
    .eq("id", attemptId);
  if (error) return { errors: [`Le nouveau lien n’a pas pu être créé (${error.message}).`] };

  const url = quizUrl(clientEnv.NEXT_PUBLIC_APP_URL, token);
  let emailed = false;
  let emailReport: string | undefined;
  if (send) {
    if (!student.email)
      emailReport = `${student.first_name} n’a pas d’adresse e-mail : utilise le CSV ou copie le lien.`;
    else {
      const res = await sendInvite(student.email, {
        firstName: student.first_name,
        quizTitle: quiz.title,
        url,
        opensAt: quiz.opens_at,
        closesAt: quiz.closes_at,
        durationMinutes: quiz.duration_minutes,
      });
      emailed = res.ok;
      emailReport = res.ok ? "E-mail envoyé." : `E-mail non envoyé : ${res.reason}.`;
      if (res.ok)
        await supabase
          .from("quiz_attempt")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", attemptId);
    }
  }
  refresh(moduleId, assessmentId);
  return {
    links: [
      {
        attemptId,
        name: `${student.first_name} ${student.last_name}`,
        firstName: student.first_name,
        lastName: student.last_name,
        email: student.email,
        url,
        emailed,
      },
    ],
    emailReport,
  };
}

// ── Actions sur une copie ───────────────────────────────────────────────────

async function withAttempt(
  moduleId: string,
  assessmentId: string,
  run: (supabase: Awaited<ReturnType<typeof createClient>>) => Promise<string | void>,
): Promise<void> {
  const supabase = await createClient();
  const error = await run(supabase);
  refresh(moduleId, assessmentId);
  redirect(
    error
      ? `${path(moduleId, assessmentId)}?error=${encodeURIComponent(error)}`
      : path(moduleId, assessmentId),
  );
}

export async function revokeLink(moduleId: string, assessmentId: string, attemptId: string) {
  await withAttempt(moduleId, assessmentId, async (supabase) => {
    const { error } = await supabase
      .from("quiz_attempt")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", attemptId);
    if (error) return `Le lien n’a pas pu être révoqué (${error.message}).`;
  });
}

export async function setTimeMultiplier(
  moduleId: string,
  assessmentId: string,
  attemptId: string,
  formData: FormData,
) {
  await withAttempt(moduleId, assessmentId, async (supabase) => {
    const value = Number(String(formData.get("multiplier") ?? "").replace(",", "."));
    if (!Number.isFinite(value) || value < 1 || value > 3)
      return "Le tiers-temps est un multiplicateur entre 1 et 3 (1,33 pour un tiers de temps en plus).";
    const { error } = await supabase
      .from("quiz_attempt")
      .update({ time_multiplier: value })
      .eq("id", attemptId);
    if (error) return `Le tiers-temps n’a pas pu être enregistré (${error.message}).`;
  });
}

/** Refait le tirage d'une copie pas encore commencée. */
export async function redrawAttempt(moduleId: string, assessmentId: string, attemptId: string) {
  await withAttempt(moduleId, assessmentId, async (supabase) => {
    const [quiz, bank] = await Promise.all([getQuizByAssessment(assessmentId), loadBank()]);
    const { data: attempt } = await supabase
      .from("quiz_attempt")
      .select("status")
      .eq("id", attemptId)
      .maybeSingle();
    if (!quiz || !attempt) return "Cette copie n’existe plus.";
    if (attempt.status !== "ready")
      return "Le tirage ne peut être refait que pour une copie pas encore commencée.";
    try {
      const seed = randomUUID();
      const draw = drawQuiz({
        rules: quiz.rules,
        bank,
        seed,
        shuffleQuestions: quiz.shuffle_questions,
        shuffleChoices: quiz.shuffle_choices,
      });
      const { error } = await supabase
        .from("quiz_attempt")
        .update({
          drawn: draw.questions as never,
          draw_seed: seed,
          question_count: draw.questions.length,
          total_points: draw.totalPoints,
          reused_count: 0,
        })
        .eq("id", attemptId);
      if (error) return `Le tirage n’a pas pu être refait (${error.message}).`;
    } catch (e) {
      if (e instanceof DrawError) return `Tirage impossible : ${e.message}`;
      throw e;
    }
  });
}

/** Rend la copie enregistrée d'un·e étudiant·e (connexion perdue, fin de séance). */
export async function forceSubmit(moduleId: string, assessmentId: string, attemptId: string) {
  await withAttempt(moduleId, assessmentId, async (supabase) => {
    const { error } = await supabase
      .from("quiz_attempt")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        submitted_late: false,
      })
      .eq("id", attemptId)
      .eq("status", "in_progress");
    if (error) return `La copie n’a pas pu être rendue (${error.message}).`;
    const result = await regradeAttempt(supabase, attemptId);
    if (result.error) return result.error;
  });
}

/** Rouvre une copie rendue : nouveau délai, la note est retirée jusqu'à la nouvelle remise. */
export async function reopenAttempt(
  moduleId: string,
  assessmentId: string,
  attemptId: string,
  formData: FormData,
) {
  await withAttempt(moduleId, assessmentId, async (supabase) => {
    const minutes = Number(formData.get("minutes") ?? 15);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 480)
      return "Le délai de réouverture est entre 1 et 480 minutes.";
    const { data: attempt } = await supabase
      .from("quiz_attempt")
      .select("student_id, quiz:quiz_id(status)")
      .eq("id", attemptId)
      .maybeSingle();
    if (!attempt) return "Cette copie n’existe plus.";
    if ((attempt.quiz as unknown as { status: string }).status === "closed")
      return "Le QCM est clôturé : une copie ne peut plus être rouverte. Prépare plutôt un rattrapage.";
    const { error } = await supabase
      .from("quiz_attempt")
      .update({
        status: "in_progress",
        submitted_at: null,
        submitted_late: false,
        late_answers: null,
        deadline_at: new Date(Date.now() + minutes * 60_000).toISOString(),
        review_complete: false,
        result: null,
        score: null,
        auto_score: null,
      })
      .eq("id", attemptId);
    if (error) return `La copie n’a pas pu être rouverte (${error.message}).`;
    await supabase
      .from("grade")
      .update({ value: null })
      .eq("student_id", attempt.student_id)
      .eq("assessment_id", assessmentId);
  });
}

/** Prend en compte ce que l'étudiant·e a modifié après l'heure limite. */
export async function acceptLateAnswers(moduleId: string, assessmentId: string, attemptId: string) {
  await withAttempt(moduleId, assessmentId, async (supabase) => {
    const { data: attempt } = await supabase
      .from("quiz_attempt")
      .select("late_answers")
      .eq("id", attemptId)
      .maybeSingle();
    if (!attempt?.late_answers) return "Il n’y a pas de modification tardive à prendre en compte.";
    const { error } = await supabase
      .from("quiz_attempt")
      .update({ answers: attempt.late_answers, late_answers: null })
      .eq("id", attemptId);
    if (error) return `Les modifications n’ont pas pu être prises en compte (${error.message}).`;
    const result = await regradeAttempt(supabase, attemptId);
    if (result.error) return result.error;
  });
}

/** Points donnés aux réponses libres : `score_<position>` en points, bornés au barème de la question. */
export async function saveManualScores(
  moduleId: string,
  assessmentId: string,
  attemptId: string,
  formData: FormData,
) {
  await withAttempt(moduleId, assessmentId, async (supabase) => {
    const manual: Record<string, number> = {};
    for (const [key, value] of formData.entries()) {
      const m = /^score_(\d{1,3})$/.exec(key);
      if (!m || typeof value !== "string" || value.trim() === "") continue;
      const n = Number(value.replace(",", "."));
      if (!Number.isFinite(n) || n < 0)
        return `Les points de la question ${m[1]} doivent être un nombre positif ou nul.`;
      manual[m[1]] = n;
    }
    const { error } = await supabase
      .from("quiz_attempt")
      .update({ manual_scores: manual })
      .eq("id", attemptId);
    if (error) return `Les points n’ont pas pu être enregistrés (${error.message}).`;
    const result = await regradeAttempt(supabase, attemptId);
    if (result.error) return result.error;
  });
}
