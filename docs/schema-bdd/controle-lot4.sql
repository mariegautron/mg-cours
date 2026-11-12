-- Contrôle du lot 4 (réglages de Nantes Ynov Campus). LECTURE SEULE : uniquement des SELECT.
-- AVANT : la requête 1 ne renvoie aucune ligne de réglage (colonnes à ∅).
-- APRÈS : une ligne, avec exactement ×1 / ×3, les 3 paliers, bonus autorisé, keep_group_grade,
-- e-mail vide, 250. La requête 2 doit dire « t » partout. Empreinte identique.

\pset null '∅'

\echo '== 1. Écoles et leur réglage'
select s.name as ecole, ss.id as setting_id, ss.absence_rule, ss.email_template,
       ss.appreciation_max, ss.group_coefficient, ss.individual_coefficient,
       ss.bonus_allowed, ss.note_brackets, ss.created_at
from public.school s
left join public.school_setting ss on ss.school_id = s.id
order by s.name;

\echo '== 2. Les valeurs sont-elles exactement celles de YNOV ? (après : t partout)'
select s.name as ecole,
       ss.group_coefficient = 1 as groupe_x1,
       ss.individual_coefficient = 3 as individuel_x3,
       ss.bonus_allowed as bonus_autorise,
       ss.absence_rule = 'keep_group_grade' as garde_note_groupe,
       ss.note_brackets = '[{"min_hours":4,"max_hours":16,"group":1,"individual":1},{"min_hours":20,"max_hours":48,"group":2,"individual":1},{"min_hours":52,"max_hours":70,"group":3,"individual":2}]'::jsonb as paliers_ynov,
       ss.appreciation_max = 250 as appreciation_250,
       ss.email_template = '' as email_vide
from public.school s
join public.school_setting ss on ss.school_id = s.id
order by s.name;

\echo '== 3. Modules sans école (règles par défaut, message sur la fiche du module)'
select m.name, m.year from public.module m where m.school_id is null order by m.name;

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
