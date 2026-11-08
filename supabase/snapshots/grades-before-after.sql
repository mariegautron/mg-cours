-- Relevé des notes à comparer AVANT et APRÈS la migration « oral_space » (et après avoir ouvert chaque
-- oral existant, puis après un brouillon modifié et abandonné). Les deux résultats doivent être
-- identiques au centime. Lecture seule. Enregistre le résultat de chaque relevé dans un fichier et
-- compare-les (diff).
--
--   psql "$DATABASE_URL" -At -F $'\t' -f supabase/snapshots/grades-before-after.sql > avant.tsv

-- 1. Chaque note : valeur, présence, points par critère.
select 'grade', g.assessment_id, coalesce(g.student_group_id, g.student_id), g.value, g.attendance,
       g.scores::text, g.updated_at
from public.grade g
order by g.assessment_id, coalesce(g.student_group_id, g.student_id);

-- 2. Réglages individuels des notes de groupe.
select 'override', m.grade_id, m.student_id, m.attendance, m.individual_factor, m.justification
from public.group_grade_member m
order by m.grade_id, m.student_id;

-- 3. Notes par étudiant·e et par évaluation (base des moyennes pondérées), empreinte globale.
select 'checksum', count(*), coalesce(sum(value), 0), md5(string_agg(g.id::text || ':' || coalesce(g.value::text, 'null'), ',' order by g.id))
from public.grade g;

-- 4. Résultats publiés (liens actifs et instantané publié).
select 'result_link', l.assessment_id, l.student_id, l.published_at, l.revoked_at, md5(l.payload::text)
from public.result_link l
order by l.assessment_id, l.student_id;
