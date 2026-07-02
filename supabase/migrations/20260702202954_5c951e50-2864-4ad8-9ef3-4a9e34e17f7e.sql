
-- =========================================================
-- ROLES
-- =========================================================
create type public.app_role as enum ('admin', 'member', 'viewer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  org_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles: read own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "user_roles: read own" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- auto profile + first user is admin, else member
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare user_count int;
begin
  insert into public.profiles (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
    on conflict (id) do nothing;
  select count(*) into user_count from auth.users;
  if user_count <= 1 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'member') on conflict do nothing;
  end if;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

-- =========================================================
-- MASTER KEY (service-role only)
-- =========================================================
create table public.vault_master_key (
  id int primary key default 1,
  key_b64 text not null,
  created_at timestamptz not null default now(),
  check (id = 1)
);
grant all on public.vault_master_key to service_role;
alter table public.vault_master_key enable row level security;
-- no policies -> no authenticated access
insert into public.vault_master_key (id, key_b64)
values (1, encode(gen_random_bytes(32), 'base64'));

-- =========================================================
-- ENVIRONMENTS
-- =========================================================
create type public.env_kind as enum ('dev', 'staging', 'prod');

create table public.environments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind public.env_kind not null default 'dev',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.environments to authenticated;
grant all on public.environments to service_role;
alter table public.environments enable row level security;
create policy "env: owner or admin read" on public.environments for select to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "env: owner write" on public.environments for insert to authenticated
  with check (owner_id = auth.uid());
create policy "env: owner update" on public.environments for update to authenticated
  using (owner_id = auth.uid());
create policy "env: owner delete" on public.environments for delete to authenticated
  using (owner_id = auth.uid());

-- =========================================================
-- AWS CREDENTIAL VAULT (envelope encrypted)
-- =========================================================
create type public.credential_mode as enum ('static_keys', 'assume_role');

create table public.aws_credentials (
  id uuid primary key default gen_random_uuid(),
  environment_id uuid not null references public.environments(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  mode public.credential_mode not null default 'static_keys',
  region text not null default 'us-east-1',
  access_key_id_masked text,           -- e.g. AKIA****WXYZ, safe to display
  role_arn text,                        -- for assume_role
  external_id_masked text,
  session_duration_seconds int default 3600,
  -- Envelope encryption:
  -- payload_ciphertext: AES-256-GCM(payload_plaintext, dek)
  -- dek_wrapped: AES-256-GCM(dek, master_key)
  payload_ciphertext text not null,
  payload_iv text not null,
  payload_tag text,
  dek_wrapped text not null,
  dek_iv text not null,
  dek_tag text,
  last_rotated_at timestamptz not null default now(),
  last_verified_at timestamptz,
  verification_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.aws_credentials to authenticated;
grant all on public.aws_credentials to service_role;
alter table public.aws_credentials enable row level security;
create policy "cred: owner read" on public.aws_credentials for select to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "cred: owner insert" on public.aws_credentials for insert to authenticated
  with check (owner_id = auth.uid());
create policy "cred: owner update" on public.aws_credentials for update to authenticated
  using (owner_id = auth.uid());
create policy "cred: owner delete" on public.aws_credentials for delete to authenticated
  using (owner_id = auth.uid());

-- =========================================================
-- DETECTION RULES
-- =========================================================
create type public.rule_kind as enum (
  'prompt_injection','iam_policy_injection','schema_poisoning',
  'secret_leakage','exfil_pattern','custom_regex','semantic_diff'
);
create type public.severity as enum ('low','medium','high','critical');

create table public.detection_rules (
  id uuid primary key default gen_random_uuid(),
  environment_id uuid not null references public.environments(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind public.rule_kind not null,
  name text not null,
  description text,
  enabled boolean not null default true,
  severity public.severity not null default 'medium',
  pattern text,
  action text not null default 'block', -- allow | flag | block
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.detection_rules to authenticated;
grant all on public.detection_rules to service_role;
alter table public.detection_rules enable row level security;
create policy "rule: owner read" on public.detection_rules for select to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "rule: owner write" on public.detection_rules for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- =========================================================
-- INTERCEPTS (proxy event log)
-- =========================================================
create type public.verdict as enum ('allow','flag','block');

create table public.intercepts (
  id uuid primary key default gen_random_uuid(),
  environment_id uuid not null references public.environments(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_service text not null,   -- e.g. lambda
  target_service text not null,   -- e.g. s3
  action text,                    -- e.g. PutObject
  verdict public.verdict not null,
  severity public.severity not null default 'low',
  rule_id uuid references public.detection_rules(id) on delete set null,
  reason text,
  diff_score numeric,             -- 0..1
  expected_summary text,
  actual_summary text,
  payload_preview text,
  created_at timestamptz not null default now()
);
create index intercepts_env_time on public.intercepts (environment_id, created_at desc);
grant select, insert, delete on public.intercepts to authenticated;
grant all on public.intercepts to service_role;
alter table public.intercepts enable row level security;
create policy "intercept: owner read" on public.intercepts for select to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "intercept: owner insert" on public.intercepts for insert to authenticated
  with check (owner_id = auth.uid());
create policy "intercept: owner delete" on public.intercepts for delete to authenticated
  using (owner_id = auth.uid());

alter publication supabase_realtime add table public.intercepts;

-- =========================================================
-- AUDIT TRAIL (append-only, hash-chained)
-- =========================================================
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  environment_id uuid references public.environments(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  prev_hash text,
  entry_hash text not null,
  created_at timestamptz not null default now()
);
create index audit_log_time on public.audit_log (created_at desc);
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "audit: actor or admin read" on public.audit_log for select to authenticated
  using (actor_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
-- no insert/update/delete policies -> only service role can write via server functions
