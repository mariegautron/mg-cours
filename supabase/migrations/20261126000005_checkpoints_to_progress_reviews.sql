-- Anciens « Jalons » (suivi non noté P1…P6) → points d'étape non notés (accord d'Arnaud,
-- 10 nov. 2026 : « rien ne doit être perdu »). Relevé fait avant : seul « Fil Rouge FullStack :
-- Cadrage » a des jalons (6), sans aucune ligne étudiant·e, statut, retour, note ni fichier.
-- On reprend donc chaque jalon comme un point d'étape du même module (titre, date, attendus).
-- Rejouable : un jalon déjà repris (même module, même titre) n'est pas recréé.
-- Les tables `checkpoint` / `checkpoint_result` sont GARDÉES (suppression après feu vert).

insert into public.assessment (
  owner_id, module_id, title, type, exam_kind, date, deliverable_md, prep_status,
  is_group_grade, review_graded
)
select
  c.owner_id,
  c.module_id,
  case when c.code <> '' and position(c.code in c.title) = 0 then c.code || ' · ' || c.title else c.title end,
  'Point d’étape',
  'files',
  c.due_date,
  nullif(c.expected_md, ''),
  'to_build',
  true,
  false
from public.checkpoint c
where not exists (
  select 1 from public.assessment a
  where a.module_id = c.module_id
    and a.title = case when c.code <> '' and position(c.code in c.title) = 0 then c.code || ' · ' || c.title else c.title end
)
order by c.module_id, c.position;
