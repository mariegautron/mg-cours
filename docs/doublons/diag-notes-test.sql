-- LECTURE SEULE. Diagnostic des deux incohérences de notes du module « TEST – à supprimer (essais
-- Claude) ». Rien n'est modifié.

-- 1) Les deux évaluations : barème saisi, total de la grille, QCM et mode de correction
select a.title, a.is_group_grade, a.max_score,
       (select coalesce(sum(gc.weight) filter (where not gc.is_bonus), 0)
          from public.grid_criterion gc where gc.grading_grid_id = a.grading_grid_id) as total_grille,
       a.makeup_of_id is not null as est_un_rattrapage,
       q.correction_mode
from public.assessment a
join public.module m on m.id = a.module_id
left join public.quiz q on q.assessment_id = a.id
where m.name = 'TEST – à supprimer (essais Claude)'
  and a.title ilike '%Étude de cas (QCM fictif)%'
order by a.makeup_of_id nulls first;

-- 2) Les copies d'Alpha et de Bravo : note enregistrée, présence, points par critère de la grille
select a.title as evaluation, s.first_name || ' ' || s.last_name as personne,
       g.value as note_enregistree, g.attendance, g.scores as points_par_critere,
       (select coalesce(sum((v.value)::numeric), 0) from jsonb_each_text(g.scores) v) as somme_points_grille
from public.grade g
join public.assessment a on a.id = g.assessment_id
join public.module m on m.id = a.module_id
join public.student s on s.id = g.student_id
where m.name = 'TEST – à supprimer (essais Claude)'
  and a.title ilike '%Étude de cas (QCM fictif)%'
  and (s.first_name ilike 'Alpha%' or s.first_name ilike 'Bravo%' or s.last_name ilike 'Alpha%' or s.last_name ilike 'Bravo%')
order by a.makeup_of_id nulls first, personne;

-- 3) VRAIES notes possiblement touchées par la correction n° 1 : évaluations avec QCM dont une copie
--    a des points de grille ; « avant » = ancien affichage (somme des points de la grille / total de
--    la grille), « apres » = note enregistrée / barème (ce que les moyennes utilisaient déjà).
--    Seules les lignes où « avant » et « apres » diffèrent changent à l'écran, dans « Envoyer les
--    résultats » et le CSV Hyperplanning. Aucune note enregistrée ni aucune moyenne ne change.
with c as (
  select m.name as module, a.title as evaluation, g.value, coalesce(a.max_score, 0) as max_score,
         (select coalesce(sum(gc.weight) filter (where not gc.is_bonus), 0)
            from public.grid_criterion gc where gc.grading_grid_id = a.grading_grid_id) as total_grille,
         (select coalesce(sum((v.value)::numeric), 0) from jsonb_each_text(g.scores) v) as points_grille
  from public.grade g
  join public.assessment a on a.id = g.assessment_id
  join public.module m on m.id = a.module_id
  where exists (select 1 from public.quiz q where q.assessment_id = a.id)
    and g.value is not null
    and g.scores <> '{}'::jsonb
)
select module, evaluation, count(*) as copies,
       count(*) filter (where total_grille > 0 and max_score > 0
         and round(points_grille * 20 / total_grille, 1) <> round(value * 20 / max_score, 1)) as affichage_change
from c
group by module, evaluation
order by module, evaluation;
