import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { getEngagement } from "@/lib/engagements.functions";
import { jsPDF } from "jspdf";

export const Route = createFileRoute("/app/engagements/$id")({
  component: EngagementDetail,
});

interface LogEntry {
  timestamp: string;
  type: "info" | "request" | "success" | "warning" | "error";
  message: string;
  network_request?: {
    method: string;
    url: string;
    request_headers: Record<string, string>;
    request_body: string;
    status: number;
    response_headers: Record<string, string>;
    response_body: string;
    duration_ms: number;
  };
}

function downloadPdfReport(e: any, runs: any[], findings: any[]) {
  const doc = new jsPDF();
  let y = 15;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 20);
  doc.text("BREACH PENETRATION TEST REPORT", 14, y);
  y += 10;

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(14, y, 196, y);
  y += 10;

  // Metadata
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Target Name:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(String(e.name), 42, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Repository:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(String(e.repo_url), 42, y);
  y += 6;

  if (e.target_url) {
    doc.setFont("helvetica", "bold");
    doc.text("Target URL:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(e.target_url), 42, y);
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Status:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${e.status.toUpperCase()} (Verdict: ${e.verdict.toUpperCase()})`, 42, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Date:", 14, y);
  doc.setFont("helvetica", "normal");
  const started = e.started_at ? new Date(e.started_at).toLocaleString() : "N/A";
  const finished = e.finished_at ? new Date(e.finished_at).toLocaleString() : "N/A";
  doc.text(`${started} - ${finished}`, 42, y);
  y += 12;

  // Executive Summary
  if (e.summary) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("EXECUTIVE SUMMARY", 14, y);
    y += 6;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const splitSummary = doc.splitTextToSize(e.summary, 180);
    doc.text(splitSummary, 14, y);
    doc.setTextColor(20, 20, 20);
    y += (splitSummary.length * 5) + 10;
  }

  // Agent Team
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("AGENT RUN STATUS", 14, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  runs.forEach((r) => {
    const kindName = { recon: "Recon", authn: "AuthN", injection: "Injection", supply_chain: "Supply chain" }[r.kind] || r.kind;
    doc.text(`- ${kindName} Agent: ${r.status.toUpperCase()} (${r.current_step || "idle"})`, 14, y);
    y += 6;
  });
  y += 8;

  // Page break for findings if vertical space is tight
  if (y > 200) {
    doc.addPage();
    y = 20;
  }

  // Findings Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`FINDINGS (${findings.length} total)`, 14, y);
  y += 8;

  findings.forEach((f, idx) => {
    // Check page boundaries
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${idx + 1}. [${f.severity.toUpperCase()}] ${f.title}`, 14, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const cweText = f.cwe ? ` (CWE: ${f.cwe})` : "";
    
    // Description
    const splitDesc = doc.splitTextToSize(`Description: ${f.description}${cweText}`, 180);
    doc.text(splitDesc, 14, y);
    y += (splitDesc.length * 4.5) + 2;

    if (f.remediation) {
      const splitRem = doc.splitTextToSize(`Remediation: ${f.remediation}`, 180);
      doc.setFont("helvetica", "oblique");
      doc.setTextColor(80, 80, 80);
      doc.text(splitRem, 14, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(20, 20, 20);
      y += (splitRem.length * 4.5) + 2;
    }

    y += 4; // spacing between findings
  });

  // Footer for each page
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, 196 - 15, 287, { align: "right" });
    doc.text("CONFIDENTIAL - BREACH SECURITY REPORT", 14, 287);
  }

  // Download PDF
  doc.save(`Breach-Report-${e.name.replace(/[^a-z0-9]/gi, "_")}.pdf`);
}

function EngagementDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [findingsFilter, setFindingsFilter] = useState<"all" | "selected">("all");

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

  const filteredFindings = findings.filter((f) => {
    if (findingsFilter === "selected" && selectedRun) {
      return f.agent_run_id === selectedRun.id;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-foreground relative">
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

          {/* Right panel - Real-time Network Inspector */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">LIVE AGENT HTTP TRAFFIC MONITOR</h2>
            <AgentConsole run={selectedRun} />
          </div>
        </div>

        <section className="mt-12">
          {/* Filter Bar and Report download */}
          <div className="flex items-center justify-between border-b border-black/5 pb-3">
            <div className="flex items-baseline gap-4">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">FINDINGS</h2>
              <div className="text-[13px] text-muted-foreground">{filteredFindings.length} shown</div>
            </div>
            
            <button
              onClick={() => downloadPdfReport(e, agent_runs, findings)}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-black/[.03]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              Download PDF Report
            </button>
          </div>

          <div className="mt-4 flex gap-2 text-xs">
            <button
              onClick={() => setFindingsFilter("all")}
              className={`rounded-full px-3.5 py-1.5 transition-colors ${
                findingsFilter === "all" ? "bg-foreground text-background font-medium" : "text-muted-foreground hover:text-foreground hover:bg-black/5"
              }`}
            >
              All Findings ({findings.length})
            </button>
            {selectedRun && (
              <button
                onClick={() => setFindingsFilter("selected")}
                className={`rounded-full px-3.5 py-1.5 transition-colors ${
                  findingsFilter === "selected" ? "bg-foreground text-background font-medium" : "text-muted-foreground hover:text-foreground hover:bg-black/5"
                }`}
              >
                {formatKind(selectedRun.kind)} Agent ({findings.filter(f => f.agent_run_id === selectedRun.id).length})
              </button>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {filteredFindings.length === 0 && e.status === "complete" && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-[14px] text-emerald-800">
                Clean run. No exploitable issues found in this scope.
              </div>
            )}
            {filteredFindings.length === 0 && e.status !== "complete" && (
              <div className="rounded-xl border border-dashed border-black/15 p-6 text-center text-[13px] text-muted-foreground">
                Agents are still working or no findings recorded for the current filter.
              </div>
            )}
            {filteredFindings.map((f) => {
              const matchedRun = agent_runs.find((r) => r.id === f.agent_run_id);
              return (
                <motion.details
                  key={f.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group rounded-xl border border-black/10 open:border-foreground/40"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <SeverityDot s={f.severity} />
                      <div className="text-[14px] font-medium tracking-tight">
                        {f.title}
                        {matchedRun && (
                          <span className="ml-2.5 inline-flex items-center rounded bg-black/[.04] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {formatKind(matchedRun.kind)}
                          </span>
                        )}
                      </div>
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
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function AgentConsole({ run }: { run: any }) {
  if (!run) return null;
  const transcript = (run.transcript || []) as LogEntry[];
  const [selectedReqIdx, setSelectedReqIdx] = useState<number | null>(null);

  // Auto-select the first network request when transcript loads
  useEffect(() => {
    const firstNetIdx = transcript.findIndex((l) => l.network_request);
    if (firstNetIdx !== -1 && selectedReqIdx === null) {
      setSelectedReqIdx(firstNetIdx);
    }
  }, [transcript, selectedReqIdx]);

  const selectedLog = selectedReqIdx !== null ? transcript[selectedReqIdx] : null;

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm flex flex-col h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/5 bg-black/[.02] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 items-center justify-center">
            <span className={`h-2 w-2 rounded-full ${
              run.status === "running" ? "bg-blue-600 animate-pulse" :
              run.status === "complete" ? "bg-emerald-600" :
              run.status === "failed" ? "bg-rose-600" : "bg-zinc-400"
            }`} />
          </span>
          <span className="font-mono text-xs font-semibold text-foreground/80">
            {run.kind.toUpperCase()}_AGENT_TRAFFIC_MONITOR
          </span>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground uppercase">
          {run.status}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Real-time Trace Log */}
        <div className="w-1/2 border-r border-black/5 overflow-y-auto p-2 font-mono text-[11px] space-y-1 bg-black/[0.005]">
          {transcript.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground text-center p-4">
              <p>Initializing agent runner...</p>
              <p className="mt-1 text-[10px]">Real-time traffic audit logs will appear here once the agent executes probes.</p>
            </div>
          ) : (
            transcript.map((log, idx) => {
              const date = new Date(log.timestamp);
              const timeStr = date.toLocaleTimeString([], { hour12: false });
              
              if (log.network_request) {
                const req = log.network_request;
                const isErr = req.status >= 400 || req.status === 0;
                const isSuccess = req.status >= 200 && req.status < 300;
                
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedReqIdx(idx)}
                    className={`cursor-pointer p-2 rounded-lg border transition-all text-left ${
                      selectedReqIdx === idx
                        ? "bg-foreground text-background border-foreground font-medium"
                        : "bg-white border-black/5 hover:border-black/15 text-foreground/90"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className={selectedReqIdx === idx ? "text-background/80" : "text-muted-foreground"}>{timeStr}</span>
                      <span className={`px-1 rounded font-bold text-[9px] ${
                        isSuccess ? "bg-emerald-500/10 text-emerald-600" :
                        isErr ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"
                      }`}>
                        {req.status === 0 ? "ERR" : req.status}
                      </span>
                    </div>
                    <div className="mt-1 font-mono break-all line-clamp-1">
                      {req.method} {req.url.replace(/^https?:\/\/[^\/]+/, "")}
                    </div>
                  </div>
                );
              }

              // Normal log entry
              const colors = {
                info: "text-muted-foreground",
                success: "text-emerald-600 font-medium",
                warning: "text-amber-600 font-semibold",
                error: "text-rose-600 font-bold",
                request: "text-blue-600",
              };
              return (
                <div key={idx} className="p-1.5 text-[10px] text-muted-foreground text-left border-b border-black/[0.02]">
                  <span className="opacity-65 mr-1.5">{timeStr}</span>
                  <span className={colors[log.type] || "text-foreground"}>
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Network Inspector Panel */}
        <div className="w-1/2 flex flex-col overflow-hidden bg-white">
          {selectedLog && selectedLog.network_request ? (
            <div className="flex-1 flex flex-col overflow-hidden p-3.5 text-left">
              <div className="flex items-baseline justify-between border-b border-black/5 pb-2">
                <span className="font-mono text-[12px] font-bold text-foreground">HTTP INSPECTOR</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {selectedLog.network_request.duration_ms}ms
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 font-mono text-[10px] mt-3">
                {/* General Info */}
                <div>
                  <div className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Request URL</div>
                  <div className="mt-0.5 break-all select-all p-1.5 bg-black/[0.02] rounded border border-black/5 text-[10px]">
                    {selectedLog.network_request.url}
                  </div>
                </div>

                {/* Headers */}
                <div>
                  <div className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Request Headers</div>
                  <pre className="mt-1 p-2 bg-black/[0.02] border border-black/5 rounded text-[9.5px] max-h-[100px] overflow-y-auto leading-relaxed">
                    {JSON.stringify(selectedLog.network_request.request_headers, null, 2)}
                  </pre>
                </div>

                {selectedLog.network_request.request_body && (
                  <div>
                    <div className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Request Body</div>
                    <pre className="mt-1 p-2 bg-black/[0.02] border border-black/5 rounded text-[9.5px] max-h-[100px] overflow-y-auto leading-relaxed">
                      {selectedLog.network_request.request_body}
                    </pre>
                  </div>
                )}

                <div>
                  <div className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Response Headers</div>
                  <pre className="mt-1 p-2 bg-black/[0.02] border border-black/5 rounded text-[9.5px] max-h-[100px] overflow-y-auto leading-relaxed text-left">
                    {JSON.stringify(selectedLog.network_request.response_headers, null, 2)}
                  </pre>
                </div>

                <div>
                  <div className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Response Body</div>
                  <pre className="mt-1 p-2 bg-black/[0.02] border border-black/5 rounded text-[9.5px] max-h-[150px] overflow-y-auto leading-relaxed break-all select-all text-left">
                    {selectedLog.network_request.response_body}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-center p-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-network text-muted-foreground/45 mb-2">
                <rect x="16" y="16" width="6" height="6" rx="1" />
                <rect x="2" y="16" width="6" height="6" rx="1" />
                <rect x="9" y="2" width="6" height="6" rx="1" />
                <path d="M12 8v8M12 8h8M12 8H4" />
              </svg>
              <p className="text-[11px]">Select a network request from the trace list to inspect headers and response.</p>
            </div>
          )}
        </div>
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
