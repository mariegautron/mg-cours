-- US-147 — Publication des résultats par lien personnel, sans e-mail.
--
-- Une ligne par lien : un jeton aléatoire de 256 bits dont SEUL le haché SHA-256 est stocké, et
-- l'INSTANTANÉ des résultats de cette personne (`payload`, jsonb), figé à la publication : il ne
-- contient que ce que cette personne a le droit de voir (jamais les autres étudiant·es, jamais le
-- carnet). La page publique ne lit donc AUCUNE autre table.
--
-- SÉCURITÉ (même modèle que le QCM, voir docs/SECURITY-QCM.md) :
--  · aucun accès direct de `anon` à la table : droits retirés + RLS sans politique anonyme ;
--  · l'anonyme n'a accès qu'à UNE fonction `security definer`, `mg_result_view`, qui reçoit le
--    HACHÉ du jeton et ne renvoie que l'instantané de ce lien (et compte la consultation) ;
--  · un lien révoqué, ou un haché inconnu, renvoie « invalid » sans rien d'autre.
-- Nouvelle table : sans elle, « Publier les résultats » est indisponible, l'envoi par e-mail reste.

create table public.result_link (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  assessment_id uuid not null references public.assessment (id) on delete cascade,
  student_id uuid not null references public.student (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  -- Instantané des résultats de CETTE personne (note, détail, commentaires, mot personnel).
  payload jsonb not null,
  published_at timestamptz not null default now(),
  revoked_at timestamptz,
  first_viewed_at timestamptz,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un seul lien actif par personne et par évaluation.
create unique index result_link_active_idx
  on public.result_link (assessment_id, student_id) where revoked_at is null;

select public.mg_apply_conventions(array['result_link']);

revoke all on public.result_link from anon;

create function public.mg_result_view(p_token_hash text, p_count boolean default true)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  l public.result_link%rowtype;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into l from public.result_link where token_hash = p_token_hash and revoked_at is null;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  if coalesce(p_count, true) then
    update public.result_link
      set view_count = view_count + 1,
          first_viewed_at = coalesce(first_viewed_at, now())
      where id = l.id;
  end if;
  return jsonb_build_object('status', 'ok', 'payload', l.payload, 'published_at', l.published_at);
end;
$$;

revoke all on function public.mg_result_view(text, boolean) from public, anon, authenticated;
grant execute on function public.mg_result_view(text, boolean) to anon;
