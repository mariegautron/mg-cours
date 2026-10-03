-- US-130 — Lien partageable de la frise du module (vue étudiante, sans compte).
--
-- Une ligne par lien : jeton aléatoire de 256 bits dont SEUL le haché SHA-256 est stocké, et
-- l'INSTANTANÉ de la frise (`payload`, jsonb) figé à la publication : nom du module, séances
-- (numéro, date, demi-journée) et jalons (titre, séance, type de note). JAMAIS d'étudiant·e, de
-- note, de ressource, de carnet ni de montant. La page publique ne lit aucune autre table.
--
-- SÉCURITÉ (même modèle que le QCM et les résultats) :
--  · aucun accès direct de `anon` à la table : droits retirés + RLS sans politique anonyme ;
--  · l'anonyme n'a accès qu'à UNE fonction `security definer`, `mg_module_view`, qui reçoit le
--    HACHÉ du jeton et ne renvoie que l'instantané de ce lien (et compte la consultation) ;
--  · lien révoqué ou haché inconnu : « invalid », rien d'autre.
-- Nouvelle table : sans elle, le lien est indisponible, la frise projetée reste.

create table public.module_share_link (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null references public.module (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  payload jsonb not null,
  published_at timestamptz not null default now(),
  revoked_at timestamptz,
  first_viewed_at timestamptz,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un seul lien actif par module.
create unique index module_share_link_active_idx
  on public.module_share_link (module_id) where revoked_at is null;

select public.mg_apply_conventions(array['module_share_link']);

revoke all on public.module_share_link from anon;

create function public.mg_module_view(p_token_hash text, p_count boolean default true)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  l public.module_share_link%rowtype;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into l from public.module_share_link where token_hash = p_token_hash and revoked_at is null;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  if coalesce(p_count, true) then
    update public.module_share_link
      set view_count = view_count + 1,
          first_viewed_at = coalesce(first_viewed_at, now())
      where id = l.id;
  end if;
  return jsonb_build_object('status', 'ok', 'payload', l.payload, 'published_at', l.published_at);
end;
$$;

revoke all on function public.mg_module_view(text, boolean) from public, anon, authenticated;
grant execute on function public.mg_module_view(text, boolean) to anon;
