-- LECTURE SEULE. Doublons, lot 1 (D1 présence unique, D6 rendus). À lancer dans l'éditeur SQL
-- Supabase (prod) : requêtes 1 à 5 AVANT la migration 20261203000000_doublons_lot1.sql, puis 2, 4
-- et 5 de nouveau APRÈS. Rien n'est modifié.

-- ── 1) D1 : écarts entre la présence de l'espace (oral / rendu) et celle de la copie ────────────
-- La copie est gardée : la colonne « espace » ne sera plus lue. À montrer à Arnaud.
with space_att as (
  select os.assessment_id, os.subject_id, e.key as student_id, e.value as space_value
  from public.oral_space os
  cross join lateral jsonb_each_text(os.attendance) e
  where e.value <> ''
),
copy_att as (
  select sa.*, a.title, a.is_group_grade, m.name as module,
         case
           when not a.is_group_grade then gi.attendance::text
           when gg.id is null then null
           else coalesce(ggm.attendance::text, 'present')
         end as copy_value
  from space_att sa
  join public.assessment a on a.id = sa.assessment_id
  join public.module m on m.id = a.module_id
  left join public.grade gi
    on not a.is_group_grade and gi.assessment_id = a.id and gi.student_id = sa.subject_id
  left join public.grade gg
    on a.is_group_grade and gg.assessment_id = a.id and gg.student_group_id = sa.subject_id
  left join public.group_grade_member ggm
    on ggm.grade_id = gg.id and ggm.student_id::text = sa.student_id
)
select c.module, c.title as evaluation,
       coalesce(sg.name, '—') as groupe,
       s.first_name || ' ' || s.last_name as personne,
       c.space_value as presence_espace,
       coalesce(c.copy_value, '(pas de copie)') as presence_copie
from copy_att c
left join public.student s on s.id::text = c.student_id
left join public.student_group sg on sg.id = c.subject_id
where c.copy_value is distinct from c.space_value
order by c.module, c.title, groupe, personne;

-- ── 2) D1 : présences posées dans l'espace sans aucune copie (recopiées par la migration) ───────
-- AVANT : le nombre de copies que la migration va créer (sans note). APRÈS : 0.
select count(*) as copies_a_creer
from public.oral_space os
join public.assessment a on a.id = os.assessment_id
where exists (
        select 1 from jsonb_each_text(os.attendance) e
        where e.value in ('present', 'absent_unexcused', 'absent_excused')
      )
  and not exists (
        select 1 from public.grade g
        where g.assessment_id = a.id
          and (g.student_id = os.subject_id or g.student_group_id = os.subject_id)
      );

-- ── 3) D1 : oraux écrits dont SEULE la présence a changé depuis l'écriture ──────────────────────
-- Ils étaient « à réécrire » (hors moyennes) ; la présence ne compte plus pour « à réécrire », leur
-- note écrite redevient visible. Si cette liste n'est pas vide : la montrer à Arnaud.
with s as (
  select os.*,
         (select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
            from jsonb_each(os.letters) where value <> '""'::jsonb) as cur_letters,
         (select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
            from jsonb_each(os.written -> 'letters') where value <> '""'::jsonb) as w_letters,
         (select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
            from jsonb_each(os.attendance) where value <> '""'::jsonb) as cur_att,
         (select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
            from jsonb_each(os.written -> 'attendance') where value <> '""'::jsonb) as w_att
  from public.oral_space os
  where os.written is not null
)
select m.name as module, a.title as evaluation,
       coalesce(sg.name, st.first_name || ' ' || st.last_name) as copie,
       s.w_att as presence_a_l_ecriture, s.cur_att as presence_espace_actuelle
from s
join public.assessment a on a.id = s.assessment_id
join public.module m on m.id = a.module_id
left join public.student_group sg on sg.id = s.subject_id
left join public.student st on st.id = s.subject_id
where s.cur_letters = s.w_letters
  and s.cur_att <> s.w_att
order by module, evaluation, copie;

-- ── 4) D6 : anciens rendus (project_submission) ─────────────────────────────────────────────────
-- a_recopier : AVANT = lignes que la migration va recopier ; APRÈS = 0.
-- sans_lien : « reçu le » sans lien, non recopiables (restent dans la table) : à montrer à Arnaud.
select
  count(*) filter (where coalesce(btrim(ps.url), '') <> '' and not exists (
    select 1 from public.submission_item si
    where si.assessment_id = ps.assessment_id and si.group_id = ps.student_group_id
      and si.url = ps.url)) as a_recopier,
  count(*) filter (where coalesce(btrim(ps.url), '') <> '' and exists (
    select 1 from public.submission_item si
    where si.assessment_id = ps.assessment_id and si.group_id = ps.student_group_id
      and si.url = ps.url)) as deja_dans_rendus_deposes,
  count(*) filter (where coalesce(btrim(ps.url), '') = '') as sans_lien,
  count(*) as total
from public.project_submission ps;

-- Détail des lignes sans lien
select m.name as module, a.title as evaluation, sg.name as groupe, ps.received_on as recu_le
from public.project_submission ps
join public.assessment a on a.id = ps.assessment_id
join public.module m on m.id = a.module_id
join public.student_group sg on sg.id = ps.student_group_id
where coalesce(btrim(ps.url), '') = ''
order by module, evaluation, groupe;

-- ── 5) Empreinte des notes (module SCRUM et tous les autres) : identique AVANT et APRÈS ─────────
-- notes et somme_notes ne doivent pas bouger. Seules peuvent augmenter, et seulement sur les
-- évaluations listées par la requête 2 (copies créées sans note pour porter une présence) :
-- copies, copies_sans_note, absences_individuelles, absences_membres.
select m.name as module, a.title as evaluation,
       count(g.id)                                                  as copies,
       count(g.id) filter (where g.value is null)                   as copies_sans_note,
       count(g.value)                                               as notes,
       coalesce(sum(g.value), 0)                                    as somme_notes,
       count(g.id) filter (where g.attendance <> 'present')         as absences_individuelles,
       (select count(*) from public.group_grade_member x
          join public.grade gx on gx.id = x.grade_id
         where gx.assessment_id = a.id and x.attendance <> 'present') as absences_membres
from public.assessment a
join public.module m on m.id = a.module_id
left join public.grade g on g.assessment_id = a.id
group by m.name, a.id, a.title
order by m.name, a.title;
