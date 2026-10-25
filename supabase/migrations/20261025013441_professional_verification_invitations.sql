create table if not exists public.professional_verification_invitations (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  related_entity_id uuid not null,
  entity_type text not null check (entity_type in ('experience', 'education')),
  token_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  declined_at timestamptz,
  verifier_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint professional_verification_invitation_one_outcome
    check (accepted_at is null or declined_at is null)
);

create index if not exists professional_verification_invitations_candidate_created_idx
  on public.professional_verification_invitations (candidate_id, created_at desc);
create index if not exists professional_verification_invitations_email_idx
  on public.professional_verification_invitations (lower(email));

alter table public.professional_verification_invitations enable row level security;
revoke all on public.professional_verification_invitations from anon, authenticated;
grant all on public.professional_verification_invitations to service_role;

create or replace function public.resolve_professional_verification_invitation(
  p_token_hash text,
  p_verifier_id uuid,
  p_verifier_email text,
  p_decision text
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  invitation public.professional_verification_invitations%rowtype;
  verification_id uuid;
begin
  if p_decision not in ('approve', 'decline') then
    raise exception 'INVALID_DECISION';
  end if;

  select *
    into invitation
    from public.professional_verification_invitations
   where token_hash = p_token_hash
   for update;

  if not found then
    raise exception 'INVITATION_NOT_FOUND';
  end if;

  if invitation.expires_at <= now() then
    raise exception 'INVITATION_EXPIRED';
  end if;

  if invitation.accepted_at is not null or invitation.declined_at is not null then
    raise exception 'INVITATION_ALREADY_USED';
  end if;

  if lower(invitation.email) <> lower(coalesce(p_verifier_email, '')) then
    raise exception 'INVITATION_EMAIL_MISMATCH';
  end if;

  if p_decision = 'approve' then
    insert into public.professional_verifications (
      candidate_id,
      verifier_id,
      related_entity_id,
      status
    ) values (
      invitation.candidate_id,
      p_verifier_id,
      invitation.related_entity_id,
      'approved'
    )
    returning id into verification_id;

    update public.professional_verification_invitations
       set accepted_at = now(), verifier_id = p_verifier_id
     where id = invitation.id;
  else
    update public.professional_verification_invitations
       set declined_at = now(), verifier_id = p_verifier_id
     where id = invitation.id;
  end if;

  return verification_id;
end;
$$;

revoke all on function public.resolve_professional_verification_invitation(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.resolve_professional_verification_invitation(text, uuid, text, text) to service_role;
