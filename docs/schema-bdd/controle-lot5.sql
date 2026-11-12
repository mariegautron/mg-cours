-- Contrôle du lot 5 (assessment.kind). LECTURE SEULE : uniquement des SELECT.
-- AVANT `db push` : la requête 1 liste CHAQUE évaluation avec le kind PROPOSÉ (même expression
-- que la migration 20261212000100) : à relire ligne à ligne. Si une ligne est fausse, ne pas
-- pousser : me dire laquelle et le bon kind.
-- APRÈS : la requête 2 montre le kind enregistré, qui doit être égal au kind proposé.

\pset null '∅'

\echo '== 1. Kind proposé pour chaque évaluation (à relire)'
select m.name as module, m.year, a.title, a.type, a.exam_kind, a.is_group_grade,
       a.is_bonus, (a.makeup_of_id is not null) as rattrapage,
       case
           when btrim(a.type) = 'Note de l''école' then 'school_grade'
           when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '(point d.etape|\metape\M)'
             then 'progress_review'
           when exists (select 1 from public.quiz q
                        where q.assessment_id in (a.id, a.makeup_of_id)
                          and q.correction_mode = 'open_questions')
             or translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ 'questions? ouvertes?'
             or translate(lower(coalesce(a.title, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ 'etude de cas'
             then 'open_questions'
           when a.exam_kind = 'qcm' then 'quiz'
           when a.exam_kind = 'oral' then 'oral'
           when a.exam_kind = 'in_class' then 'in_class'
           when a.exam_kind = 'files' then 'files'
           when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '\m(qcm|quiz)\M' then 'quiz'
           when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '\moral\M' then 'oral'
           when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '(en classe|sur table|\mecrit\M)' then 'in_class'
           when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '\m(rendu|fichiers?|liens?|projet|dossier|depot|specifications?)\M' then 'files'
           else 'other'
         end as kind_propose
from public.assessment a
join public.module m on m.id = a.module_id
order by m.year, m.name, a.title;

\echo '== 1b. Répartition des kinds proposés'
select kind_propose, count(*) from (
  select case
        when btrim(a.type) = 'Note de l''école' then 'school_grade'
        when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '(point d.etape|\metape\M)'
          then 'progress_review'
        when exists (select 1 from public.quiz q
                     where q.assessment_id in (a.id, a.makeup_of_id)
                       and q.correction_mode = 'open_questions')
          or translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ 'questions? ouvertes?'
          or translate(lower(coalesce(a.title, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ 'etude de cas'
          then 'open_questions'
        when a.exam_kind = 'qcm' then 'quiz'
        when a.exam_kind = 'oral' then 'oral'
        when a.exam_kind = 'in_class' then 'in_class'
        when a.exam_kind = 'files' then 'files'
        when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '\m(qcm|quiz)\M' then 'quiz'
        when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '\moral\M' then 'oral'
        when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '(en classe|sur table|\mecrit\M)' then 'in_class'
        when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '\m(rendu|fichiers?|liens?|projet|dossier|depot|specifications?)\M' then 'files'
        else 'other'
      end as kind_propose from public.assessment a
) x group by 1 order by 2 desc;

\echo '== 2. Après : kind enregistré vs proposé (doit être 0 ligne)'
select a.id, a.title, to_jsonb(a) ->> 'kind' as kind_enregistre, case
        when btrim(a.type) = 'Note de l''école' then 'school_grade'
        when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '(point d.etape|\metape\M)'
          then 'progress_review'
        when exists (select 1 from public.quiz q
                     where q.assessment_id in (a.id, a.makeup_of_id)
                       and q.correction_mode = 'open_questions')
          or translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ 'questions? ouvertes?'
          or translate(lower(coalesce(a.title, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ 'etude de cas'
          then 'open_questions'
        when a.exam_kind = 'qcm' then 'quiz'
        when a.exam_kind = 'oral' then 'oral'
        when a.exam_kind = 'in_class' then 'in_class'
        when a.exam_kind = 'files' then 'files'
        when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '\m(qcm|quiz)\M' then 'quiz'
        when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '\moral\M' then 'oral'
        when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '(en classe|sur table|\mecrit\M)' then 'in_class'
        when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '\m(rendu|fichiers?|liens?|projet|dossier|depot|specifications?)\M' then 'files'
        else 'other'
      end as kind_propose
from public.assessment a
where exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'assessment' and column_name = 'kind')
  and (to_jsonb(a) ->> 'kind') is distinct from case
        when btrim(a.type) = 'Note de l''école' then 'school_grade'
        when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '(point d.etape|\metape\M)'
          then 'progress_review'
        when exists (select 1 from public.quiz q
                     where q.assessment_id in (a.id, a.makeup_of_id)
                       and q.correction_mode = 'open_questions')
          or translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ 'questions? ouvertes?'
          or translate(lower(coalesce(a.title, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ 'etude de cas'
          then 'open_questions'
        when a.exam_kind = 'qcm' then 'quiz'
        when a.exam_kind = 'oral' then 'oral'
        when a.exam_kind = 'in_class' then 'in_class'
        when a.exam_kind = 'files' then 'files'
        when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '\m(qcm|quiz)\M' then 'quiz'
        when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '\moral\M' then 'oral'
        when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '(en classe|sur table|\mecrit\M)' then 'in_class'
        when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '\m(rendu|fichiers?|liens?|projet|dossier|depot|specifications?)\M' then 'files'
        else 'other'
      end;

\echo '== Empreinte des notes : nombre et somme par module (doit être identique)'
select m.name as module, m.year,
       count(g.id) filter (where g.value is not null) as nb_notes,
       coalesce(sum(g.value), 0) as somme_notes,
       count(g.id) as nb_copies
from public.module m
left join public.assessment a on a.module_id = m.id
left join public.grade g on g.assessment_id = a.id
group by m.id, m.name, m.year
order by m.year, m.name;
