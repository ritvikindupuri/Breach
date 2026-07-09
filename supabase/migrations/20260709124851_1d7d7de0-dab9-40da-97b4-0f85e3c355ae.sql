
-- Drop AWS vault tables and enums
DROP TABLE IF EXISTS public.intercepts CASCADE;
DROP TABLE IF EXISTS public.detection_rules CASCADE;
DROP TABLE IF EXISTS public.aws_credentials CASCADE;
DROP TABLE IF EXISTS public.vault_master_key CASCADE;
DROP TYPE IF EXISTS public.credential_mode CASCADE;
DROP TYPE IF EXISTS public.rule_kind CASCADE;
DROP TYPE IF EXISTS public.verdict CASCADE;
DROP TYPE IF EXISTS public.severity CASCADE;

-- Enums
CREATE TYPE public.finding_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.engagement_status AS ENUM ('queued', 'provisioning', 'running', 'complete', 'failed', 'cancelled');
CREATE TYPE public.engagement_verdict AS ENUM ('pending', 'clean', 'issues', 'critical');
CREATE TYPE public.agent_kind AS ENUM ('recon', 'authn', 'injection', 'supply_chain');
CREATE TYPE public.agent_status AS ENUM ('pending', 'running', 'complete', 'failed');
CREATE TYPE public.runner_status AS ENUM ('offline', 'online', 'revoked');
CREATE TYPE public.job_status AS ENUM ('queued', 'claimed', 'complete', 'failed');

-- Shared updated_at trigger fn (reuse if exists)
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- 1) runners
CREATE TABLE public.runners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  environment_id UUID NOT NULL REFERENCES public.environments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  bootstrap_hash TEXT,
  status public.runner_status NOT NULL DEFAULT 'offline',
  last_seen_at TIMESTAMPTZ,
  jobs_completed INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.runners TO authenticated;
GRANT ALL ON public.runners TO service_role;
ALTER TABLE public.runners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runners read own or admin" ON public.runners FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "runners insert own" ON public.runners FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')));
CREATE POLICY "runners update own or admin" ON public.runners FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "runners delete own or admin" ON public.runners FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER runners_updated_at BEFORE UPDATE ON public.runners FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX runners_env_idx ON public.runners(environment_id);

-- 2) engagements
CREATE TABLE public.engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  environment_id UUID NOT NULL REFERENCES public.environments(id) ON DELETE CASCADE,
  runner_id UUID REFERENCES public.runners(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  commit_sha TEXT,
  target_url TEXT,
  status public.engagement_status NOT NULL DEFAULT 'queued',
  verdict public.engagement_verdict NOT NULL DEFAULT 'pending',
  agent_kinds public.agent_kind[] NOT NULL DEFAULT ARRAY['recon','authn','injection','supply_chain']::public.agent_kind[],
  token_usage INT NOT NULL DEFAULT 0,
  summary TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagements TO authenticated;
GRANT ALL ON public.engagements TO service_role;
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "engagements read own or admin" ON public.engagements FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "engagements insert own" ON public.engagements FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')));
CREATE POLICY "engagements update own or admin" ON public.engagements FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "engagements delete own or admin" ON public.engagements FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER engagements_updated_at BEFORE UPDATE ON public.engagements FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX engagements_env_idx ON public.engagements(environment_id);
CREATE INDEX engagements_owner_idx ON public.engagements(owner_id);
CREATE INDEX engagements_status_idx ON public.engagements(status);

-- 3) agent_runs
CREATE TABLE public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.agent_kind NOT NULL,
  status public.agent_status NOT NULL DEFAULT 'pending',
  current_step TEXT,
  step_count INT NOT NULL DEFAULT 0,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_runs TO authenticated;
GRANT ALL ON public.agent_runs TO service_role;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_runs read own or admin" ON public.agent_runs FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "agent_runs modify own or admin" ON public.agent_runs FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER agent_runs_updated_at BEFORE UPDATE ON public.agent_runs FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX agent_runs_engagement_idx ON public.agent_runs(engagement_id);

-- 4) findings
CREATE TABLE public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  agent_run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  severity public.finding_severity NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  remediation TEXT,
  cwe TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.findings TO authenticated;
GRANT ALL ON public.findings TO service_role;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "findings read own or admin" ON public.findings FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "findings insert own" ON public.findings FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "findings delete own or admin" ON public.findings FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX findings_engagement_idx ON public.findings(engagement_id);
CREATE INDEX findings_severity_idx ON public.findings(severity);

-- 5) job_queue
CREATE TABLE public.job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  runner_id UUID REFERENCES public.runners(id) ON DELETE SET NULL,
  environment_id UUID NOT NULL REFERENCES public.environments(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.job_status NOT NULL DEFAULT 'queued',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  claimed_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_queue TO authenticated;
GRANT ALL ON public.job_queue TO service_role;
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_queue read own or admin" ON public.job_queue FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER job_queue_updated_at BEFORE UPDATE ON public.job_queue FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX job_queue_status_idx ON public.job_queue(status);
CREATE INDEX job_queue_runner_idx ON public.job_queue(runner_id);
