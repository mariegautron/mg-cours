-- Suppression des anciens « Jalons » (tables checkpoint / checkpoint_result), accord d'Arnaud du
-- 10 nov. 2026 « si elles sont vides ». Garde-fou : rien n'est supprimé si une donnée n'a pas
-- son équivalent dans les points d'étape.
--   - checkpoint_result doit être vide (aucun dépôt, statut, retour ou note n'a jamais été saisi) ;
--   - chaque checkpoint doit avoir été repris en évaluation « Point d'étape » du même module
--     (migration 20261126000005, même titre).
-- Sinon : erreur, la migration est annulée en entier. Rejouable (tables déjà supprimées : rien).

do $$
declare
  v_results bigint;
  v_missing bigint;
begin
  if to_regclass('public.checkpoint') is null and to_regclass('public.checkpoint_result') is null then
    return;
  end if;

  if to_regclass('public.checkpoint_result') is not null then
    execute 'select count(*) from public.checkpoint_result' into v_results;
    if v_results > 0 then
      raise exception 'checkpoint_result contient % ligne(s) : rien n''est supprimé.', v_results;
    end if;
  end if;

  if to_regclass('public.checkpoint') is not null then
    execute $q$
      select count(*) from public.checkpoint c
      where not exists (
        select 1 from public.assessment a
        where a.module_id = c.module_id
          and a.title = case when c.code <> '' and position(c.code in c.title) = 0
                             then c.code || ' · ' || c.title else c.title end
      )
    $q$ into v_missing;
    if v_missing > 0 then
      raise exception '% jalon(s) sans point d''étape correspondant : rien n''est supprimé.', v_missing;
    end if;
  end if;

  drop table if exists public.checkpoint_result;
  drop table if exists public.checkpoint;
end;
$$;
