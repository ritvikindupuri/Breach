import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { getEngagement } from "@/lib/engagements.functions";

export const Route = createFileRoute("/app/engagements/$id")({
  component: EngagementDetail,
});

interface LogEntry {
  timestamp: string;
  type: "info" | "request" | "success" | "warning" | "error";
  message: string;
}

function EngagementDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

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

  const { engagement: e, agent_runs = [], findings = [] } = data || {};

  useEffect(() => {
    if (agent_runs && agent_runs.length > 0 && !selectedRunId) {
      setSelectedRunId(agent_runs[0].id);
    }
  }, [agent_runs, selectedRunId]);

  if (!ready || !data) return <div className="min-h-screen bg-background" />;

  const selectedRun = agent_runs.find((r) => r.id === selectedRunId);

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

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {/* Left panel - Agent Team Grid */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">AGENT TEAM</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {agent_runs.map((r) => (
                <motion.div
                  key={r.id}
                  layout
                  onClick={() => setSelectedRunId(r.id)}
                  className={`rounded-xl border p-5 cursor-pointer transition-all duration-200 ${
                    selectedRunId === r.id
                      ? "border-foreground ring-2 ring-foreground/10 bg-black/[.02]"
                      : "border-black/10 hover:border-black/30 hover:bg-black/[0.005]"
                  }`}
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
          </div>

          {/* Right panel - Real-time VM Console */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">LOCAL SANDBOX VM MONITOR</h2>
            <AgentConsole run={selectedRun} />
          </div>
        </div>

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

function AgentConsole({ run }: { run: any }) {
  if (!run) return null;
  const transcript = (run.transcript || []) as LogEntry[];

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
      {/* Console Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 items-center justify-center">
            <span className={`h-2 w-2 rounded-full ${
              run.status === "running" ? "bg-blue-500 animate-pulse" :
              run.status === "complete" ? "bg-emerald-500" :
              run.status === "failed" ? "bg-rose-500" : "bg-zinc-500"
            }`} />
          </span>
          <span className="font-mono text-xs font-semibold text-zinc-300">
            {run.kind.toUpperCase()}_AGENT_VM@sandbox
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500">
          <span>tty1</span>
          <span>80x24</span>
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
          </div>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="h-[280px] overflow-y-auto p-4 font-mono text-[11px] leading-relaxed text-zinc-300 selection:bg-zinc-800 selection:text-white">
        {transcript.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-zinc-500">
            <p>Initializing virtual machine container...</p>
            <p className="mt-1 text-[10px]">Logs will print in real-time as the agent interacts with the app.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {transcript.map((log, idx) => {
              const date = new Date(log.timestamp);
              const timeStr = date.toLocaleTimeString([], { hour12: false }) + `.${String(date.getMilliseconds()).padStart(3, "0")}`;
              const colors: Record<string, string> = {
                info: "text-zinc-500",
                request: "text-indigo-400 font-medium",
                success: "text-emerald-400",
                warning: "text-amber-500 font-semibold",
                error: "text-rose-500 font-bold",
              };
              const prefix: Record<string, string> = {
                info: "[INFO]   ",
                request: "[PROBE]  ",
                success: "[SUCCESS]",
                warning: "[WARNING]",
                error: "[ALERT]  ",
              };
              return (
                <div key={idx} className="flex items-start gap-3 hover:bg-zinc-900/40 py-0.5 px-1 rounded transition-colors">
                  <span className="text-zinc-600 select-none">{timeStr}</span>
                  <span className={colors[log.type] || "text-zinc-300"}>
                    <span className="opacity-90 select-none mr-2 font-semibold">{prefix[log.type] || "[LOG]    "}</span>
                    {log.message}
                  </span>
                </div>
              );
            })}
            
            {/* Blinking cursor */}
            {run.status === "running" && (
              <div className="flex items-center gap-1 text-blue-400 font-semibold mt-2 px-1">
                <span>{run.kind.toLowerCase()}-agent@sandbox:~$</span>
                <span className="inline-block h-3 w-1.5 bg-blue-400 animate-pulse" />
              </div>
            )}
            
            {run.status === "complete" && (
              <div className="text-emerald-500 font-semibold mt-2 px-1">
                <span>{run.kind.toLowerCase()}-agent@sandbox:~$ exit</span>
              </div>
            )}
          </div>
        )}
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
