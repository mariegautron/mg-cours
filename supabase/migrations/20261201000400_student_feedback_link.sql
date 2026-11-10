-- Espace étudiant·e : bouton « Donner ton avis (anonyme) ». Depuis son lien personnel, une personne
-- obtient seulement le lien de CLASSE du questionnaire d'avis de son module (le même pour tout le
-- monde) : aucune identité n'est transmise au questionnaire, qui reste anonyme. Purement additif.

create or replace function public.mg_student_feedback_token(p_token_hash text) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_module uuid;
  v_token text;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select module_id into v_module from public.module_student_link
    where token_hash = p_token_hash and revoked_at is null;
  if not found then return null; end if;
  select token into v_token from public.module_feedback_link
    where module_id = v_module and revoked_at is null
    limit 1;
  return v_token;
end;
$$;

revoke all on function public.mg_student_feedback_token(text) from public, anon, authenticated;
grant execute on function public.mg_student_feedback_token(text) to anon;
