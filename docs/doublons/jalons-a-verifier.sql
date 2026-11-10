-- LECTURE SEULE : ce qu'il y a dans les anciens Jalons, module par module.
-- À lancer dans l'éditeur SQL Supabase (prod). Ne modifie rien.

-- 1) Jalons par module, avec ce qui a été saisi dessus
select m.name as module,
       c.code, c.title, c.due_date,
       count(r.id)                                              as lignes_etudiant_es,
       count(r.id) filter (where r.status <> 'pending')         as statut_change,
       count(r.id) filter (where r.feedback_md <> '')           as retours_ecrits,
       count(r.id) filter (where r.private_note <> '')          as notes_privees,
       coalesce(sum(jsonb_array_length(r.files)), 0)            as fichiers_deposes
from public.checkpoint c
join public.module m on m.id = c.module_id
left join public.checkpoint_result r on r.checkpoint_id = c.id
group by m.name, c.position, c.code, c.title, c.due_date
order by m.name, c.position;

-- 2) Total général (si tout est à 0 sauf les jalons eux-mêmes : rien de saisi)
select (select count(*) from public.checkpoint)        as jalons,
       (select count(*) from public.checkpoint_result) as lignes_etudiant_es;
