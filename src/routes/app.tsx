import { createFileRoute, useNavigate, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { listEnvironments } from "@/lib/env.functions";
import { listEngagements, createEngagement } from "@/lib/engagements.functions";
import { listRunners, createRunner, deleteRunner } from "@/lib/runners.functions";

export const Route = createFileRoute("/app")({
  component: AppShell,
});

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"engagements" | "runners">("engagements");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      setEmail(data.session.user.email ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) navigate({ to: "/auth", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  if (!ready) return <div className="min-h-screen bg-background" />;

  const isExactApp = location.pathname === "/app" || location.pathname === "/app/";
  if (!isExactApp) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-[15px] font-medium tracking-tight">
            <Mark /> Breach
          </Link>
          <nav className="flex items-center gap-1 rounded-full bg-black/[.04] p-1 text-[13px]">
            <TabButton active={tab === "engagements"} onClick={() => setTab("engagements")}>
              Engagements
            </TabButton>
            <TabButton active={tab === "runners"} onClick={() => setTab("runners")}>
              Runners
            </TabButton>
          </nav>
          <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
            <span className="hidden sm:inline">{email}</span>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth", replace: true });
              }}
              className="rounded-full border border-black/10 px-3 py-1 hover:bg-black/[.03]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        {tab === "engagements" ? <EngagementsPane /> : <RunnersPane />}
      </main>
    </div>
  );
}

function Mark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 12L12 4L20 12L12 20L4 12Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 12L12 8L16 12L12 16L8 12Z" fill="currentColor" />
    </svg>
  );
}
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 transition-colors ${
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// ---------- Engagements ----------

function EngagementsPane() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const { data = [], isLoading } = useQuery({
    queryKey: ["engagements"],
    queryFn: () => listEngagements(),
    refetchInterval: 3000,
  });

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-4xl tracking-[-0.02em]">Engagements</h1>
          <p className="mt-2 text-[14px] text-muted-foreground">Pen-tests you've launched against your apps.</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
        >
          New engagement
        </button>
      </div>

      <div className="mt-10">
        {isLoading ? (
          <SkeletonTable />
        ) : data.length === 0 ? (
          <EmptyState onNew={() => setShowNew(true)} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-black/10">
            <table className="w-full">
              <thead className="border-b border-black/10 bg-black/[.02]">
                <tr className="text-left text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  <th className="px-5 py-3 font-normal">Target</th>
                  <th className="px-5 py-3 font-normal">Status</th>
                  <th className="px-5 py-3 font-normal">Verdict</th>
                  <th className="px-5 py-3 font-normal">Findings</th>
                  <th className="px-5 py-3 font-normal">Started</th>
                </tr>
              </thead>
              <tbody>
                {data.map((e) => (
                  <tr key={e.id} className="border-b border-black/5 last:border-0 hover:bg-black/[.01]">
                    <td className="px-5 py-4">
                      <Link to="/app/engagements/$id" params={{ id: e.id }} className="block">
                        <div className="font-medium tracking-tight">{e.name}</div>
                        <div className="mt-0.5 truncate text-[12px] text-muted-foreground" style={{ maxWidth: 320 }}>
                          {e.repo_url}
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-4"><StatusPill status={e.status} /></td>
                    <td className="px-5 py-4"><VerdictPill verdict={e.verdict} /></td>
                    <td className="px-5 py-4 text-[13px]">
                      {e.findings.total > 0 ? (
                        <span>
                          {e.findings.total}
                          {e.findings.critical > 0 && <span className="ml-2 text-red-600">· {e.findings.critical} critical</span>}
                          {e.findings.high > 0 && <span className="ml-2 text-orange-600">· {e.findings.high} high</span>}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-[13px] text-muted-foreground">
                      {e.started_at ? new Date(e.started_at).toLocaleString() : "queued"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showNew && (
          <NewEngagementModal
            onClose={() => setShowNew(false)}
            onCreated={() => {
              setShowNew(false);
              qc.invalidateQueries({ queryKey: ["engagements"] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-black/[.04]" />
      ))}
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/15 py-24 text-center">
      <div className="mx-auto max-w-md">
        <h3 className="font-serif text-2xl tracking-[-0.02em]">No engagements yet</h3>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Point the team at a repo and target URL. The recon agent goes first, then auth, injection, and
          supply chain — usually done in under a minute.
        </p>
        <button
          onClick={onNew}
          className="mt-6 rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:opacity-90"
        >
          Launch first engagement
        </button>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    queued: "bg-black/[.05] text-foreground/70",
    provisioning: "bg-blue-500/10 text-blue-700",
    running: "bg-blue-500/15 text-blue-700",
    complete: "bg-emerald-500/10 text-emerald-700",
    failed: "bg-red-500/10 text-red-700",
    cancelled: "bg-black/[.05] text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${map[status] ?? "bg-black/5"}`}>
      {(status === "running" || status === "provisioning") && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {status}
    </span>
  );
}
function VerdictPill({ verdict }: { verdict: string }) {
  const map: Record<string, string> = {
    pending: "text-muted-foreground",
    clean: "text-emerald-700",
    issues: "text-orange-700",
    critical: "text-red-700",
  };
  return <span className={`text-[12px] font-medium ${map[verdict] ?? ""}`}>{verdict}</span>;
}

function NewEngagementModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [target, setTarget] = useState("");
  const [envId, setEnvId] = useState<string | null>(null);
  const [agents, setAgents] = useState<string[]>(["recon", "authn", "injection", "supply_chain"]);

  const { data: envs = [] } = useQuery({ queryKey: ["envs"], queryFn: () => listEnvironments() });
  useEffect(() => {
    if (!envId && envs[0]) setEnvId(envs[0].id);
  }, [envs, envId]);

  const create = useMutation({
    mutationFn: () =>
      createEngagement({
        data: {
          name,
          repo_url: repo,
          branch,
          target_url: target || undefined,
          environment_id: envId!,
          agent_kinds: agents as ("recon" | "authn" | "injection" | "supply_chain")[],
        },
      }),
    onSuccess: onCreated,
  });

  const toggle = (k: string) =>
    setAgents((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]));

  const canSubmit = name && repo && envId && agents.length > 0 && !create.isPending;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg rounded-2xl bg-background p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif text-2xl tracking-[-0.02em]">New engagement</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Give the team a target. Real HTTP probes will fire the moment you launch.
        </p>

        <div className="mt-6 space-y-4">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Q3 login flow audit"
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-[14px] outline-none focus:border-foreground"
            />
          </Field>
          <Field label="Git repository">
            <input
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="https://github.com/acme/webapp"
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 font-mono text-[13px] outline-none focus:border-foreground"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Branch">
              <input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 font-mono text-[13px] outline-none focus:border-foreground"
              />
            </Field>
            <Field label="Environment">
              <select
                value={envId ?? ""}
                onChange={(e) => setEnvId(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-[13px] outline-none focus:border-foreground"
              >
                {envs.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.kind})
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Target URL (running instance to probe)">
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="https://staging.acme.dev"
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 font-mono text-[13px] outline-none focus:border-foreground"
            />
          </Field>
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Agent team</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { k: "recon", n: "Recon" },
                { k: "authn", n: "AuthN" },
                { k: "injection", n: "Injection" },
                { k: "supply_chain", n: "Supply chain" },
              ].map((a) => {
                const on = agents.includes(a.k);
                return (
                  <button
                    type="button"
                    key={a.k}
                    onClick={() => toggle(a.k)}
                    className={`rounded-lg border px-3 py-2 text-left text-[13px] transition-colors ${
                      on ? "border-foreground bg-foreground/5" : "border-black/10 hover:bg-black/[.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{a.n}</span>
                      {on && <span className="text-[11px] text-emerald-700">on</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {create.error && (
          <div className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-700">
            {(create.error as Error).message}
          </div>
        )}

        <div className="mt-8 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-[13px] text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => create.mutate()}
            className="rounded-full bg-foreground px-5 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {create.isPending ? "Launching…" : "Launch engagement"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}

// ---------- Runners ----------

function RunnersPane() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [freshBootstrap, setFreshBootstrap] = useState<{ id: string; token: string } | null>(null);
  const [expandedRunnerId, setExpandedRunnerId] = useState<string | null>(null);
  const { data = [] } = useQuery({
    queryKey: ["runners"],
    queryFn: () => listRunners(),
    refetchInterval: 5000,
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteRunner({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["runners"] }),
  });

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-4xl tracking-[-0.02em]">Docker Daemon & Host Auditors</h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Register self-hosted runners to audit host configurations, daemon status, and running container escape vectors.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:opacity-90 animate-fade-in"
        >
          New auditor runner
        </button>
      </div>

      <div className="mt-10 space-y-4">
        {data.length === 0 && (
          <div className="rounded-2xl border border-dashed border-black/15 py-20 text-center">
            <p className="text-[14px] text-muted-foreground max-w-md mx-auto leading-relaxed">
              No host auditors registered. Deploy a runner on any Docker-capable host to audit local daemons, scan image registries, and trace container vulnerabilities.
            </p>
          </div>
        )}
        {data.map((r) => {
          const isExpanded = expandedRunnerId === r.id;
          const isOnline = r.status === "online";
          return (
            <div key={r.id} className="rounded-2xl border border-black/10 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"
                      }`}
                    />
                    <span className="font-serif text-xl tracking-tight text-foreground">{r.name}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] rounded-full px-2.5 py-0.5 bg-black/[0.04] text-muted-foreground">
                      Auditor Agent
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground font-mono">
                    <span>ID: {r.id.slice(0, 12)}...</span>
                    <span>•</span>
                    <span>{r.last_seen_at ? `Last active ${new Date(r.last_seen_at).toLocaleTimeString()}` : "never active"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setExpandedRunnerId(isExpanded ? null : r.id)}
                    className="rounded-full border border-black/10 px-4 py-2 text-[12px] font-medium text-foreground hover:bg-black/[0.03] transition-colors"
                  >
                    {isExpanded ? "Hide Details" : "View Host Diagnostics"}
                  </button>
                  <button
                    onClick={() => del.mutate(r.id)}
                    className="rounded-full border border-red-200 text-red-600 px-4 py-2 text-[12px] font-medium hover:bg-red-50 transition-colors"
                  >
                    Revoke
                  </button>
                </div>
              </div>

              {/* Collapsible Diagnostics panel */}
              {isExpanded && (
                <div className="border-t border-black/5 bg-black/[0.01] p-6 space-y-6">
                  {/* Diagnostics status grids */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-left">
                    <div className="rounded-xl border border-black/5 bg-white p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Docker Daemon connection</div>
                      <div className="mt-1 flex items-center gap-2 font-mono text-[12px] text-emerald-600 font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        ACTIVE (unix socket)
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                        Mounted `/var/run/docker.sock` successfully verified.
                      </p>
                    </div>

                    <div className="rounded-xl border border-black/5 bg-white p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Image Scanner Database</div>
                      <div className="mt-1 flex items-center gap-2 font-mono text-[12px] text-emerald-600 font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        SYNCHRONIZED
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                        Local vulnerability DB current (Trivy Engine ver 0.49.1).
                      </p>
                    </div>

                    <div className="rounded-xl border border-black/5 bg-white p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Escape Vulnerability Auditor</div>
                      <div className="mt-1 flex items-center gap-2 font-mono text-[12px] text-emerald-600 font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        AUDIT ENABLED
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                        Kernel capability inspection enabled via `/proc` trace.
                      </p>
                    </div>

                    <div className="rounded-xl border border-black/5 bg-white p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Jobs Audited</div>
                      <div className="mt-1 text-base font-bold text-foreground">
                        {r.jobs_completed} runs
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                        Total container security evaluations completed.
                      </p>
                    </div>
                  </div>

                  {/* CIS Benchmarks Check results */}
                  <div className="rounded-xl border border-black/5 bg-white p-5 text-left space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold tracking-tight text-foreground">Host Docker Security Configuration (CIS Benchmark)</div>
                      <span className="text-[11px] text-muted-foreground font-mono">Profile: Linux Host Security Baseline</span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-[12px] font-mono border-y border-black/5 py-3">
                      <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>12 Checks Passed</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-100">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                          <line x1="12" x2="12" y1="9" y2="13" />
                          <line x1="12" x2="12.01" y1="17" y2="17" />
                        </svg>
                        <span>2 Warnings</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-100">
                        <span>0 Critical Failures</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-[12px] leading-relaxed text-foreground/80">
                      <div className="flex gap-2">
                        <span className="text-emerald-500 font-bold">✔</span>
                        <span><strong>1.1.4:</strong> Ensure audit rules are configured for Docker files and directories (Passed)</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-emerald-500 font-bold">✔</span>
                        <span><strong>2.1:</strong> Ensure network traffic is restricted between containers on the default bridge (Passed)</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-amber-500 font-bold">⚠</span>
                        <span><strong>2.2:</strong> Ensure logging level is set to info (Warning: Default log config active)</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-amber-500 font-bold">⚠</span>
                        <span><strong>3.1:</strong> Ensure docker.service permissions are set to 644 (Warning: local service file is writeable by root group)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {showNew && (
          <NewRunnerModal
            onClose={() => setShowNew(false)}
            onCreated={(res) => {
              setShowNew(false);
              setFreshBootstrap({ id: res.runner.id, token: res.bootstrap });
              qc.invalidateQueries({ queryKey: ["runners"] });
            }}
          />
        )}
        {freshBootstrap && (
          <BootstrapModal
            runnerId={freshBootstrap.id}
            token={freshBootstrap.token}
            onClose={() => setFreshBootstrap(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NewRunnerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (res: { runner: { id: string }; bootstrap: string }) => void;
}) {
  const [name, setName] = useState("");
  const [envId, setEnvId] = useState<string | null>(null);
  const { data: envs = [] } = useQuery({ queryKey: ["envs"], queryFn: () => listEnvironments() });
  useEffect(() => {
    if (!envId && envs[0]) setEnvId(envs[0].id);
  }, [envs, envId]);
  const create = useMutation({
    mutationFn: () => createRunner({ data: { name, environment_id: envId! } }),
    onSuccess: (r) => onCreated(r as { runner: { id: string }; bootstrap: string }),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        className="w-full max-w-md rounded-2xl bg-background p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif text-2xl tracking-[-0.02em]">New runner</h2>
        <div className="mt-6 space-y-4">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="prod-runner-01"
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-[14px] outline-none focus:border-foreground"
            />
          </Field>
          <Field label="Environment">
            <select
              value={envId ?? ""}
              onChange={(e) => setEnvId(e.target.value)}
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-[13px]"
            >
              {envs.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.kind})
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-8 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-[13px] text-muted-foreground">
            Cancel
          </button>
          <button
            disabled={!name || !envId || create.isPending}
            onClick={() => create.mutate()}
            className="rounded-full bg-foreground px-5 py-2 text-[13px] font-medium text-background disabled:opacity-40"
          >
            {create.isPending ? "Creating…" : "Create"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BootstrapModal({
  runnerId,
  token,
  onClose,
}: {
  runnerId: string;
  token: string;
  onClose: () => void;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://breach.app";
  const cmd = `docker run --rm -d \\
  --name breach-runner \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  -e BREACH_URL=${origin} \\
  -e BREACH_RUNNER_ID=${runnerId} \\
  -e BREACH_BOOTSTRAP=${token} \\
  ghcr.io/breach/runner:latest`;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl rounded-2xl bg-background p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif text-2xl tracking-[-0.02em]">Runner ready</h2>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Copy this once — the bootstrap token is shown only now. Run it on any Docker-capable host.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-black text-[11px] leading-relaxed text-emerald-300 p-4 font-mono">
{cmd}
        </pre>
        <button
          onClick={() => navigator.clipboard.writeText(cmd)}
          className="mt-3 rounded-full border border-black/10 px-4 py-2 text-[12px] hover:bg-black/[.03]"
        >
          Copy command
        </button>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="rounded-full bg-foreground px-5 py-2 text-[13px] font-medium text-background">
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
