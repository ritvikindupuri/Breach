import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { getEngagement } from "@/lib/engagements.functions";

export const Route = createFileRoute("/app/engagements/$id")({
  component: EngagementDetail,
});

function EngagementDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/auth", replace: true });
      else setReady(true);
    });
  }, [navigate]);

  const { data } = useQuery({
    queryKey: ["engagement", id],
    queryFn: () => getEngagement({ data: { id } }),
    refetchInterval: (q) => {
      const s = q.state.data?.engagement?.status;
      return s === "complete" || s === "failed" || s === "cancelled" ? false : 1500;
    },
    enabled: ready,
  });

  if (!ready || !data) return <div className="min-h-screen bg-background" />;
  const { engagement: e, agent_runs, findings } = data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-black/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/app" className="text-[13px] text-muted-foreground hover:text-foreground">
            ← All engagements
          </Link>
          <div className="text-[13px] text-muted-foreground">{e.environment_id.slice(0, 8)}</div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">ENGAGEMENT</div>
            <h1 className="mt-2 font-serif text-4xl tracking-[-0.02em]">{e.name}</h1>
            <div className="mt-2 font-mono text-[12px] text-muted-foreground">
              {e.repo_url} · {e.branch}
              {e.target_url ? ` · ${e.target_url}` : ""}
            </div>
          </div>
          <div className="text-right">
            <StatusBig status={e.status} />
            <div className="mt-2 text-[12px] text-muted-foreground">
              {e.started_at ? `Started ${new Date(e.started_at).toLocaleString()}` : ""}
              {e.finished_at ? ` · Finished ${new Date(e.finished_at).toLocaleString()}` : ""}
            </div>
          </div>
        </div>

        {e.summary && (
          <div className="mt-8 rounded-2xl border border-black/10 bg-black/[.02] p-6 text-[14px] leading-relaxed text-foreground/90">
            {e.summary}
          </div>
        )}

        <section className="mt-10">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">AGENT TEAM</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {agent_runs.map((r) => (
              <motion.div
                key={r.id}
                layout
                className="rounded-xl border border-black/10 p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-medium tracking-tight">{formatKind(r.kind)}</div>
                  <RunPill status={r.status} />
                </div>
                <div className="mt-2 text-[12px] text-muted-foreground">
                  {r.current_step ?? (r.status === "pending" ? "waiting for launch…" : "")}
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/5">
                  <div
                    className="h-full bg-foreground/70 transition-all"
                    style={{ width: `${Math.min(100, (r.step_count / 3) * 100)}%` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">FINDINGS</h2>
            <div className="text-[13px] text-muted-foreground">{findings.length} total</div>
          </div>
          <div className="mt-4 space-y-3">
            {findings.length === 0 && e.status === "complete" && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-[14px] text-emerald-800">
                Clean run. No exploitable issues found this pass.
              </div>
            )}
            {findings.length === 0 && e.status !== "complete" && (
              <div className="rounded-xl border border-dashed border-black/15 p-6 text-center text-[13px] text-muted-foreground">
                Agents are still working. Findings appear here as they land.
              </div>
            )}
            {findings.map((f) => (
              <motion.details
                key={f.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="group rounded-xl border border-black/10 open:border-foreground/40"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <SeverityDot s={f.severity} />
                    <div className="text-[14px] font-medium tracking-tight">{f.title}</div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    {f.cwe && <span className="font-mono">{f.cwe}</span>}
                    <span className="uppercase tracking-[0.15em]">{f.severity}</span>
                  </div>
                </summary>
                <div className="border-t border-black/5 px-5 py-4 text-[13px] leading-relaxed text-foreground/85">
                  <p>{f.description}</p>
                  {f.remediation && (
                    <div className="mt-3">
                      <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Remediation</div>
                      <p className="mt-1">{f.remediation}</p>
                    </div>
                  )}
                  {f.evidence && Object.keys(f.evidence as object).length > 0 && (
                    <div className="mt-3">
                      <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Evidence</div>
                      <pre className="mt-1 overflow-x-auto rounded-lg bg-black/[.03] p-3 font-mono text-[11px]">
                        {JSON.stringify(f.evidence, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </motion.details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function formatKind(k: string) {
  return { recon: "Recon", authn: "AuthN", injection: "Injection", supply_chain: "Supply chain" }[k] ?? k;
}
function StatusBig({ status }: { status: string }) {
  const color: Record<string, string> = {
    queued: "text-muted-foreground",
    provisioning: "text-blue-700",
    running: "text-blue-700",
    complete: "text-emerald-700",
    failed: "text-red-700",
    cancelled: "text-muted-foreground",
  };
  return <div className={`text-[13px] font-medium uppercase tracking-[0.15em] ${color[status]}`}>{status}</div>;
}
function RunPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-black/[.05] text-muted-foreground",
    running: "bg-blue-500/15 text-blue-700",
    complete: "bg-emerald-500/10 text-emerald-700",
    failed: "bg-red-500/10 text-red-700",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${map[status]}`}>
      {status === "running" && <span className="h-1 w-1 animate-pulse rounded-full bg-current" />}
      {status}
    </span>
  );
}
function SeverityDot({ s }: { s: string }) {
  const c = { low: "bg-slate-400", medium: "bg-amber-500", high: "bg-orange-600", critical: "bg-red-600" }[s] ?? "bg-slate-400";
  return <span className={`h-2 w-2 rounded-full ${c}`} />;
}
