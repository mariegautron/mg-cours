-- Doublons, lot 1 (D1 et D6). Purement additif : aucune colonne ni table supprimée, aucune note
-- modifiée. Rejouable (chaque insertion vérifie qu'elle n'a pas déjà eu lieu).
-- À lancer APRÈS avoir lu les chiffres de docs/doublons/lot1-controle.sql (requêtes 1 à 4) et
-- seulement avec l'accord d'Arnaud.
--
-- D1 — La présence vit sur la copie (grade.attendance, group_grade_member) et nulle part ailleurs.
-- L'appli ne lit plus oral_space.attendance (la colonne reste, en archive). Quand l'espace et la
-- copie diffèrent, la COPIE est gardée : rien à écrire. Seul cas recopié : une présence posée dans
-- l'espace alors qu'aucune copie n'existe encore (oral pas encore noté). On crée la copie, SANS
-- note (value null), pour porter la présence.
--
-- D6 — Les anciens rendus (project_submission) sont recopiés dans submission_item (« Rendus
-- déposés ») quand ils ont un lien. Une ligne sans lien (seulement « reçu le ») ne peut pas devenir
-- un rendu : elle reste dans project_submission et est listée par la requête de contrôle 4.

-- ── D1 : note individuelle, présence posée dans l'espace, pas de copie ─────────────────────────
insert into public.grade (owner_id, assessment_id, student_id, student_group_id, is_group_grade,
                          value, attendance, scores)
select a.owner_id, a.id, os.subject_id, null, false, null,
       (os.attendance ->> os.subject_id::text)::public.attendance_status, '{}'::jsonb
from public.oral_space os
join public.assessment a on a.id = os.assessment_id
where not a.is_group_grade
  and os.attendance ->> os.subject_id::text in ('present', 'absent_unexcused', 'absent_excused')
  and exists (select 1 from public.student s where s.id = os.subject_id)
  and not exists (
    select 1 from public.grade g where g.assessment_id = a.id and g.student_id = os.subject_id
  );

-- ── D1 : note de groupe, présences posées dans l'espace, pas de copie ──────────────────────────
-- 1) la copie du groupe, sans note
insert into public.grade (owner_id, assessment_id, student_id, student_group_id, is_group_grade,
                          value, attendance, scores)
select a.owner_id, a.id, null, os.subject_id, true, null, 'present', '{}'::jsonb
from public.oral_space os
join public.assessment a on a.id = os.assessment_id
where a.is_group_grade
  and exists (select 1 from public.student_group sg where sg.id = os.subject_id)
  and exists (
    select 1 from jsonb_each_text(os.attendance) e
    where e.value in ('present', 'absent_unexcused', 'absent_excused')
  )
  and not exists (
    select 1 from public.grade g where g.assessment_id = a.id and g.student_group_id = os.subject_id
  );

-- 2) une ligne par membre absent·e (présent·e = pas de ligne), seulement pour les copies créées
--    ci-dessus (copie sans note et sans aucune ligne de membre)
insert into public.group_grade_member (owner_id, grade_id, student_id, attendance,
                                       individual_factor, justification)
select g.owner_id, g.id, e.key::uuid, e.value::public.attendance_status, 1, null
from public.oral_space os
join public.assessment a on a.id = os.assessment_id and a.is_group_grade
join public.grade g on g.assessment_id = a.id and g.student_group_id = os.subject_id
cross join lateral jsonb_each_text(os.attendance) e
where g.value is null
  and g.scores = '{}'::jsonb
  and e.value in ('absent_unexcused', 'absent_excused')
  and exists (
    select 1 from public.group_member gm
    where gm.student_group_id = os.subject_id and gm.student_id::text = e.key
  )
  and not exists (select 1 from public.group_grade_member x where x.grade_id = g.id);

-- ── D6 : anciens rendus avec un lien → « Rendus déposés » ──────────────────────────────────────
insert into public.submission_item (owner_id, assessment_id, group_id, student_id, kind, url,
                                    label, added_by, submitted_at, teacher_seen_at)
select ps.owner_id, ps.assessment_id, ps.student_group_id, null, 'link', ps.url,
       'Rendu (ancien suivi, reçu le ' || to_char(ps.received_on, 'DD/MM/YYYY') || ')',
       'teacher', ps.received_on::timestamptz, now()
from public.project_submission ps
where coalesce(btrim(ps.url), '') <> ''
  and not exists (
    select 1 from public.submission_item si
    where si.assessment_id = ps.assessment_id
      and si.group_id = ps.student_group_id
      and si.url = ps.url
  );
