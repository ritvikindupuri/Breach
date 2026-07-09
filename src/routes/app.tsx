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
      <h3 className="font-serif text-2xl tracking-[-0.01em]">Launch your first pen-test</h3>
      <p className="mt-2 text-[14px] text-muted-foreground max-w-sm mx-auto leading-relaxed">
        Point Breach at your repo branch and target URL. We'll run sandbox audits and scan for security threats.
      </p>
      <button
        onClick={onNew}
        className="mt-6 rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:opacity-90"
      >
        New engagement
      </button>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    queued: "bg-black/[.03] text-muted-foreground",
    provisioning: "bg-blue-500/10 text-blue-700",
    running: "bg-blue-500/10 text-blue-700",
    complete: "bg-emerald-500/10 text-emerald-700",
    failed: "bg-red-500/10 text-red-700",
    cancelled: "bg-black/[.03] text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${map[status] ?? map.queued}`}>
      {status === "running" && <span className="h-1 w-1 animate-pulse rounded-full bg-current" />}
      {status}
    </span>
  );
}

function VerdictPill({ verdict }: { verdict: string }) {
  const map: Record<string, string> = {
    pending: "bg-black/[.03] text-muted-foreground",
    clean: "bg-emerald-500/10 text-emerald-700",
    issues: "bg-amber-500/10 text-amber-700",
    critical: "bg-red-500/10 text-red-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${map[verdict] ?? map.pending}`}>
      {verdict}
    </span>
  );
}

function NewEngagementModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [targetUrl, setTargetUrl] = useState("");
  const [envId, setEnvId] = useState<string | null>(null);

  const { data: envs = [] } = useQuery({ queryKey: ["envs"], queryFn: () => listEnvironments() });

  useEffect(() => {
    if (!envId && envs[0]) setEnvId(envs[0].id);
  }, [envs, envId]);

  const create = useMutation({
    mutationFn: () =>
      createEngagement({
        data: {
          name,
          repo_url: repoUrl,
          branch,
          target_url: targetUrl || null,
          environment_id: envId!,
          agent_kinds: ["recon", "authn", "injection", "supply_chain"],
        },
      }),
    onSuccess: () => onCreated(),
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
        className="w-full max-w-lg rounded-2xl bg-background p-8 shadow-2xl text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif text-2xl tracking-[-0.02em]">New pen-test engagement</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Provide your target repository and app URL to coordinate sandbox scanning.
        </p>

        <div className="mt-6 space-y-4">
          <Field label="Engagement Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Blastline AI Audit"
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-[14px] outline-none focus:border-foreground"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label="GitHub Repository URL">
                <input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/org/repo"
                  className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-[14px] outline-none focus:border-foreground"
                />
              </Field>
            </div>
            <div>
              <Field label="Branch">
                <input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-[14px] outline-none focus:border-foreground"
                />
              </Field>
            </div>
          </div>
          <Field label="Target Application URL (Local or Public)">
            <input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="http://localhost:8080"
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-[14px] outline-none focus:border-foreground"
            />
          </Field>
          <Field label="Target Environment">
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
            disabled={!name || !repoUrl || !envId || create.isPending}
            onClick={() => create.mutate()}
            className="rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background disabled:opacity-40"
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
          <h1 className="font-serif text-4xl tracking-[-0.02em]">Runners</h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Self-hosted sandbox executors. Deploy one per environment on any Docker-capable host.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:opacity-90"
        >
          New runner
        </button>
      </div>

      <div className="mt-10 space-y-3">
        {data.length === 0 && (
          <div className="rounded-2xl border border-dashed border-black/15 py-20 text-center">
            <p className="text-[14px] text-muted-foreground">
              No runners registered. Engagements will run in the built-in server sandbox, but a self-hosted runner unlocks deep source scans.
            </p>
          </div>
        )}
        {data.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-xl border border-black/10 px-5 py-4 text-left">
            <div>
              <div className="flex items-center gap-3">
                <span
                  className={`h-2 w-2 rounded-full ${
                    r.status === "online" ? "bg-emerald-500" : "bg-muted-foreground/40"
                  }`}
                />
                <span className="font-medium tracking-tight">{r.name}</span>
                <span className="text-[12px] text-muted-foreground">
                  {r.last_seen_at ? `last seen ${new Date(r.last_seen_at).toLocaleString()}` : "never"}
                </span>
              </div>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">{r.id}</div>
            </div>
            <button
              onClick={() => del.mutate(r.id)}
              className="text-[12px] text-muted-foreground hover:text-red-600 animate-fade-in"
            >
              Revoke
            </button>
          </div>
        ))}
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
        className="w-full max-w-md rounded-2xl bg-background p-8 shadow-2xl text-left"
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
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);

  // Prerequisites checklist states
  const [chk1, setChk1] = useState(false);
  const [chk2, setChk2] = useState(false);
  const [chk3, setChk3] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://breach.app";
  const cmd = `docker run --rm -d \\
  --name breach-runner \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  -e BREACH_URL=${origin} \\
  -e BREACH_RUNNER_ID=${runnerId} \\
  -e BREACH_BOOTSTRAP=${token} \\
  ghcr.io/breach/runner:latest`;

  // Live handshake polling in Step 3
  useEffect(() => {
    if (step !== 3 || connected) return;
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from("runners")
          .select("status")
          .eq("id", runnerId)
          .single();
        if (!error && data?.status === "online") {
          setConnected(true);
          clearInterval(interval);
        }
      } catch (e) {
        console.error(e);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [step, runnerId, connected]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        className="w-full max-w-xl rounded-2xl bg-background p-8 shadow-2xl text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step Progress Indicators */}
        <div className="flex items-center justify-between border-b border-black/5 pb-4 mb-6">
          <h2 className="font-serif text-2xl tracking-[-0.02em] text-foreground">Set up Host Runner</h2>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            <span className={`px-2 py-0.5 rounded ${step === 1 ? "bg-black text-white font-bold" : "bg-black/[0.04]"}`}>1. Verify</span>
            <span className="text-black/25">➔</span>
            <span className={`px-2 py-0.5 rounded ${step === 2 ? "bg-black text-white font-bold" : "bg-black/[0.04]"}`}>2. Run</span>
            <span className="text-black/25">➔</span>
            <span className={`px-2 py-0.5 rounded ${step === 3 ? "bg-black text-white font-bold" : "bg-black/[0.04]"}`}>3. Connect</span>
          </div>
        </div>

        {/* Step 1: Verify Prerequisites */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Before deploying the runner agent, please verify your target host environment satisfies these requirements:
            </p>
            <div className="space-y-2 bg-black/[0.01] border border-black/5 rounded-xl p-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={chk1} 
                  onChange={(e) => setChk1(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-black/15 text-black focus:ring-black"
                />
                <div className="text-[13px] leading-tight">
                  <span className="font-semibold block">Host has Docker installed</span>
                  <span className="text-muted-foreground text-[11px]">Run `docker --version` in terminal to confirm availability.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer pt-3 border-t border-black/5 mt-3">
                <input 
                  type="checkbox" 
                  checked={chk2} 
                  onChange={(e) => setChk2(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-black/15 text-black focus:ring-black"
                />
                <div className="text-[13px] leading-tight">
                  <span className="font-semibold block">Docker Daemon active</span>
                  <span className="text-muted-foreground text-[11px]">The daemon service must be running with socket capabilities enabled.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer pt-3 border-t border-black/5 mt-3">
                <input 
                  type="checkbox" 
                  checked={chk3} 
                  onChange={(e) => setChk3(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-black/15 text-black focus:ring-black"
                />
                <div className="text-[13px] leading-tight">
                  <span className="font-semibold block">Outbound network route permitted</span>
                  <span className="text-muted-foreground text-[11px]">The runner container must have HTTPS access back to this console API.</span>
                </div>
              </label>
            </div>
            
            <div className="mt-8 flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="rounded-full px-4 py-2 text-[13px] text-muted-foreground hover:text-foreground">
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!chk1 || !chk2 || !chk3}
                className="rounded-full bg-foreground px-5 py-2 text-[13px] font-medium text-background disabled:opacity-40"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Deployment command */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Launch the runner agent inside a Docker container. You can run the unified command below, or copy the individual parameters for configuration:
            </p>
            
            {/* Split parameters fields */}
            <div className="rounded-xl border border-black/5 bg-black/[0.01] p-4 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Configuration Parameters</div>
              
              <div className="flex items-center justify-between text-xs border-b border-black/5 pb-2">
                <span className="font-semibold text-muted-foreground">Breach URL</span>
                <div className="flex items-center gap-2">
                  <code className="bg-black/[0.04] px-2 py-0.5 rounded font-mono text-[11px]">{origin}</code>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(origin); }} 
                    className="text-[10px] text-zinc-500 hover:text-black font-semibold"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs border-b border-black/5 pb-2">
                <span className="font-semibold text-muted-foreground">Auditor ID (Runner ID)</span>
                <div className="flex items-center gap-2">
                  <code className="bg-black/[0.04] px-2 py-0.5 rounded font-mono text-[11px]">{runnerId}</code>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(runnerId); }} 
                    className="text-[10px] text-zinc-500 hover:text-black font-semibold"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Bootstrap Token</span>
                <div className="flex items-center gap-2">
                  <code className="bg-black/[0.04] px-2 py-0.5 rounded font-mono text-[11px]">{token.slice(0, 16)}...</code>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(token); }} 
                    className="text-[10px] text-zinc-500 hover:text-black font-semibold"
                  >
                    Copy Token
                  </button>
                </div>
              </div>
            </div>

            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground pt-2">Deployment Command</div>
            <div className="relative">
              <pre className="overflow-x-auto rounded-xl bg-black text-[11px] leading-relaxed text-emerald-300 p-5 font-mono">
{cmd}
              </pre>
              <button
                onClick={copyToClipboard}
                className="absolute top-3 right-3 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-2.5 py-1 text-[10px] font-mono border border-zinc-700 transition-colors"
              >
                {copied ? "Copied!" : "Copy Command"}
              </button>
            </div>
            
            <p className="text-[11px] text-muted-foreground">
              ⚠️ Copy the parameters or command now. The bootstrap token won't be shown again.
            </p>

            <div className="mt-8 flex justify-end gap-2 pt-2">
              <button onClick={() => setStep(1)} className="rounded-full px-4 py-2 text-[13px] text-muted-foreground hover:text-foreground">
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="rounded-full bg-foreground px-5 py-2 text-[13px] font-medium text-background"
              >
                Next: Connect
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Connection Handshake verification */}
        {step === 3 && (
          <div className="space-y-6 py-4 text-center">
            {!connected ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <span className="relative flex h-10 w-10">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-10 w-10 bg-indigo-500 items-center justify-center text-white">
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </span>
                </span>
                <div className="space-y-1">
                  <h3 className="font-semibold text-[15px] text-foreground">Awaiting Host Connection</h3>
                  <p className="text-[12px] text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Execute the docker command on your host terminal. We are listening for the initial agent configuration handshake...
                  </p>
                </div>
              </div>
            ) : (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center space-y-4"
              >
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-xl tracking-tight text-emerald-800">Connection Successful!</h3>
                  <p className="text-[12px] text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Runner Agent handshake completed. The daemon socket has connected successfully and host compliance audits are active.
                  </p>
                </div>
              </motion.div>
            )}

            <div className="mt-8 flex justify-end gap-2 pt-2 border-t border-black/5">
              {!connected && (
                <button onClick={() => setStep(2)} className="rounded-full px-4 py-2 text-[13px] text-muted-foreground hover:text-foreground mr-auto">
                  Back to command
                </button>
              )}
              <button
                onClick={onClose}
                disabled={!connected}
                className="rounded-full bg-foreground px-6 py-2 text-[13px] font-medium text-background disabled:opacity-40"
              >
                Finish Setup
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
