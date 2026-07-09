import { createFileRoute, useNavigate, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { listEnvironments } from "@/lib/env.functions";
import { listEngagements, createEngagement } from "@/lib/engagements.functions";

export const Route = createFileRoute("/app")({
  component: AppShell,
});

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
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
          <div className="flex items-center gap-3 text-[13px] text-muted-foreground ml-auto">
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
        <EngagementsPane />
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
