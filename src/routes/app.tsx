import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import {
  listEnvironments,
  createEnvironment,
  deleteEnvironment,
  listCredentials,
  createCredential,
  deleteCredential,
  verifyCredential,
  listRules,
  updateRule,
  listIntercepts,
  simulateIntercept,
  listAudit,
} from "@/lib/aim.functions";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "Liminal — Control Plane" }] }),
  component: AppPage,
});

type Tab = "vault" | "rules" | "intercepts" | "audit";

function AppPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("vault");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) navigate({ to: "/auth" });
      else {
        setUserEmail(data.session.user.email ?? null);
        setReady(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth" });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const envs = useQuery({
    queryKey: ["envs"],
    queryFn: () => listEnvironments(),
    enabled: ready,
  });

  useEffect(() => {
    if (!activeEnvId && envs.data && envs.data.length > 0) {
      setActiveEnvId(envs.data[0].id);
    }
  }, [envs.data, activeEnvId]);

  if (!ready) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar
        email={userEmail}
        envs={envs.data ?? []}
        activeEnvId={activeEnvId}
        onEnvChange={setActiveEnvId}
        onEnvsChanged={() => envs.refetch()}
      />
      {envs.data && envs.data.length === 0 ? (
        <EmptyState onCreated={() => envs.refetch()} />
      ) : activeEnvId ? (
        <>
          <TabBar tab={tab} setTab={setTab} />
          <main className="mx-auto max-w-6xl px-6 pb-24">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab + activeEnvId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                {tab === "vault" && <VaultPanel envId={activeEnvId} />}
                {tab === "rules" && <RulesPanel envId={activeEnvId} />}
                {tab === "intercepts" && <InterceptsPanel envId={activeEnvId} />}
                {tab === "audit" && <AuditPanel />}
              </motion.div>
            </AnimatePresence>
          </main>
        </>
      ) : null}
    </div>
  );
}

/* ─────────────────── TopBar & env switcher ─────────────────── */

function TopBar({
  email,
  envs,
  activeEnvId,
  onEnvChange,
  onEnvsChanged,
}: {
  email: string | null;
  envs: Array<{ id: string; name: string; kind: string }>;
  activeEnvId: string | null;
  onEnvChange: (id: string) => void;
  onEnvsChanged: () => void;
}) {
  const [creating, setCreating] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-4 px-6 text-[13px]">
        <Link to="/" className="flex items-center gap-1.5 font-display tracking-tight">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span>Liminal</span>
        </Link>

        <div className="flex items-center gap-3">
          {envs.length > 0 && (
            <select
              value={activeEnvId ?? ""}
              onChange={(e) => onEnvChange(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-[13px]"
            >
              {envs.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} · {e.kind}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setCreating(true)}
            className="rounded-md border border-border px-2 py-1 text-[13px] hover:bg-foreground/[0.03]"
          >
            + Env
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-foreground/60 md:inline">{email}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-foreground/60 hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </div>

      <AnimatePresence>
        {creating && (
          <CreateEnvModal
            onClose={() => setCreating(false)}
            onCreated={() => {
              setCreating(false);
              onEnvsChanged();
            }}
          />
        )}
      </AnimatePresence>
    </header>
  );
}

function CreateEnvModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"dev" | "staging" | "prod">("dev");
  const [description, setDescription] = useState("");
  const mut = useMutation({
    mutationFn: () => createEnvironment({ data: { name, kind, description } }),
    onSuccess: onCreated,
  });

  return (
    <Modal onClose={onClose} title="New environment">
      <div className="space-y-3">
        <input
          placeholder="Name (e.g. Production)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[14px]"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as never)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[14px]"
        >
          <option value="dev">Dev</option>
          <option value="staging">Staging</option>
          <option value="prod">Prod</option>
        </select>
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[14px]"
        />
        {mut.error && (
          <p className="text-[13px] text-red-600">{(mut.error as Error).message}</p>
        )}
        <button
          disabled={!name || mut.isPending}
          onClick={() => mut.mutate()}
          className="w-full rounded-full bg-foreground px-4 py-2.5 text-[14px] font-medium text-background disabled:opacity-40"
        >
          {mut.isPending ? "Creating…" : "Create environment"}
        </button>
        <p className="pt-1 text-[12px] text-foreground/50">
          A default detection rule set (prompt injection, IAM policy injection, secret
          leakage, schema poisoning, semantic drift) will be seeded automatically.
        </p>
      </div>
    </Modal>
  );
}

/* ─────────────────── Empty state ─────────────────── */

function EmptyState({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto max-w-lg px-6 pt-24 text-center">
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-4xl leading-tight"
      >
        Start with an environment.
      </motion.h2>
      <p className="mt-3 text-foreground/60">
        Environments isolate credentials, rules, and intercepts. Most teams create one per
        AWS account or per stage.
      </p>
      <button
        onClick={() => setOpen(true)}
        className="mt-8 rounded-full bg-foreground px-5 py-2.5 text-[14px] font-medium text-background"
      >
        Create your first environment
      </button>
      <AnimatePresence>
        {open && (
          <CreateEnvModal
            onClose={() => setOpen(false)}
            onCreated={() => {
              setOpen(false);
              onCreated();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────── Tabs ─────────────────── */

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "vault", label: "Vault" },
    { id: "rules", label: "Detection Rules" },
    { id: "intercepts", label: "Live Intercepts" },
    { id: "audit", label: "Audit Trail" },
  ];
  return (
    <div className="border-b border-border/60">
      <div className="mx-auto flex max-w-6xl gap-6 px-6 text-[13px]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative py-3 ${
              tab === t.id ? "text-foreground" : "text-foreground/50 hover:text-foreground/80"
            }`}
          >
            {t.label}
            {tab === t.id && (
              <motion.div
                layoutId="tab-underline"
                className="absolute inset-x-0 -bottom-px h-px bg-foreground"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────── Vault ─────────────────── */

function VaultPanel({ envId }: { envId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["creds", envId],
    queryFn: () => listCredentials({ data: { environmentId: envId } }),
  });
  const [adding, setAdding] = useState(false);
  const verify = useMutation({
    mutationFn: (id: string) => verifyCredential({ data: { id } }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["creds", envId] }),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteCredential({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["creds", envId] }),
  });

  return (
    <section className="pt-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-3xl">Credential Vault</h2>
          <p className="mt-1 text-[14px] text-foreground/60">
            Envelope-encrypted with AES-256-GCM. Plaintext is only ever decrypted inside a
            signed server function.
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background"
        >
          + Add credential
        </button>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-[13px]">
          <thead className="bg-foreground/[0.02] text-[12px] uppercase tracking-wider text-foreground/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Label</th>
              <th className="px-4 py-3 text-left font-medium">Mode</th>
              <th className="px-4 py-3 text-left font-medium">Region</th>
              <th className="px-4 py-3 text-left font-medium">Access key</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {q.data?.length ? (
              q.data.map((c) => (
                <tr key={c.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium">{c.label}</td>
                  <td className="px-4 py-3 text-foreground/70">
                    {c.mode === "static_keys" ? "Static keys" : "Assume role"}
                  </td>
                  <td className="px-4 py-3 font-mono text-foreground/70">{c.region}</td>
                  <td className="px-4 py-3 font-mono text-foreground/70">
                    {c.access_key_id_masked ?? c.role_arn ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={c.verification_status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      disabled={verify.isPending}
                      onClick={() => verify.mutate(c.id)}
                      className="text-link hover:underline"
                    >
                      Verify
                    </button>
                    <button
                      onClick={() => del.mutate(c.id)}
                      className="ml-4 text-foreground/50 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-foreground/50">
                  No credentials yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {adding && (
          <AddCredentialModal
            envId={envId}
            onClose={() => setAdding(false)}
            onCreated={() => {
              setAdding(false);
              qc.invalidateQueries({ queryKey: ["creds", envId] });
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function StatusPill({ status }: { status: string | null }) {
  if (!status)
    return (
      <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[12px] text-foreground/60">
        unverified
      </span>
    );
  if (status === "verified")
    return (
      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[12px] text-emerald-700">
        verified
      </span>
    );
  if (status.startsWith("error:"))
    return (
      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[12px] text-red-700" title={status}>
        error
      </span>
    );
  return (
    <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[12px] text-foreground/60">
      {status}
    </span>
  );
}

function AddCredentialModal({
  envId,
  onClose,
  onCreated,
}: {
  envId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<"static_keys" | "assume_role">("static_keys");
  const [region, setRegion] = useState("us-east-1");
  const [ak, setAk] = useState("");
  const [sk, setSk] = useState("");
  const [st, setSt] = useState("");
  const [roleArn, setRoleArn] = useState("");
  const [externalId, setExternalId] = useState("");
  const [duration, setDuration] = useState(3600);

  const mut = useMutation({
    mutationFn: () =>
      createCredential({
        data: {
          environmentId: envId,
          label,
          mode,
          region,
          accessKeyId: mode === "static_keys" ? ak : undefined,
          secretAccessKey: mode === "static_keys" ? sk : undefined,
          sessionToken: mode === "static_keys" && st ? st : undefined,
          roleArn: mode === "assume_role" ? roleArn : undefined,
          externalId: mode === "assume_role" && externalId ? externalId : undefined,
          sessionDurationSeconds: duration,
        },
      }),
    onSuccess: onCreated,
  });

  return (
    <Modal onClose={onClose} title="Add AWS credential">
      <div className="space-y-3">
        <input
          placeholder="Label (e.g. Prod SecOps admin)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[14px]"
        />

        <div className="grid grid-cols-2 gap-2">
          <label
            className={`cursor-pointer rounded-lg border px-3 py-2 text-[13px] ${
              mode === "static_keys" ? "border-foreground bg-foreground/[0.04]" : "border-border"
            }`}
          >
            <input
              type="radio"
              className="hidden"
              checked={mode === "static_keys"}
              onChange={() => setMode("static_keys")}
            />
            Static keys
            <p className="mt-0.5 text-[11px] text-foreground/50">AKIA + Secret + Session</p>
          </label>
          <label
            className={`cursor-pointer rounded-lg border px-3 py-2 text-[13px] ${
              mode === "assume_role" ? "border-foreground bg-foreground/[0.04]" : "border-border"
            }`}
          >
            <input
              type="radio"
              className="hidden"
              checked={mode === "assume_role"}
              onChange={() => setMode("assume_role")}
            />
            Assume role
            <p className="mt-0.5 text-[11px] text-foreground/50">Role ARN + External ID</p>
          </label>
        </div>

        <input
          placeholder="Region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px]"
        />

        {mode === "static_keys" ? (
          <>
            <input
              placeholder="AWS Access Key ID"
              value={ak}
              onChange={(e) => setAk(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px]"
            />
            <input
              type="password"
              placeholder="AWS Secret Access Key"
              value={sk}
              onChange={(e) => setSk(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px]"
            />
            <textarea
              placeholder="Session Token (optional, for STS)"
              value={st}
              onChange={(e) => setSt(e.target.value)}
              rows={2}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[12px]"
            />
          </>
        ) : (
          <>
            <input
              placeholder="Role ARN (arn:aws:iam::123:role/Liminal)"
              value={roleArn}
              onChange={(e) => setRoleArn(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px]"
            />
            <input
              type="password"
              placeholder="External ID (optional)"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              autoComplete="off"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px]"
            />
            <div>
              <label className="text-[12px] text-foreground/60">
                Session duration: {duration}s
              </label>
              <input
                type="range"
                min={900}
                max={43200}
                step={900}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </>
        )}

        <div className="rounded-lg border border-border bg-foreground/[0.02] p-3 text-[12px] text-foreground/60">
          <b className="text-foreground/80">🔒 Envelope encryption.</b> Your secret is
          encrypted with a per-row data key, and that key is encrypted with a master key
          held only by the server. The browser sends the secret once over TLS to the
          server function; it is never persisted in plaintext, and it never touches
          logs.
        </div>

        {mut.error && (
          <p className="text-[13px] text-red-600">{(mut.error as Error).message}</p>
        )}
        <button
          disabled={!label || mut.isPending}
          onClick={() => mut.mutate()}
          className="w-full rounded-full bg-foreground px-4 py-2.5 text-[14px] font-medium text-background disabled:opacity-40"
        >
          {mut.isPending ? "Sealing…" : "Seal into vault"}
        </button>
      </div>
    </Modal>
  );
}

/* ─────────────────── Rules ─────────────────── */

function RulesPanel({ envId }: { envId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["rules", envId],
    queryFn: () => listRules({ data: { environmentId: envId } }),
  });
  const mut = useMutation({
    mutationFn: (v: { id: string; enabled?: boolean; action?: string }) => updateRule({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rules", envId] }),
  });

  return (
    <section className="pt-8">
      <h2 className="font-display text-3xl">Detection Rules</h2>
      <p className="mt-1 text-[14px] text-foreground/60">
        Bedrock-assisted classifiers and regex sentinels run on every intercept. Toggle
        actions between allow, flag, and block.
      </p>

      <div className="mt-8 space-y-2">
        {q.data?.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.name}</span>
                <SeverityBadge severity={r.severity} />
              </div>
              <div className="mt-0.5 truncate font-mono text-[12px] text-foreground/50">
                {r.pattern}
              </div>
            </div>
            <div className="flex items-center gap-3 text-[13px]">
              <select
                value={r.action}
                onChange={(e) => mut.mutate({ id: r.id, action: e.target.value })}
                className="rounded-md border border-border bg-background px-2 py-1"
              >
                <option value="allow">allow</option>
                <option value="flag">flag</option>
                <option value="block">block</option>
              </select>
              <button
                onClick={() => mut.mutate({ id: r.id, enabled: !r.enabled })}
                className={`rounded-full px-3 py-1 text-[12px] ${
                  r.enabled ? "bg-foreground text-background" : "border border-border text-foreground/60"
                }`}
              >
                {r.enabled ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    low: "bg-foreground/[0.06] text-foreground/60",
    medium: "bg-amber-500/10 text-amber-700",
    high: "bg-orange-500/10 text-orange-700",
    critical: "bg-red-500/10 text-red-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide ${map[severity] ?? map.low}`}>
      {severity}
    </span>
  );
}

/* ─────────────────── Intercepts ─────────────────── */

function InterceptsPanel({ envId }: { envId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["intercepts", envId],
    queryFn: () => listIntercepts({ data: { environmentId: envId, limit: 50 } }),
    refetchInterval: 5000,
  });
  const sim = useMutation({
    mutationFn: () => simulateIntercept({ data: { environmentId: envId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["intercepts", envId] }),
  });

  // realtime subscribe
  useEffect(() => {
    const ch = supabase
      .channel(`intercepts:${envId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "intercepts", filter: `environment_id=eq.${envId}` },
        () => qc.invalidateQueries({ queryKey: ["intercepts", envId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [envId, qc]);

  const [selected, setSelected] = useState<string | null>(null);
  const current = useMemo(() => q.data?.find((x) => x.id === selected), [q.data, selected]);

  return (
    <section className="pt-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-3xl">Live Intercepts</h2>
          <p className="mt-1 text-[14px] text-foreground/60">
            Streaming via Postgres realtime. Click any row to see the semantic diff.
          </p>
        </div>
        <button
          onClick={() => sim.mutate()}
          disabled={sim.isPending}
          className="rounded-full border border-border px-4 py-2 text-[13px] hover:bg-foreground/[0.03]"
        >
          {sim.isPending ? "Injecting…" : "Simulate intercept"}
        </button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-[13px]">
            <thead className="bg-foreground/[0.02] text-[12px] uppercase tracking-wider text-foreground/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Verdict</th>
                <th className="px-3 py-2 text-left font-medium">Flow</th>
                <th className="px-3 py-2 text-left font-medium">Reason</th>
                <th className="px-3 py-2 text-left font-medium">Δ</th>
              </tr>
            </thead>
            <tbody>
              {q.data?.length ? (
                q.data.map((i) => (
                  <tr
                    key={i.id}
                    onClick={() => setSelected(i.id)}
                    className={`cursor-pointer border-t border-border/60 hover:bg-foreground/[0.02] ${
                      selected === i.id ? "bg-foreground/[0.03]" : ""
                    }`}
                  >
                    <td className="px-3 py-2">
                      <VerdictBadge verdict={i.verdict} />
                    </td>
                    <td className="px-3 py-2 font-mono text-foreground/70">
                      {i.source_service} → {i.target_service} · {i.action}
                    </td>
                    <td className="px-3 py-2 text-foreground/70">{i.reason}</td>
                    <td className="px-3 py-2 font-mono text-foreground/60">
                      {i.diff_score != null ? Number(i.diff_score).toFixed(2) : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-12 text-center text-foreground/50">
                    No intercepts yet — click "Simulate intercept".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-border p-5">
          {current ? (
            <div>
              <div className="flex items-center gap-2">
                <VerdictBadge verdict={current.verdict} />
                <SeverityBadge severity={current.severity} />
                <span className="text-[13px] text-foreground/50">
                  Δ {Number(current.diff_score ?? 0).toFixed(2)}
                </span>
              </div>
              <h3 className="mt-3 font-medium">{current.reason}</h3>
              <p className="mt-1 font-mono text-[12px] text-foreground/60">
                {current.source_service} → {current.target_service} · {current.action}
              </p>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="mb-1 text-[11px] uppercase tracking-wider text-foreground/40">
                    Expected
                  </div>
                  <pre className="whitespace-pre-wrap break-all rounded-lg bg-foreground/[0.03] p-3 font-mono text-[12px] text-foreground/70">
                    {current.expected_summary}
                  </pre>
                </div>
                <div>
                  <div className="mb-1 text-[11px] uppercase tracking-wider text-foreground/40">
                    Actual
                  </div>
                  <pre className="whitespace-pre-wrap break-all rounded-lg bg-red-500/[0.06] p-3 font-mono text-[12px] text-red-900">
                    {current.actual_summary}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid h-full min-h-[240px] place-items-center text-[13px] text-foreground/50">
              Select an intercept to inspect the diff.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const map: Record<string, string> = {
    allow: "bg-emerald-500/10 text-emerald-700",
    flag: "bg-amber-500/10 text-amber-700",
    block: "bg-red-500/10 text-red-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide ${map[verdict] ?? map.allow}`}>
      {verdict}
    </span>
  );
}

/* ─────────────────── Audit ─────────────────── */

function AuditPanel() {
  const q = useQuery({ queryKey: ["audit"], queryFn: () => listAudit() });

  function exportCsv() {
    const rows = q.data ?? [];
    const header = ["created_at", "actor_id", "action", "target_type", "target_id", "entry_hash", "prev_hash"];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        header
          .map((k) => JSON.stringify((r as Record<string, unknown>)[k] ?? ""))
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liminal-audit-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="pt-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-3xl">Audit Trail</h2>
          <p className="mt-1 text-[14px] text-foreground/60">
            Hash-chained, append-only. Perfect for SOC 2 evidence collection.
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="rounded-full border border-border px-4 py-2 text-[13px] hover:bg-foreground/[0.03]"
        >
          Export CSV
        </button>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-[13px]">
          <thead className="bg-foreground/[0.02] text-[12px] uppercase tracking-wider text-foreground/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Time</th>
              <th className="px-3 py-2 text-left font-medium">Action</th>
              <th className="px-3 py-2 text-left font-medium">Target</th>
              <th className="px-3 py-2 text-left font-medium">Hash</th>
            </tr>
          </thead>
          <tbody>
            {q.data?.length ? (
              q.data.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-mono text-foreground/60">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{r.action}</td>
                  <td className="px-3 py-2 font-mono text-foreground/60">
                    {r.target_type ?? "—"} {r.target_id ? r.target_id.slice(0, 8) : ""}
                  </td>
                  <td className="px-3 py-2 font-mono text-foreground/40" title={r.entry_hash}>
                    {r.entry_hash.slice(0, 12)}…
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-3 py-12 text-center text-foreground/50">
                  No audit entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ─────────────────── Modal shell ─────────────────── */

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl">{title}</h3>
          <button onClick={onClose} className="text-foreground/50 hover:text-foreground">
            ✕
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}

// keep deleteEnvironment import used
void deleteEnvironment;
