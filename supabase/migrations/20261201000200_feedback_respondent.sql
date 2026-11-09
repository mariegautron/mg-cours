-- Questionnaire d'avis : un même navigateur ne compte qu'une fois. Le navigateur garde un jeton
-- aléatoire (rien qui identifie la personne) ; seul son haché est stocké. Un 2e envoi remplace le
-- premier. Les réponses déjà reçues ne changent pas (colonne nullable).

alter table public.module_feedback add column if not exists respondent_hash text;

create unique index if not exists module_feedback_respondent_idx
  on public.module_feedback (link_id, respondent_hash)
  where respondent_hash is not null;

create or replace function public.mg_feedback_submit(
  p_link_hash text,
  p_answers jsonb,
  p_respondent_hash text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  l public.module_feedback_link%rowtype;
  existing uuid;
begin
  if p_link_hash is null or p_link_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or length(p_answers::text) > 12000 then
    return jsonb_build_object('status', 'bad_answers');
  end if;
  if p_respondent_hash is not null and p_respondent_hash !~ '^[0-9a-f]{64}$' then
    p_respondent_hash := null;
  end if;
  select * into l from public.module_feedback_link where token_hash = p_link_hash and revoked_at is null;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  if p_respondent_hash is not null then
    select id into existing from public.module_feedback
      where link_id = l.id and respondent_hash = p_respondent_hash;
    if found then
      update public.module_feedback set answers = p_answers, updated_at = now() where id = existing;
      return jsonb_build_object('status', 'updated');
    end if;
  end if;
  insert into public.module_feedback (owner_id, module_id, link_id, answers, respondent_hash)
    values (l.owner_id, l.module_id, l.id, p_answers, p_respondent_hash);
  return jsonb_build_object('status', 'ok');
end;
$$;

revoke all on function public.mg_feedback_submit(text, jsonb, text) from public, anon, authenticated;
grant execute on function public.mg_feedback_submit(text, jsonb, text) to anon;
